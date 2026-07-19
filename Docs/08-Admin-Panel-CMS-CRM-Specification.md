# 08 — Admin Panel (Integrated CMS + CRM) — Functional & Technical Specification

**Owner:** Chaitanya (UI/UX + screens), Shubham (APIs, roles, security)
**Governs:** SOW 14–15
**Depends on:** Documents 03, 04, 05, 06, 07 (this document consolidates the admin surface across all three phases into one coherent information architecture)

---

## 1. Concept

One authenticated web application (`admin/`), one navigation shell, **two functional halves that share the same shell** — this is the literal engineering answer to Meeting 2's clarifying exchange: *"CRM and admin panel... we were planning to do both things in one dashboard only... all the CRM management done with the help of admin panel."*

```
Admin Panel
├── CMS half   → controls what visitors SEE (content)
└── CRM half   → controls what the business KNOWS and DOES (customers, leads, bookings, orders, registries)
```

Per Meeting 1's explicit UI/UX budget guidance, the Admin Panel prioritizes **operational clarity and speed of every control** over bespoke visual design — but "less bespoke" does not mean "unpolished." It means: build one excellent data-table + form-drawer pattern, and reuse it everywhere, rather than hand-crafting a unique layout per module. This document specifies that pattern once so it can be stamped out consistently by Chaitanya across ~20 modules.

---

## 2. Roles & Permissions (Simple, Fixed — Not a General RBAC Builder, per SOW 40)

| Role | Access |
|---|---|
| `SUPER_ADMIN` | Everything, including Settings, Admin User management, Audit Log, financial exports |
| `OPERATIONS` | CRM half in full (customers, leads, consultations, bookings, calendar, invoices, orders, registries) — **no** access to Settings or Admin User management |
| `CONTENT_EDITOR` | CMS half in full (themes, packages, gallery, testimonials, FAQs, events, popups, legal pages, blog, metadata, media library) — **no** access to CRM data or Settings |

This 3-role fixed set (Document 03 3.1 `AdminRole` enum) deliberately avoids building a configurable permission-matrix engine, which SOW 40 explicitly excludes ("Advanced configurable RBAC system"). If the client later needs a 4th role, it is a backend enum addition + a route-guard update — quick, but still a scoped dev task, not a self-serve admin feature.

---

## 3. Global Shell

- **Sidebar navigation**, grouped exactly as the two halves above, collapsible, with role-based item visibility (a `CONTENT_EDITOR` simply never sees CRM items rendered in the sidebar, not just blocked at the route).
- **Topbar:** search (global quick-jump to a customer/booking/order by code — nice productivity win, low cost to build since it's just a few indexed lookups), current admin's name/role, logout.
- **Dashboard (landing page after login):** at-a-glance cards — Today's Bookings, Pending Consultations, New Leads (7 days), Revenue (month-to-date), Low-Stock Products (Phase 2+), Registries Expiring This Week (Phase 3+). Built from existing queries, no separate analytics infrastructure required (Document 02 11).
- **Notifications bell (optional, low-cost nice-to-have):** surfaces payment webhook failures, WhatsApp send failures, stale-inventory flags — pulls from `AuditLog`/job failure records rather than a new notification system.

---

## 4. Shared UI Pattern: Data Table + Drawer Form

Every CMS/CRM list screen uses:
1. A **filter bar** (search + relevant dropdown filters + date range where applicable).
2. A **data table** (sortable columns, pagination, row-level status badges using the shared Badge component from the Phase 1 design system).
3. A **drawer or modal form** for create/edit (not a full page navigation) — keeps the admin fast for high-frequency tasks like editing a package price or updating a booking status.
4. A **confirm-dialog** for destructive actions, always soft-delete under the hood (never a "permanent delete" button anywhere in the UI, per SOW 16 — if the client explicitly needs a true hard-delete for a compliance/data-subject request, that is a `SUPER_ADMIN`-only, explicitly-labeled "Permanently Erase" action in Settings, separate from the everyday delete button).

This single pattern, componentized once (`<AdminDataTable />`, `<AdminDrawerForm />`, `<AdminConfirmDialog />`), is what lets a 20-module admin panel be built by one developer within the Phase 1–3 timeline without each module becoming a bespoke design exercise.

---

## 5. CMS Half — Module Specifications

### 5.1 Themes
- List: title, slug, active toggle, display order, package count, last updated.
- Edit drawer/page (large enough to warrant a full page, not a drawer): title, slug (auto-generated, editable), short description, story description (rich text), audience note, hero image (Media Library picker), SEO title/description/OG image.
- Sub-sections within the Theme edit page: **Gallery** (attach existing GalleryImages or upload new, tagged to this theme automatically), **Sample Assets** (Digital Invite/Video/Parent Brief/Countdown Card/Activity Kit — upload + type + title + description + display order), **Linked Packages** (toggle which packages are offered under this theme, optional price override).
- Reorder control (drag handles or numeric input — numeric is faster to implement reliably and is acceptable given the "operational clarity over bespoke polish" mandate).

### 5.2 Packages (Highest-Priority CMS Screen)
- List: title, tier rank, price, recommended badge indicator, active toggle.
- Edit page: title, slug, price, tier rank, "Mark as Recommended/Most Popular" toggle, description.
- **Features/Deliverables sub-table:** label, quantity, unit, optional link to a `SampleAssetType` (so the frontend's "View Sample" button on a theme page knows which asset to show for this specific feature row).
- **Add-On Services sub-table:** pick from global `AddOnService` list (managed in a small separate "Add-On Services" module), toggle default-included.
- **Customization Options ("Extra Column") sub-table — the single most business-critical control in the entire Admin Panel:** label, extra price, min/max quantity, active toggle, and (from Phase 2 onward) an optional "Link to Shop Product" picker. Chaitanya should give this sub-table the most UX attention of any CMS screen — clear inline editing, obvious price formatting (₹, not raw paise), and a live preview of "what the customer will see" if time allows.
- **Gift Registry Eligibility toggle** (Phase 3 addition, 5 of Document 07).

### 5.3 Gallery
- Grid view (not a table — images benefit from visual browsing), filter by tag/theme.
- Upload flow: drag-drop or file picker → mandatory alt text field (soft-required — a warning if empty, not a hard block, balancing SEO best-practice against not blocking a rushed content update) → tag multi-select → optional theme link → CTA type + target.

### 5.4 Testimonials, FAQs
- Simple list + drawer form, as described in Document 05 6.

### 5.5 Events
- Full editor: banner, description (rich text), structured activities list (repeatable title+description+icon rows), age group, venue, schedule start/end, registration toggle + fee, optional theme link, SEO fields.
- **Registrant list** as a sub-tab on the event detail page (not a separate top-level module) — export to CSV for the client's own outreach.

### 5.6 Popups
- List + form: title, body, image, CTA label/url, placement multi-select, trigger-delay seconds, optional linked event, schedule start/end, active toggle.

### 5.7 Legal Pages
- Fixed list of exactly 4 entries (Refund Policy, ToS, Privacy Policy, Cancellation Policy) — not a general "pages" builder, since SOW scope is specifically these 4 documents. Rich text editor, publish timestamp shown.

### 5.8 Blog
- List: title, status (Draft/Published/Unpublished), categories, published date.
- Editor: title, slug, featured image, rich text content, excerpt, author, categories/tags (multi-select, create-inline), SEO title/description, status control.
- Uses the platform's single standard blog template on the frontend — the CMS does not offer per-post layout customization (SOW 14.1 explicit boundary).

### 5.9 Site Metadata / SEO
- A dedicated screen listing every templated page type (Home, Themes index, Packages index, Gallery, Contact, and dynamic entries per Theme/Package/Blog/Event slug) with meta title/description/OG image/canonical override fields, plus a read-only preview of the generated JSON-LD where applicable (Document 10).

### 5.10 Media Library
- Central grid, search/filter by type, usage indicator (nice-to-have: show which entities reference an asset before allowing delete, to prevent accidentally breaking a live page) — if full usage-tracking is too costly for MVP, at minimum warn "this action cannot be undone" and rely on soft-delete for recoverability.

---

## 6. CRM Half — Module Specifications

### 6.1 Customers
- List: name, email, phone, total bookings, total orders, last activity date.
- Detail page (the CRM's "360° view," directly satisfying SOW 14.2): tabs or stacked sections for Bookings, Orders (Phase 2+), Consultations, Invoices, Gift Registries (Phase 3+, summary only per Document 07 9's privacy stance), Internal Notes (add/view, timestamped, attributed to the admin who wrote it).

### 6.2 Leads
- List with source filter (Chatbot/Contact Form/Consultation/Event Registration/Newsletter/Other) and status pipeline filter.
- Status pipeline control: New → Contacted → Qualified → Converted → Closed-Lost, changeable inline from the list or detail view.
- Detail view shows the originating chatbot session path if `source = CHATBOT` (useful for the client to see exactly what the visitor selected).

### 6.3 Consultation Requests
- List with a visually distinct flag for `belowMinimumNotice = true` rows (client needs to see at a glance which requests need an urgent/managed-expectations response).
- Status pipeline: Pending → Reviewed → Scheduled → Completed/Declined.

### 6.4 Bookings
- List with filters: date range, theme, package, status, payment status.
- Detail view: full booking summary (theme, package, customization line items, pricing breakdown, guest contact, payment status, linked invoice, linked gift registry if any).
- Manual status transition control with mandatory reason/note on `Cancelled` (feeds `AuditLog` + `CustomerNote`).

### 6.5 Booking Calendar (SOW 15)
- Day/Week/Month toggle, color-coded by status (a small, fixed color legend: Scheduled=blue, Confirmed=green, In Progress=amber, Completed=gray, Cancelled=red — consistent with the shared design tokens).
- Click a day → shows that day's bookings list + remaining capacity (`X / maxBookingsPerDay booked`) inline, directly visualizing the overbooking-prevention rule from Document 04 4.1 so the client can see capacity health without reading raw settings.
- A "Manage Capacity" quick-link into Settings from the calendar view.

### 6.6 Invoices
- List with date-range filter, linked-type filter (Booking/Order/Event Registration), search by invoice number/customer.
- Bulk export button → triggers `/admin/invoices/export`, downloads CSV/ZIP (SOW 13's explicit GST-filing use case).
- Per-invoice actions: view PDF, resend email, resend WhatsApp (shows last-send status/timestamp, including WhatsApp failure reasons if the API isn't approved yet — transparent, not silently swallowed).

### 6.7 Products, Categories, Inventory (Phase 2)
- As specified in Document 06 2.0/2.3.

### 6.8 Orders (Phase 2)
- As specified in Document 06 2.5.

### 6.9 Gift Registry Oversight (Phase 3)
- As specified in Document 07 9.

---

## 7. Settings Module (`SUPER_ADMIN` only)

- **Operational Settings:** GST %, default booking capacity/day, minimum consultation advance-notice days, gift registry validity days, e-commerce max-quantity default, out-of-stock stale-flag days — each rendered with a clear label + current value + description of what it affects (mapped 1:1 to `OperationalSetting` rows, Document 03 3.9), so a non-technical `SUPER_ADMIN` can safely tune business rules without touching code.
- **Booking Capacity Rules:** global default + specific-date overrides + blocked-dates calendar picker.
- **Admin Users:** create/deactivate admin accounts, assign role (fixed 3-role set, 2 above), force-password-reset action.
- **Audit Log:** searchable/filterable history of every admin action (who/what/when/before-after where captured) — satisfies enterprise traceability expectations at effectively zero extra infrastructure cost since it's a straightforward table already defined in Document 03 3.1.
- **Integrations status panel:** at-a-glance health of Razorpay (live/test mode), WhatsApp (approved/pending/not configured), SMTP (working/failing), Cloudflare media (working) — pulls from lightweight backend health checks, saves the team from digging through logs to answer "is WhatsApp live yet?"

---

## 8. Admin Panel Security Posture (Summary — Full Detail in Document 09)

- Separate Vercel project, separate (ideally non-guessable) subdomain, `noindex,nofollow` on every route, never linked from the public site.
- JWT-based auth with short-lived access tokens + httpOnly rotating refresh cookie; no long-lived tokens stored in `localStorage`.
- Every admin API route re-validates role server-side (never trust a hidden sidebar item as the only access control — client-side hiding is UX, not security).
- Full audit logging on all mutating actions.
- Optional IP allowlist on the login route if the client's team works from static/known IPs (cost-free defense-in-depth, not a hard requirement).

---

## 9. Build Sequencing Across Phases (Cross-Reference)

| Admin Module | Built In |
|---|---|
| Auth, shell, dashboard | Phase 1 (1.0) |
| Themes, Packages (incl. customization engine), Gallery, Testimonials, FAQs, Events, Popups, Legal, Blog, Metadata, Media Library | Phase 1 (1.3) |
| Customers, Leads, Consultations, Bookings, Booking Calendar, Invoices, Settings (core), Audit Log | Phase 1 (1.4, 1.2, 1.7) |
| Products, Categories, Inventory, Orders | Phase 2 |
| Gift Registry Oversight, Package "Gift Registry Included" toggle | Phase 3 |

This table is the authoritative cross-reference between "what module" and "which phase document has the detailed task breakdown" — use Documents 05/06/07 for day-to-day sprint planning; use this document for the *shape* and *consistency* of every screen.
