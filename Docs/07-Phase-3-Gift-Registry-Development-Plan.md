# 07 — Phase 3: Gift Registry Module — Development Plan

**Team:** Shubham (Backend), Vishal (Frontend — guest/owner-facing pages), Chaitanya (Admin oversight)
**Governs:** SOW 25–33
**Depends on:** Documents 01–06 (reuses Guest Verification Service, Customer/Booking model, Product catalog from Phase 2 for internal gift links)
**Meeting source:** Meeting 2 is the primary logic source (the client walked through `gokiki.in` as a live reference and narrated the exact intended flow in detail).

---

## 1. Phase 3 Objective

Ship a **private, link-based Gift Registry** that an eligible customer ("registry owner") can create after booking, populate with curated gift links (external e-commerce links or internal Vaibhav Celebrations products), and share with guests — who can view the list, claim/reserve a gift, and mark it purchased, with duplicate-purchase risk minimized through a reservation/confirmation mechanism (not verified/guaranteed, per SOW 31).

## 1.1 Definition of Done for Phase 3
1. Eligible bookings (Premium/Luxe by default, per admin-configured `GiftRegistryEligibilityRule`) can generate a registry with one action.
2. Registry owner can access their registry via Order/Booking-ID + Email OTP (reusing Phase 1's Guest Verification Service) and fully configure it (child/person name, celebration details, photo, address, password).
3. Owner can add both external links (with best-effort metadata extraction + manual fallback) and internal Vaibhav Celebrations products.
4. Guests can open the registry via private URL + password, view the list, and confirm a gift as reserved/purchased.
5. Once confirmed, an item visibly changes state (grayed out / "Reserved" / "Purchased") for all subsequent guests viewing the same link.
6. Owner can reverse an incorrect confirmation.
7. Registries auto-expire at day 30 (configurable) and follow the client-approved retention action (archive/soft-delete).
8. Admin has an oversight view of all registries, including expiring-soon and expired ones.
9. No affiliate-link functionality is built (explicitly out of scope), but the data model does not preclude adding it later as a Change Request.
10. Zero regressions to Phase 1/2 functionality.

---

## 2. Business Logic Captured from Meeting 2 (Read Before Building)

1. **Trigger & eligibility:** Registry access is tied to package tier — *"if user purchases... standard package, then they will need to opt in for the gift registry... they will not allow [it]... I want the premium one... to be the most sellable package."* → `GiftRegistryEligibilityRule.isIncluded` defaults true for Premium/Luxe, false for Standard, with an optional `upgradeAddOnServiceId` path for a Standard customer to unlock it (Document 03 5).
2. **Link-based, not dashboard-based:** *"instead of putting... a dashboard... we will be putting a particular link... which will be private... user can set a password."* No general customer dashboard is built — access is purely `registryCode` + password (guest side) or `registryCode` + Order-ID/Email-OTP (owner side).
3. **Time-boxed:** *"minimum time... 30 days maximum... after that... it will automatically get removed... more space for other users"* → 30-day default validity (`OperationalSetting("GIFT_REGISTRY_VALIDITY_DAYS")`), auto-expiry job.
4. **Duplicate prevention is confirmation-based, not verified:** the client herself narrated the exact expected UX from `gokiki.in`: guest clicks a listed gift → redirected to the external site (e.g., Amazon) → completes purchase there → **returns to the registry** → confirms the gift as purchased → item becomes grayed out/unavailable to other guests. The client and Shubham explicitly agreed this cannot be technically *verified* (purchases happen off-platform) — it is a **social/UX mechanism**, and the SOW correctly frames it as such (31). Do not attempt to build real purchase verification against Amazon/Myntra/etc. — that would be a different, far larger, and explicitly out-of-scope project (33).
5. **Metadata extraction is best-effort:** *"I need to check if we can extract or pull the images from particular product links... but those links will be visible... try to extract the metadata if it's possible... showcase that in a chart format"* → implement Open Graph/meta-tag scraping with **graceful, visible fallback** to manual entry — never block the owner from adding a gift just because scraping failed.
6. **Editable/correctable:** *"if they wanted to have some issue... they put a tick on wrong product... it can be edited"* → owner can reverse a `GiftReservation` and edit item details after the fact.
7. **Internal product linking is explicitly supported and encouraged:** *"products available through the Vaibhav Celebrations e-commerce store may also be added to the Gift Registry"* — this is why Phase 3 depends on Phase 2's `Product` model rather than treating all registry items as opaque external links.
8. **Affiliate integration is explicitly deferred:** the client asked directly about Amazon Affiliate integration in Meeting 2 and was told plainly it is a different, brand-risk-bearing feature requiring separate research and scope; SOW 33 formalizes this as out of scope. **Do not build it.** The schema leaves room for a future `affiliateTag`/`affiliateUrl` field via a additive migration if a signed Change Request ever authorizes it — nothing in Phase 3's build should make that harder later, but nothing should be built now.
9. **Pre-filled details on registry creation:** *"details will be pre-filled automatically based on [the order]... birthday date and all"* — registry creation pulls `childOrEventDetails`/`eventDate` context from the linked `Booking` where available, reducing owner data entry.

---

## 3. Guest & Owner Access Model (Two Distinct Auth Contexts — Do Not Conflate)

This is the trickiest design point in Phase 3 and must be gotten right:

| Actor | How they access | What they can do |
|---|---|---|
| **Registry Owner** (the parent who booked) | Order/Booking-ID + Email OTP → scoped `guestAccessToken` (reuses Phase 1's Guest Verification Service, `referenceType = "REGISTRY"`) | Full CRUD on the registry: edit details, add/edit/remove gift items, set/reset password, reverse a reservation |
| **Invited Guest** (friends/family) | Private URL (`/registry/[registryCode]`) + **registry password** (a separate, lightweight, low-friction gate — not OTP, not email-based, since guests are not "customers" in the CRM sense) | Read-only list view + confirm-as-reserved/purchased action only |

**Do not let a guest's password-gate session ever be upgraded to owner-level access**, and do not let the owner's `guestAccessToken` be usable as the public password gate — these are two different trust levels sharing the same underlying `GiftRegistry` record but never the same token type. This separation is already reflected in Document 04 10's route table (`/registry/:registryCode/*` requires `guestAccessToken`; `/registry/public/:registryCode/*` requires only the registry password).

---

## 4. Sub-Phase Breakdown

```
3.0  Data Layer, Eligibility Rules, Registry Creation Flow      (Week 1)
3.1  Owner Dashboard: Configure Registry, Add/Edit Gift Items    (Weeks 1-2)
3.2  Metadata Extraction Job + Manual Fallback UX                (Week 2)
3.3  Guest-Facing Registry Page & Reservation Flow                (Week 2)
3.4  Expiry Job, Admin Oversight, Retention Handling               (Week 3)
3.5  QA, Regression, Go-Live                                        (Week 3)
```
Indicative total: **~3 working weeks**, the shortest phase, because it reuses Guest Verification (Phase 1), Product catalog (Phase 2), and the invoice/notification pipeline (Phase 1) almost entirely as-is.

---

## 5. Sub-Phase 3.0 — Data Layer, Eligibility, Registry Creation

### Backend (Shubham)
- Run Migration Batch 0009 (Document 03 5): `GiftRegistry`, `GiftRegistryItem`, `GiftReservation`, `GiftRegistryEligibilityRule`.
- Seed `GiftRegistryEligibilityRule` rows for existing packages (Premium/Luxe → included; Standard → not included, optionally linked to an `AddOnService` if the client wants a paid upgrade path — confirm at Phase 3 kickoff).
- `POST /registry/from-booking/:bookingCode` (Document 04 10): validates eligibility, generates `registryCode` (via `SequenceCounter` or a short random slug — a *short, shareable* code is preferable UX here, e.g. 8–10 characters, unlike the longer human-readable booking/order codes, since this one gets typed/shared casually), generates a random default password, hashes it, snapshots `childOrEventDetails`/`eventDate` from the linked `Booking` where available, sets `expiresAt = now() + GIFT_REGISTRY_VALIDITY_DAYS`.
- Registry creation is triggered automatically as part of the **post-payment confirmation flow** for an eligible booking (reuses the invoice-generation job's trigger point) so the registry link+password can be included in the same email/WhatsApp invoice message the client described in Meeting 2 (*"we will be sharing automatically [a] random password... with invoice"*) — **and** is exposed as an explicit "Create My Gift Registry" action from the owner's booking-lookup page for cases where the owner wants to opt in slightly later rather than instantly.

### Admin (Chaitanya)
- Small addition to the Package editor (built in Phase 1): a "Gift Registry Included" toggle + optional "Upgrade Add-On" picker, wired to `GiftRegistryEligibilityRule`.

---

## 6. Sub-Phase 3.1 — Owner Dashboard

### Frontend (Vishal)
- Owner-only registry configuration screen (behind `guestAccessToken`): child/person name, celebration details textarea, photo upload (reuses Phase 1 Media upload pattern, scoped to registry-owner permission), shipping/delivery address, password reset control.
- Gift item manager: "Add a Gift Link" (paste external URL → triggers metadata fetch, 3.2) and "Add from our Shop" (searchable picker over Phase 2's `Product` catalog — reuses the Product picker component built for Phase 2's Admin, adapted for owner-facing use with a simplified read-only search UI).
- Item list with edit/remove/reorder, and a clear "Reverse Reservation" action next to any item a guest has already marked reserved/purchased (SOW 29's "edit the section" requirement).
- Shareable link + password prominently displayed with a one-tap "Copy Link" and "Copy Password" action, plus a "Share via WhatsApp" quick action (pre-filled message with the link — reuses the click-to-chat pattern from Phase 1).

### Backend (Shubham)
- `PUT /registry/:registryCode`, `POST/PUT/DELETE /registry/:registryCode/items/:itemId`, `POST /registry/:registryCode/set-password` (Document 04 10).

---

## 7. Sub-Phase 3.2 — Metadata Extraction Job + Manual Fallback

### Backend (Shubham)
- On `POST /registry/:registryCode/items` with `sourceType = EXTERNAL_LINK`, enqueue an async fetch job:
  1. Fetch the URL server-side (never proxy this through the browser — avoids CORS issues and keeps the owner's IP/identity out of the request to the third-party site).
  2. Parse Open Graph tags (`og:title`, `og:image`, `og:description`) and fall back to `<title>`/basic `<meta name="description">` if OG tags are absent.
  3. Attempt a best-effort price extraction from common patterns (schema.org `Product`/`Offer` JSON-LD if present) — treat any extracted price as **display text only**, never as a value the platform's own pricing/GST engine touches (SOW correctly scopes this as informational, not transactional).
  4. Set `metadataFetchStatus` to `SUCCESS`, `PARTIAL` (got title/image but not price, or similar), or `FAILED`.
  5. Respect basic scraping etiquette: reasonable timeout (e.g., 5–8s), a descriptive `User-Agent`, and no retries-storm against a single domain — many retailers actively block scrapers, and the SOW explicitly disclaims guaranteed success (29).
- On `FAILED` (or `PARTIAL`), the owner UI (6 above) prompts for `manualTitle` + `manualImageMediaId` — this is a **primary supported path**, not a rare error state, since real-world blocking rates from major e-commerce sites are expected to be significant.

---

## 8. Sub-Phase 3.3 — Guest-Facing Registry Page & Reservation Flow

### Frontend (Vishal)
- Public registry page (`/registry/[registryCode]`): password gate (simple form, no OTP/email — lightweight by design), then a warm, on-brand presentation of the celebration (photo, child/person name, celebration details) followed by the gift grid.
- Each gift card: image (extracted or manual), title, price (if available, else "View on site"), a primary "View Item" link (opens the external URL in a new tab, or routes to the internal product page for internal links), and a secondary "Mark as Reserved/Purchased" action.
- Reservation confirmation UX: a lightweight modal ("Have you purchased this gift?") capturing an optional guest name (helps the owner know who to thank — Meeting 2 doesn't mandate this, but it's a natural, low-friction enterprise-grade touch that costs nothing extra to build since `GiftReservation.guestName` already exists in the schema) → writes the reservation, immediately updates the card to a grayed-out "Reserved by a guest" / "Purchased" state.
- Handle `REGISTRY_EXPIRED` (Document 04 13) with a clear, friendly message rather than a generic error page.

### Backend (Shubham)
- `GET /registry/public/:registryCode` (password-gated), `POST /registry/public/:registryCode/items/:itemId/confirm` (Document 04 10) — idempotent-safe (confirming an already-`RESERVED`/`PURCHASED` item should be a graceful no-op/clear message, not a crash, since two guests could plausibly tap "confirm" within seconds of each other; whichever request lands first wins, the second sees the updated state).

---

## 9. Sub-Phase 3.4 — Expiry Job, Admin Oversight, Retention

### Backend (Shubham)
- `jobs/registry-expiry-sweep` (daily): transitions `ACTIVE → EXPIRED` past `expiresAt`; applies the client-approved retention action (archive = keep `EXPIRED` + soft-delete later per a longer retention window; or immediate soft-delete) — **confirm the exact retention window/action with the client during Phase 3 kickoff** and record the decision in Document 11, since SOW 32 deliberately leaves the exact mechanic open ("The exact start and expiration logic will be finalized during Phase 3 implementation").
- `GET /admin/registries` (Document 04 10): list with status filter, "expiring within 7 days" quick filter (useful for the client's own customer-care follow-ups).

### Admin (Chaitanya)
- Registry oversight screen: read-only list (registry code, owner customer, linked booking, status, expiresAt, item count, reserved/purchased count) — admin does **not** get owner-level edit rights into a customer's registry content by default (respect the "private" framing of the feature), but can view high-level status for support purposes and can force-expire/archive if a customer requests deletion (supports DPDP-style data-subject requests).

---

## 10. Sub-Phase 3.5 — QA, Regression, Go-Live

- Full walk-through of the exact Meeting 2 narrated journey: book eligible package → receive registry link+password via invoice → owner configures registry → owner adds 2 external links + 1 internal product → owner shares link → a second browser/session (simulating a guest) opens the link, views items, confirms one → owner's view reflects the updated status → owner reverses it → status reverts.
- Expiry job tested against a manually backdated `expiresAt` in a staging registry.
- Regression pass on Phase 1 (Guest Verification Service reuse) and Phase 2 (internal product linking) — this phase is the highest-reuse phase, so regression risk is concentrated in shared services, not new code.
- Confirm zero affiliate-link UI/API surface exists anywhere in the shipped code (explicit negative test, given how directly this was discussed and declined with the client).

---

## 11. Developer Allocation Summary (Phase 3)

| Developer | Primary Focus |
|---|---|
| **Shubham** | Registry/item/reservation schema & APIs, metadata-scraping job, expiry job, eligibility-rule wiring, dual-auth-context enforcement (owner vs. guest) |
| **Vishal** | Owner configuration dashboard, guest-facing registry page, reservation UX, WhatsApp share action, expired-state handling |
| **Chaitanya** | Package "Gift Registry Included" toggle, Admin registry oversight screen |

---

## 12. Phase 3 Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Client requests real affiliate integration mid-phase (it was discussed enthusiastically in Meeting 2) | Scope/budget/brand-risk overrun | Document 01 14 + SOW 33 guardrail; log as Change Request, do not build |
| Metadata scraping blocked by major retailers (common, expected) | Owner experience feels "broken" if fallback isn't polished | Treat manual-entry fallback as first-class UX from day one (7), not an afterthought |
| Ambiguity in exact registry retention mechanic after expiry | Data-retention/compliance risk | Confirm explicit retention action with client at Phase 3 kickoff (9), document decision |
| Guest confirms wrong item / owner disputes | Guest-trust/support burden | "Reverse Reservation" owner control shipped from day one (6), not deferred |
| Confusion between owner auth and guest password-gate during implementation | Security bug (privilege confusion) | Explicit dual-context design documented here (3) and enforced via distinct middleware guards, code-reviewed specifically for this boundary |
