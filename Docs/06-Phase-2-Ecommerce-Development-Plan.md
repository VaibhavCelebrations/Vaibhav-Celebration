# 06 — Phase 2: Independent E-Commerce Module — Development Plan

**Team:** Shubham (Backend), Vishal (Frontend), Chaitanya (Admin)
**Governs:** SOW 19–24
**Depends on:** Documents 01–05 (Phase 1 foundation — auth, guest verification, media, invoicing, CMS patterns — is fully reused, not rebuilt)
**Meeting source:** Meeting 2 (Phase 2/3 Deep Dive) is the primary logic source for this document; SOW 19–24 is the binding scope boundary.

---

## 1. Phase 2 Objective

Ship a fully independent shopping experience — "Shop" or "Return Gifts" — that customers can use **without ever purchasing a celebration package**, while also allowing relevant products to be cross-linked into the package customization step for customers who *are* booking a celebration. This is explicitly a **separate commercial engine** from bookings, sharing only the Customer/Guest-verification/Invoice/Payment infrastructure built in Phase 1.

## 1.1 Definition of Done for Phase 2
1. `/shop` storefront live with category + theme filtering, search, and product detail pages.
2. Guest checkout (no account) fully functional with Razorpay payment, GST, and shipping address capture.
3. Inventory is authoritative and race-condition-safe: no two simultaneous checkouts can oversell the same unit.
4. Low-stock ("Only X left") and stale/out-of-stock auto-flagging are live and admin-visible.
5. Product personalization fields (e.g., child's name/age) work end-to-end from storefront → order → fulfillment view in Admin.
6. Minimum/maximum order quantity enforcement works per product and per the global default setting.
7. Cross-linking: at least one flow where a Package Customization option surfaces a linked e-commerce product is live (SOW 24).
8. Admin can fully manage the product catalog, categories, inventory, and view/manage orders without developer involvement.
9. Order lookup (Order-ID + Email-OTP) works identically to the Phase 1 booking-lookup pattern.
10. Phase 2 introduces **zero regressions** to Phase 1 booking/CMS functionality (regression pass required before sign-off).

---

## 2. Business Logic Captured from Meeting 2 (Read Before Building)

This section exists because Phase 2's *rules*, not just its screens, came almost entirely out of the client's own words in Meeting 2 — engineers must build to these rules exactly, not to a generic e-commerce assumption:

1. **Independence from packages:** *"user comes to a site... landing page... gallery... categorization based on tags... redirect user to a package or theme"* vs. a **separate** "return gift or something creative name" entry point in navigation that leads straight to a product-first journey. Two distinct entry points, one product catalog.
2. **Theme-based product browsing:** *"if he was dinosaur theme... list of products there which he can opt... choose"* — products carry a `theme` tag (not a hard FK requiring a product to belong to exactly one theme; a product can be tagged to multiple themes) in addition to a `category` tag (Return Gifts / Activity Kits / Personalized / Stationery).
3. **Quantity stepper UX, Amazon-style:** *"when in general we add something to our cart we have an option of plus one, plus two... we can also restrict it to like Amazon does... a customer cannot buy more than 10 [of one product]"* → per-product configurable `maxOrderQuantity`, defaulting to a global `OperationalSetting`.
4. **Inventory-driven cap, not just a static limit:** *"unless we do not have this in stock... if we have only 10 sippers at a time"* → the effective purchasable ceiling is `MIN(maxOrderQuantity, quantityAvailable)`, and the UI must show a clear pop-up/toast when the customer hits either wall — not just silently disable the button.
5. **"Only X left" messaging:** *"other websites... showing us... only seven items of this is left, and this is out of stock"* → `InventoryRecord.lowStockThreshold` drives a "Only {n} left!" badge; `quantityAvailable = 0` drives an "Out of Stock" state (product remains visible, add-to-cart disabled) rather than being hidden.
6. **Don't delete stale out-of-stock items, flag them:** *"do we keep it as out of stock or should we remove it?... it would be like [not look good to] remove entirely... there must be a timeline... beyond 40 or 50 days... it will have a tag there in red color"* → implemented exactly as `InventoryRecord.statusFlag = STALE_AUTO_FLAGGED` after `OperationalSetting("OUT_OF_STOCK_AUTO_FLAG_DAYS")` (default 45–50) days at zero stock, driven off `Product.addedToInventoryAt`, refreshed whenever inventory is restocked (Meeting 2: *"put the timestamp for when the particular product is added... if there is any update, it will update the timestamp"*).
7. **Package cross-linking increases scope — treat as its own scoped sub-feature, not "free":** the client and Shubham explicitly agreed in Meeting 2 that linking full e-commerce catalog browsing *into* the booking checkout ("if someone wants to have only the written gift part... they can choose here") is additional engineering (separate order-management logic, separate confirmation/notification wiring) — SOW 24 keeps this real but bounded: implement the **data-level link** (a `PackageCustomizationOption` can point at a `Product`) and a **simple surfaced recommendation/add-on UI** at customization time, without building a second, fully independent purchasing path bolted into the booking flow. If the client wants deeper integration later, log it as a Change Request per Document 01 14.
8. **Single-product-purchase-from-site-link as its own management surface:** Meeting 2 flags that even a simple "buy one return gift from our own site as a gift-registry gift" requires its own order/notification handling — this is naturally satisfied because Phase 2's `/shop/checkout` **is** that generalized single/multi-product purchase path; no separate module is required as long as Gift Registry (Phase 3) links back to real `Product` records via `internalProductId` (Document 03 5) rather than inventing a parallel purchase mechanism.

---

## 3. Sub-Phase Breakdown

```
2.0  Data Layer & Admin Catalog Foundations         (Week 1)
2.1  Storefront: Browse, Filter, Product Detail      (Weeks 1-2)
2.2  Cart, Personalization, Checkout, Payments        (Weeks 2-3)
2.3  Inventory Engine & Admin Inventory Console       (Weeks 2-3, parallel with 2.2)
2.4  Cross-Linking with Package Customization         (Week 3)
2.5  Order Management (Admin) & Notifications          (Week 3)
2.6  QA, Regression, SEO for Shop Pages, Go-Live        (Week 4)
```
Indicative total: **~4 working weeks**, assuming Phase 1's foundation (auth, media, invoicing, payments, guest-verification) is reused unchanged. This is meaningfully faster than Phase 1 specifically *because* the foundation is not rebuilt — a direct payoff of Document 02/03's "build once, extend additively" principle.

---

## 4. Sub-Phase 2.0 — Data Layer & Admin Catalog Foundations

### Backend (Shubham)
- Run Migration Batches 0007–0008 (Document 03 4): `ProductCategory`, `Product`, `ProductImage`, `ProductCategoryTag`, `ProductThemeTag`, `ProductPersonalizationField`, `InventoryRecord`, `InventoryLedgerEntry`, `Order`, `OrderItem`; alter `PackageCustomizationOption` to add nullable `linkedProductId`.
- Seed default `OperationalSetting` rows: `ECOM_MAX_QTY_PER_PRODUCT` (e.g., 10), `OUT_OF_STOCK_AUTO_FLAG_DAYS` (e.g., 45).
- Extend `SequenceCounter` usage for `orderCode` (`VBC-OR-2026-######`).
- Implement `/admin/products`, `/admin/products/:id/images`, `/admin/products/:id/personalization-fields`, `/admin/categories` CRUD (Document 04 8).

### Admin (Chaitanya)
- **Product Catalog screen**: list with thumbnail/stock/status columns, filters (category, theme, active/inactive, stock status), create/edit form (title, slug, SKU, description, price, category multi-select, theme multi-select, image gallery via the shared Media Library component from Phase 1, personalization field builder — simple repeatable "field label + type" rows, min/max quantity).
- **Category management screen** (simple CRUD; small, low-risk module — good candidate to build first for early Chaitanya velocity on this phase).

---

## 5. Sub-Phase 2.1 — Storefront: Browse, Filter, Product Detail

### Frontend (Vishal)
- `/shop` landing: category tiles + theme tiles (dual taxonomy per Meeting 2 2 above), search bar, active filter chips.
- Product grid with live stock-status badges ("Only 7 left", "Out of Stock", subtle "Limited availability" for `STALE_AUTO_FLAGGED` items — still purchasable if somehow restocked, but visually deprioritized).
- Product detail page: images, description, price, personalization fields rendered dynamically from `ProductPersonalizationField[]` (text/number/shortText inputs, required-field validation client-side mirrored by server-side validation), quantity stepper bounded by `MIN(maxOrderQuantity, quantityAvailable)`.
- Breadcrumb + related-products (same theme or category) module — doubles as an SEO internal-linking win (Content & SEO Guide 20).
- SEO: Product schema (Document 10) on detail pages, category/theme pages included in sitemap.

### Backend (Shubham)
- `GET /shop/products` (filterable, paginated, cached at CDN edge for anonymous browsing where safe — but never cache authoritative stock counts beyond a very short TTL, to avoid showing sellable-looking stock that's actually gone).
- `GET /shop/products/:slug` (live stock status computed at request time, not from a stale cache).

---

## 6. Sub-Phase 2.2 — Cart, Personalization, Checkout, Payments

### Frontend (Vishal)
- Cart is **client-held** (local storage/session, no server cart table needed at this scale) but every price shown is periodically re-validated via `POST /cart/quote` so displayed totals never drift from server truth, especially right before checkout.
- Checkout form: shipping address (line1/line2/city/state/pincode), guest contact (name/email/phone), order summary (line items, personalization values shown per item, GST, total), Razorpay Checkout handoff, confirmation page with Order ID.
- Order lookup page reuses the Phase 1 Order-ID/Email-OTP pattern (`/order/lookup`), extended to `referenceType = "ORDER"`.

### Backend (Shubham)
- `POST /cart/quote`: revalidates each line's current price + stock availability, returns authoritative subtotal/GST/total — this is the *only* place cart math is trusted.
- `POST /shop/checkout` (Document 04 8): wraps order creation + inventory decrement in a single DB transaction (8.1 below), creates Razorpay order, returns for payment handoff.
- Reuse Phase 1's payment webhook handler, extended to branch on `linkedType` (`BOOKING` vs `ORDER`) — one webhook handler, not a duplicated one, to avoid drift in payment-security logic.
- Reuse Phase 1's invoice generation pipeline (`InvoiceLinkedType.ORDER`) — no new invoicing code required.

### 6.1 Inventory-Safe Checkout Transaction (critical correctness section)
```
BEGIN TRANSACTION
  FOR EACH item IN cart:
    SELECT quantityAvailable FROM InventoryRecord WHERE productId = item.productId FOR UPDATE
    IF item.quantity > quantityAvailable → ROLLBACK, return 409 INSUFFICIENT_STOCK (include which item)
  CREATE Order (status = PENDING_PAYMENT)
  FOR EACH item:
    CREATE OrderItem (price snapshot, personalization values)
    UPDATE InventoryRecord SET quantityAvailable -= item.quantity
    CREATE InventoryLedgerEntry (reason = SALE)
    IF quantityAvailable now <= lowStockThreshold → statusFlag = LOW_STOCK
    IF quantityAvailable = 0 → statusFlag = OUT_OF_STOCK
COMMIT
-- If Razorpay order creation fails after commit, mark Order back to CANCELLED and reverse inventory
-- (compensating transaction), rather than leaving stock silently decremented for a payment that never happened.
```
`SELECT ... FOR UPDATE` row-level locks are used (rather than a single global advisory lock as in booking capacity) because e-commerce checkout naturally locks at the per-product row level, which scales far better under concurrent multi-product carts than a single global lock would.

---

## 7. Sub-Phase 2.3 — Inventory Engine & Admin Inventory Console

### Backend (Shubham)
- `GET /admin/inventory` (Document 04 8): views for In Stock / Low Stock / Out of Stock / Stale-Flagged.
- `PUT /admin/inventory/:productId`: manual restock/adjustment, always writing an `InventoryLedgerEntry` (audit trail — never a silent quantity overwrite).
- Restocking a product resets `addedToInventoryAt`? **No** — per Meeting 2's own clarification, the timestamp tracked for staleness is about *how long a product has sat at zero stock*, so the correct implementation is: track `lastRestockedAt` separately, and the staleness sweep job (Document 04 8.1) should key off "days since `quantityAvailable` last became 0" rather than the original listing date, if the client's intent (re-confirm in Phase 2 kickoff) is "flag things that have been *unavailable* for 45+ days," not "flag things merely *listed* for 45+ days." **Action item:** confirm this exact interpretation with the client at the start of Phase 2 (tracked in Document 11) — the schema in Document 03 supports either interpretation with a one-field adjustment, so do not guess silently.
- Scheduled job: `jobs/stale-inventory-sweep` (daily cron).

### Admin (Chaitanya)
- **Inventory dashboard**: sortable/filterable table (product, current stock, low-stock threshold, status flag, last restocked), inline "quick adjust" quantity control, ledger history drawer per product (full audit trail visible to admin, satisfying enterprise traceability expectations).
- Visual red "long out of stock" tag exactly as described in Meeting 2.

---

## 8. Sub-Phase 2.4 — Cross-Linking with Package Customization

### Backend (Shubham)
- Extend `PackageCustomizationOption` reads (Document 04 3.2) to optionally include a joined `linkedProduct` summary (title, image, price, stock status) when present.
- `POST /pricing/quote` unaffected in its math (a linked customization option is still just an option with a price), but the **response payload** is enriched with product context so the frontend can render it as a recognizable "shop item" rather than a plain line item.

### Frontend (Vishal)
- On the booking customization step (built in Phase 1, 5.2 of Document 05), render any customization option that carries a `linkedProduct` with a small product card (image + name + "from our shop" badge) instead of a plain checkbox/stepper row — reinforces cross-sell without duplicating a second catalog UI.

### Admin (Chaitanya)
- On the Package Customization Option editor (built in Phase 1, 6 of Document 05), add an optional "Link to Shop Product" picker (reuses the Product picker component built in 2.0).

---

## 9. Sub-Phase 2.5 — Order Management (Admin) & Notifications

### Admin (Chaitanya)
- **Orders list/detail**: status pipeline (Pending Payment → Paid → Processing → Shipped → Delivered / Cancelled / Refunded), shipping address display, personalization values per line item clearly surfaced (fulfillment staff need to see "Child's Name: Aarav" without digging), invoice link/resend.

### Backend (Shubham)
- `PUT /admin/orders/:id/status` with audit logging.
- Notification hooks: order-confirmed email (reuses Phase 1 template engine with an Order-specific template), optional "Shipped" status-change email (nice-to-have, confirm with client whether it's in scope for Phase 2 MVP or deferred — logistics/shipping is not explicitly detailed in the SOW, so keep this simple/manual-trigger rather than building full carrier-tracking integration, which is out of scope).

---

## 10. Sub-Phase 2.6 — QA, Regression, SEO, Go-Live

- Concurrency test: simulate two simultaneous checkouts for a product with `quantityAvailable = 1`; exactly one must succeed.
- Regression pass on Phase 1 booking flow (shared payment webhook, shared invoicing) — a bug here would silently break bookings, not just e-commerce, so this regression pass is mandatory, not optional.
- SEO: category/theme shop pages added to sitemap, Product JSON-LD schema validated via Google's Rich Results Test.
- Performance check on the product grid (image-heavy page) against the Document 09 performance budget.
- Client UAT on the shop journey end to end, tracked against the two-revision policy.

---

## 11. Developer Allocation Summary (Phase 2)

| Developer | Primary Focus |
|---|---|
| **Shubham** | Product/inventory/order schema & APIs, inventory-safe checkout transaction, payment/invoice reuse, stale-stock job, cross-linking data model |
| **Vishal** | Storefront browse/filter/detail, cart & checkout UI, personalization UX, cross-linked product cards inside booking flow, shop-page SEO |
| **Chaitanya** | Product/category admin screens, inventory console, order management screens, package-customization "link to product" picker |

---

## 12. Phase 2 Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Client product data/images/inventory counts arrive late | Blocks realistic catalog testing | Seed with placeholder SKUs early; swap via Admin the moment real data lands |
| Ambiguity in "45–50 day stale flag" trigger definition (listing date vs. zero-stock date) | Wrong products get flagged/hidden from staff attention | Confirm exact business rule with client at Phase 2 kickoff (see 7); schema supports both interpretations |
| Overselling under concurrent checkout | Financial/customer-trust damage | `SELECT ... FOR UPDATE` row locking + compensating transaction on payment-creation failure (6.1), explicitly load-tested |
| Scope creep toward "full cross-linked purchasing engine" (Meeting 2's deeper vision) | Budget/timeline overrun beyond Phase 2's agreed bound | Document 01 14 guardrail; SOW 24 explicitly leaves the "final cross-linking workflow" to be "determined during implementation" within the *existing* bound — deeper requests are a Change Request |
