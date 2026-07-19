# 04 — Backend API Specification

**Owner:** Shubham Deshmukh (Backend)
**Consumers:** Vishal (frontend integration), Chaitanya (admin integration)
**Base URL (prod):** `https://api.vaibhavcelebrations.in/api/v1`
**Depends on:** Document 03 (schema), Document 09 (security standards)

---

## 1. API-Wide Conventions

- **Versioning:** all routes prefixed `/api/v1`. Breaking changes get `/api/v2`, never an in-place breaking change.
- **Auth headers:**
  - Public routes: none required, but subject to rate limiting.
  - Admin routes: `Authorization: Bearer <adminAccessJwt>` (short-lived, ~15 min) + httpOnly refresh cookie for silent renewal.
  - Guest-verified routes: `Authorization: Bearer <guestAccessToken>` (short-lived, scoped to a single `referenceCode`, issued only after OTP success).
- **Response envelope:**
```json
{ "success": true, "data": { }, "meta": { } }
```
```json
{ "success": false, "error": { "code": "BOOKING_DATE_FULL", "message": "Selected date has reached maximum bookings." } }
```
- **Pagination:** `?page=1&pageSize=20`, response `meta.pagination = { page, pageSize, total, totalPages }`.
- **Validation:** every route validates `body`/`query`/`params` with a Zod schema before touching the DB; invalid input → `400` with field-level error map, never a raw 500.
- **Rate limiting (see Document 09 for exact thresholds):** applied per-IP and, where applicable, per-`referenceCode`, most aggressively on `/auth/*`, `/guest/*/otp`, `/bookings`, `/orders`, `/leads`, `/consultations`.
- **Idempotency:** all payment-adjacent POSTs (`/bookings`, `/orders`) accept an `Idempotency-Key` header to safely handle client retries on flaky mobile networks without double-booking/double-charging.

---

## 2. Auth & Guest Verification Module

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/admin/login` | none | Admin email+password login → access JWT + refresh cookie |
| POST | `/auth/admin/refresh` | refresh cookie | Rotate access JWT |
| POST | `/auth/admin/logout` | admin | Revoke refresh cookie |
| GET | `/auth/admin/me` | admin | Current admin profile + role |
| POST | `/guest/lookup/request-otp` | none (rate-limited) | Body: `{ referenceCode, referenceType, email }` → validates the code+email pair against Booking/Order/Registry, sends Email OTP, creates `GuestVerificationToken` |
| POST | `/guest/lookup/verify-otp` | none (rate-limited, attempt-capped) | Body: `{ referenceCode, otp }` → on success issues a scoped `guestAccessToken` |
| GET | `/guest/booking/:bookingCode` | guestAccessToken (scoped to that code) | Returns booking detail for guest self-service view |
| GET | `/guest/order/:orderCode` | guestAccessToken | Returns order detail (Phase 2) |
| GET | `/guest/registry/:registryCode` | guestAccessToken (owner-scope) | Returns owner-level registry detail (Phase 3) |

> This module is built **once** in Phase 1 (Document 05, "Foundation Services") and reused unmodified by Phase 2/3 by simply extending `referenceType`.

---

## 3. CMS Module (Admin-authored, publicly read)

### 3.1 Themes
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/themes` | none | List active themes, supports `?tag=`, `?search=` |
| GET | `/themes/:slug` | none | Theme detail incl. gallery, packages, sample assets, FAQs |
| POST | `/admin/themes` | admin (CONTENT_EDITOR+) | Create |
| PUT | `/admin/themes/:id` | admin | Update |
| DELETE | `/admin/themes/:id` | admin | Soft delete |
| POST | `/admin/themes/:id/sample-assets` | admin | Attach Digital Invite/Video/Brief/Countdown/Activity-Kit preview |
| PUT | `/admin/themes/reorder` | admin | Bulk `displayOrder` update |

### 3.2 Packages & Pricing Engine
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/packages` | none | All active packages, ordered by `tierRank` |
| GET | `/packages/:slug` | none | Package detail incl. features, add-ons, customization options |
| GET | `/packages/compare` | none | Comparison-table payload (`?ids=a,b,c`) |
| POST | `/admin/packages` | admin | Create |
| PUT | `/admin/packages/:id` | admin | Update incl. `isRecommended` toggle |
| POST | `/admin/packages/:id/features` | admin | Add/update deliverable line items + quantities |
| POST | `/admin/packages/:id/customization-options` | admin | Manage the "extra column" pricing rows |
| POST | `/pricing/quote` | none | **Core pricing engine endpoint.** Body: `{ packageId, themeId, selectedOptions: [{optionId, quantity}] }` → server computes `basePriceInPaise + Σ(option.extraPriceInPaise × qty)` + GST, returns an itemized quote used to render the checkout summary (SOW 12). This endpoint is the *only* place price math happens — frontend never computes totals locally beyond optimistic UI. |

### 3.3 Gallery
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/gallery` | none | `?tag=`, `?themeId=` filters |
| POST | `/admin/gallery` | admin | Upload + tag + CTA config |
| PUT | `/admin/gallery/:id` | admin | Update tags/CTA/theme link |
| DELETE | `/admin/gallery/:id` | admin | Soft delete |

### 3.4 Testimonials, FAQs, Popups, Legal, Metadata, Blog, Events
Each follows the identical REST shape: public `GET` (list/detail, active-only), admin `POST/PUT/DELETE` (CONTENT_EDITOR+). Representative paths:
```
GET  /testimonials?themeId=&packageId=
GET  /faqs?category=
GET  /popups/active?placement=HOMEPAGE
GET  /legal/:type                      // refund-policy | terms-of-service | privacy-policy | cancellation-policy
GET  /metadata/:pageKey
GET  /blog?category=&tag=&page=
GET  /blog/:slug
GET  /events?upcoming=true
GET  /events/:slug
POST /events/:slug/register             // public registration + optional payment
Admin equivalents under /admin/... with full CRUD + soft delete + reorder where applicable.
```

### 3.5 Media Upload
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/admin/media/upload` | admin | Multipart or signed-URL flow → uploads to Cloudflare, validates type/size, records `MediaAsset` |
| DELETE | `/admin/media/:id` | admin | Soft delete + Cloudflare object lifecycle flag |

---

## 4. Booking & Availability Module

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/availability?date=YYYY-MM-DD` | none | Returns `{ available: boolean, remainingSlots: number, isBlocked: boolean }` for a single date |
| GET | `/availability/range?from=&to=` | none | Calendar-view payload for the booking date picker |
| POST | `/bookings` | none (guest) | **Booking creation — see locking design below.** Body: `{ themeId, packageId, eventDate, selectedOptions[], guestName, guestEmail, guestPhone }` → creates `Booking` in `SCHEDULED`/`PENDING` payment state, creates a Razorpay order, returns `{ bookingCode, razorpayOrderId, amountInPaise }` |
| POST | `/bookings/:bookingCode/cancel` | guestAccessToken or admin | Soft-cancels; frees capacity slot |
| GET | `/admin/bookings` | admin | List/filter by status/date-range/theme/package |
| PUT | `/admin/bookings/:id/status` | admin | Manual status transition (Scheduled→Confirmed→In Progress→Completed / Cancelled) |
| GET | `/admin/bookings/calendar?view=day|week|month&date=` | admin | Calendar-view data (SOW 15) |
| GET | `/admin/capacity-rules` / `POST` / `PUT` | admin | Manage `BookingCapacityRule` (global default + specific-date overrides + blocked dates) |

### 4.1 Overbooking-Prevention Locking Design (Document 01 7, Document 03 3.8)
```
BEGIN (SERIALIZABLE or SELECT ... FOR UPDATE on a per-date advisory lock)
  1. Resolve effective capacity for eventDate (specific override > global default)
  2. COUNT active (non-cancelled, non-deleted) bookings for eventDate
  3. IF count >= capacity → ROLLBACK, return 409 BOOKING_DATE_FULL
  4. ELSE INSERT booking row, COMMIT
```
Implemented via Postgres advisory locks keyed on the date (`pg_advisory_xact_lock(hashtext(eventDate))`) to make two simultaneous checkout attempts for the last slot on a date safe without serializing the *entire* bookings table — this is the concrete, code-level answer to the client's Meeting 1 question about double-booking.

---

## 5. Consultation Module

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/consultations` | none | Body incl. `eventDate`; server computes `advanceNoticeDays` and flags `belowMinimumNotice` against `OperationalSetting("MIN_CONSULTATION_ADVANCE_DAYS")`. Response includes a `warning` field the frontend renders inline (SOW 9) |
| GET | `/admin/consultations` | admin | List/filter |
| PUT | `/admin/consultations/:id/status` | admin | Pending → Reviewed → Scheduled → Completed / Declined |

---

## 6. Checkout, Payments & Invoicing Module

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/checkout/booking/:bookingCode/summary` | none | Returns final order summary (theme, package, deliverables, add-ons, qty, GST, total) — SOW 12 |
| POST | `/payments/razorpay/order` | none | Creates Razorpay order for a pending Booking/Order (idempotent per `bookingCode`/`orderCode`) |
| POST | `/payments/webhook` | Razorpay signature | **Source of truth for payment confirmation.** Verifies `X-Razorpay-Signature`, transitions Booking/Order to `PAID`/`CONFIRMED`, enqueues invoice-generation job |
| GET | `/invoices/:invoiceNumber/download` | guestAccessToken or admin | Streams/redirects to stored PDF |
| GET | `/admin/invoices` | admin | List/filter by date range, customer |
| GET | `/admin/invoices/export?from=&to=&format=csv|zip` | admin | Bulk export (SOW 13) |
| POST | `/admin/invoices/:id/resend` | admin | Manually re-trigger email/WhatsApp delivery |

### 6.1 Payment/Booking State Machine
```
PENDING --(razorpay webhook: captured)--> PAID --(invoice job success)--> CONFIRMED
PENDING --(razorpay webhook: failed)-----> FAILED
PAID/CONFIRMED --(admin refund action + webhook)--> REFUNDED
```
The webhook handler is the **only** writer of `PAID`/`FAILED`; the client-side "payment success" redirect only triggers a **status poll**, never a direct status write — closing the classic "client claims success but webhook never arrived" security gap.

---

## 7. CRM Module

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/admin/customers` | admin | List/search by name/email/phone |
| GET | `/admin/customers/:id` | admin | 360° view: bookings, orders, consultations, invoices, notes, gift registries |
| POST | `/admin/customers/:id/notes` | admin | Add internal follow-up note |
| GET | `/admin/leads` | admin | Filter by status/source |
| PUT | `/admin/leads/:id/status` | admin | New → Contacted → Qualified → Converted/Closed-Lost |
| POST | `/leads/contact-form` | none | Public contact-page submission → creates Lead (source=CONTACT_FORM) |
| POST | `/chatbot/session` | none | Persists a completed static chatbot flow, optionally creates a Lead (source=CHATBOT) |
| GET | `/chatbot/flow` | none | Returns the admin-configured decision-tree JSON (see 9) |

---

## 8. Phase 2 — E-Commerce Module

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/shop/products` | none | Filters: `?category=`, `?theme=`, `?search=`, pagination |
| GET | `/shop/products/:slug` | none | Detail incl. images, personalization fields, live stock status |
| GET | `/shop/categories` | none | |
| POST | `/cart/quote` | none | Stateless cart pricing (client holds cart in local storage/session; server recomputes authoritative totals + validates stock on every quote and at checkout — never trust client-held prices) |
| POST | `/shop/checkout` | none (guest) | Body: items[], personalization, shipping address, guest contact → validates inventory (see 8.1), creates Order + Razorpay order |
| GET | `/admin/products` / `POST` / `PUT` / `DELETE` | admin | Full catalog CRUD, soft delete |
| GET | `/admin/inventory` | admin | Stock levels, low-stock/out-of-stock/stale-flag views |
| PUT | `/admin/inventory/:productId` | admin | Manual restock/adjustment (writes `InventoryLedgerEntry`) |
| GET | `/admin/orders` | admin | List/filter |
| PUT | `/admin/orders/:id/status` | admin | Processing → Shipped → Delivered / Cancelled / Refunded |

### 8.1 Inventory Enforcement (Document 06 detail)
- At `/shop/checkout`, backend re-reads `InventoryRecord.quantityAvailable` inside the same transaction that creates the `Order`/`OrderItem` rows, decrements it, and writes an `InventoryLedgerEntry(reason=SALE)` — all inside one DB transaction, rolled back entirely if any line item's requested quantity exceeds current availability (`409 INSUFFICIENT_STOCK`), so partial-order inventory corruption is impossible.
- Min/max order quantity per product enforced server-side, defaulting to `OperationalSetting("ECOM_MAX_QTY_PER_PRODUCT")` when `Product.maxOrderQuantity` is null (Meeting 2's "Amazon-style, max 10 per customer" pattern).
- A scheduled job (`jobs/stale-inventory-sweep`) runs daily: any `Product` with `addedToInventoryAt` older than `OperationalSetting("OUT_OF_STOCK_AUTO_FLAG_DAYS")` (default 45–50, per Meeting 2) **and** `quantityAvailable = 0` is flagged `STALE_AUTO_FLAGGED` (rendered as a red "long out of stock" tag in Admin, per Meeting 2) rather than being hard-removed — the client explicitly chose "flag, don't delete" in Meeting 2.

---

## 9. Static Chatbot Engine (Document 05 detail)

The chatbot is a **data-driven decision tree**, not hardcoded UI:
```json
{
  "start": "Q1",
  "nodes": {
    "Q1": { "question": "What are you looking for?", "options": [
      { "label": "Plan a Birthday Party", "next": "Q2_PARTY" },
      { "label": "Return Gifts / Products", "next": "Q2_SHOP" },
      { "label": "Just Browsing", "next": "END_BROWSE" }
    ]},
    "Q2_PARTY": { "question": "When is the celebration?", "collectField": "eventDate", "next": "COLLECT_CONTACT" },
    "COLLECT_CONTACT": { "collectFields": ["name", "phone", "email"], "next": "END_LEAD" }
  }
}
```
`GET /chatbot/flow` returns this JSON (admin-editable via `/admin/chatbot/flow` in a later Phase-1.x iteration if the client wants to edit questions without a dev — MVP ships with the flow as an admin-editable JSON document but does not require a fully visual tree-builder UI, matching SOW's explicit "static, predefined options" boundary).

---

## 10. Phase 3 — Gift Registry Module

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/registry/from-booking/:bookingCode` | guestAccessToken (booking owner) | Creates registry if package is eligible (SOW 26); returns `registryCode` + generated password (also emailed/WhatsApp'd with the invoice per Meeting 2) |
| POST | `/registry/:registryCode/set-password` | guestAccessToken (owner) | Owner resets the system-generated password |
| PUT | `/registry/:registryCode` | guestAccessToken (owner) | Update child name, celebration details, photo, address |
| POST | `/registry/:registryCode/items` | guestAccessToken (owner) | Add a gift link (external URL → triggers metadata-fetch job) or internal product reference |
| PUT | `/registry/:registryCode/items/:itemId` | guestAccessToken (owner) | Edit/correct a mis-ticked item (SOW 29 "edit the section") |
| DELETE | `/registry/:registryCode/items/:itemId` | guestAccessToken (owner) | Soft delete |
| GET | `/registry/public/:registryCode` | **registry password** (not the owner's guestAccessToken — a separate lightweight password-gate, see Document 07) | Guest (invited friend/family) view — read-only list of items with status |
| POST | `/registry/public/:registryCode/items/:itemId/confirm` | registry password | Guest marks a gift `RESERVED`/`PURCHASED` — writes `GiftReservation` |
| POST | `/registry/public/:registryCode/items/:itemId/reverse` | guestAccessToken (owner only) | Owner undoes an incorrect confirmation |
| GET | `/admin/registries` | admin | Oversight list, filter by status/expiring-soon |

### 10.1 Metadata Extraction Job
`POST /registry/.../items` with an `externalUrl` enqueues an async job that attempts Open Graph / `<title>` / `<meta>` scraping (best-effort, per SOW 29 — **no guarantee**, many e-commerce sites block scraping). On failure, `metadataFetchStatus = FAILED` and the frontend prompts the owner for manual title/image entry (`manualTitle`, `manualImageMediaId`) — this fallback path is a **required** UI state, not an edge case, because guaranteed extraction is explicitly out of scope.

### 10.2 Registry Expiry Job
Daily job: expire registries past `expiresAt` (30-day default via `OperationalSetting("GIFT_REGISTRY_VALIDITY_DAYS")`), transition `status = EXPIRED`, then apply the client's chosen retention action (archive/soft-delete) per SOW 32.

---

## 11. Rate Limiting Reference Table (see Document 09 for full policy)

| Route group | Limit (indicative) |
|---|---|
| `/auth/admin/login` | 5 requests / 15 min / IP |
| `/guest/lookup/request-otp`, `/verify-otp` | 5 requests / 15 min / IP + 5 / hour / referenceCode |
| `/bookings`, `/shop/checkout`, `/consultations`, `/leads/contact-form` | 10 requests / 10 min / IP |
| `/registry/public/*` | 30 requests / 10 min / IP (guests browsing a shared link) |
| All other public GETs | 100 requests / min / IP (generous, cache-assisted by Cloudflare) |

---

## 12. Webhooks Summary

| Incoming Webhook | From | Verified By | Effect |
|---|---|---|---|
| Payment captured/failed | Razorpay | HMAC signature (`X-Razorpay-Signature`) | Booking/Order status transition, invoice job trigger |
| Refund processed | Razorpay | HMAC signature | Booking/Order → REFUNDED, customer notified |
| Message delivery status (optional) | WhatsApp provider | Provider-specific signing secret | Updates `Invoice.whatsappSendStatus` for admin visibility |

| Outgoing Webhook | To | Purpose |
|---|---|---|
| Content publish/update | `frontend` `/api/revalidate` | Signed payload triggers ISR revalidation for the affected theme/package/blog/event page immediately after an Admin publish action |

---

## 13. Error Code Catalogue (representative, extend as needed)

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Zod schema failure, field-level detail included |
| `UNAUTHORIZED` | 401 | Missing/invalid/expired token |
| `FORBIDDEN` | 403 | Valid token, insufficient role/scope |
| `NOT_FOUND` | 404 | Entity missing or soft-deleted |
| `BOOKING_DATE_FULL` | 409 | Capacity exceeded for requested date |
| `BOOKING_DATE_BLOCKED` | 409 | Date explicitly blocked by admin |
| `INSUFFICIENT_STOCK` | 409 | Requested quantity exceeds available inventory |
| `OTP_INVALID_OR_EXPIRED` | 401 | Guest verification failure |
| `OTP_ATTEMPTS_EXCEEDED` | 429 | Too many failed OTP attempts, token invalidated |
| `PAYMENT_SIGNATURE_INVALID` | 400 | Webhook signature verification failed (logged + alerted, request rejected) |
| `REGISTRY_EXPIRED` | 410 | Access attempt on an expired Gift Registry |
| `RATE_LIMITED` | 429 | Standard rate-limit response |

---

## 14. Health & Ops

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | Liveness/readiness probe for uptime monitor + Render health checks |
| GET | `/admin/audit-log` | Admin action history, filterable |
| GET | `/admin/settings` / `PUT` | `OperationalSetting` CRUD (GST%, capacity default, registry validity days, stale-stock days, min-consultation-notice) |
