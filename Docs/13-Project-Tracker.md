# 13 — Centralized Project Tracker & Milestones

**Project:** Vaibhav Celebrations — Website Redevelopment, Booking Platform, E-Commerce & Gift Registry
**Delivery Partner:** Affor Technologies
**Client Representative:** Charu Saxena
**Last Updated:** 19 July 2026
**Owner:** Shubham Deshmukh (Project Lead)

**Sources synthesized into this tracker:**
- Minutes of Meeting, 19 July 2026 (Project Requirements, Development Roadmap & Technical Planning)
- SOW v1.1 (17 July 2026), as interpreted across Documents 00–12 of the `/Docs` suite
- Document 05 (Phase 1 Plan), Document 06 (Phase 2 Plan), Document 07 (Phase 3 Plan) — sub-phase/task breakdowns
- Document 11 (Team Workflow, Timeline, RACI & Governance) — RACI, commercial milestones, dependency tracker, change-request discipline
- Document 01 (Executive Summary & SOW Alignment) — budget, exclusions, client dependencies
- Document 09 (Security, Performance & Engineering Standards) — go-live gates
- Document 12 (Twilio WhatsApp Integration Guide) — WhatsApp setup dependency

> **Governance note (Document 00):** If anything in this tracker conflicts with the signed SOW v1.1, the **SOW governs** — raise it with the Project Lead before proceeding on that item. This is a **living document**, updated continuously as tasks move and client dependencies land — not a one-time snapshot.

---

## 1. Project Overview & Timeline

- **Phase 1 (MVP) Target Completion:** 15–17 August 2026 (driven by the **August Event Gate**)
- **Overall Project Target (as stated to client, MOM 3):** First week of September 2026
- **Workflow Sequence:** UI Design → Client Review & Approval → Frontend Development → Admin Panel Integration → Backend Development & Integration → Testing
- **Governing engineering documents:** Document 05 (Phase 1), Document 06 (Phase 2), Document 07 (Phase 3)

### ⚠️ Timeline Reconciliation Note (flag, not silently resolved)
The MOM's client-facing target has **all three phases** wrapped by the first week of September. The documentation suite's own indicative build estimates (Doc 05 2, Doc 06 3, Doc 07 4) total **~13 working weeks** across all three phases (Phase 1 ~6 wks, Phase 2 ~4 wks, Phase 3 ~3 wks) starting from Week 1 — which, from a 19–21 July kickoff, lands closer to **mid-October**, not early September. This is not a contradiction to silently paper over:
- The **Phase 1 / August Event Gate date is hard and protected** regardless of anything below (Doc 05 12 risk register).
- The **"first week of September" figure should be treated as an aspirational client-communicated target**, not yet reconciled against the phase-by-phase indicative plan.
- **Action:** Project Lead to explicitly confirm with the client whether "Overall Project Target Completion" in the MOM means (a) Phase 1 fully wrapped, or (b) all three phases live — and re-baseline the Master Timeline below accordingly at the first review session (22/23 July). Until then, both figures are carried here side-by-side.

### Master Timeline (Indicative, Document 11 5 — Adjust Live Against Actual Client Dependency Delivery)

```
Week 1        : Phase 1.0 Foundation + Phase 1.1 Go-Live Shell begins
Week 2        : Phase 1.1 completes (AUGUST EVENT GATE) | Phase 1.2/1.3 begin
Week 3        : Phase 1.2/1.3/1.4 in progress
Week 4        : Phase 1.4/1.5/1.6 in progress
Week 5        : Phase 1.6/1.7 — hardening, UAT
Week 6        : Phase 1 GO-LIVE  ── Phase 1 milestone invoice point ──
Week 7        : Phase 2.0/2.1 begin
Week 8        : Phase 2.1/2.2/2.3 in progress
Week 9        : Phase 2.4/2.5 in progress
Week 10       : Phase 2.6 — QA, GO-LIVE  ── Phase 2 milestone invoice point ──
Week 11       : Phase 3.0/3.1/3.2 begin
Week 12       : Phase 3.3/3.4 in progress
Week 13       : Phase 3.5 — QA, GO-LIVE, project handover  ── Phase 3 milestone invoice point / start of 2-month free support ──
```

---

## 2. Team & Roles

| Name | Role | Primary Focus |
|---|---|---|
| **Shubham Deshmukh** | Project Lead / Backend | Architecture, APIs, Payments, Integrations, Infrastructure, Security |
| **Vishal** | Frontend / UI-UX | Public Website, Booking Journey UI, SEO/Analytics Implementation |
| **Chaitanya** | Admin Panel / UI-UX | Admin CMS, Admin CRM, Booking Calendar UI, Settings |
| **Charu Saxena** | Client Rep | Approvals, Content Provision, Third-Party Registrations |

### RACI Matrix (Document 11 1)

| Deliverable Area | Shubham | Vishal | Chaitanya |
|---|---|---|---|
| Architecture & data model decisions | **A/R** | C | C |
| Backend APIs (all modules) | **A/R** | I | I |
| Public website (frontend) | C | **A/R** | I |
| Admin Panel (CMS + CRM) | C | I | **A/R** |
| Design system / shared UI tokens | C | **R** | C |
| Payments/webhooks integration | **A/R** | I | I |
| SEO/Analytics implementation | C | **A/R** | I |
| Security review & hardening | **A/R** | C | C |
| Infra/CI-CD/hosting | **A/R** | I | I |
| Client communication / scope decisions | **A/R** | I | I |
| QA sign-off per phase | **A** | R | R |

*(R = Responsible, A = Accountable, C = Consulted, I = Informed)*

---

## 3. Project Setup & Current Status (MOM 2, as of 19 July 2026)

| Item | Status |
|---|---|
| Previous website taken down | **Completed** |
| GitHub repository setup | **In Progress** |
| Domain & DNS infrastructure setup | **In Progress** |
| Cloudflare configuration (DNS + security/proxy layer) | **In Progress** |
| Basic project repo + local dev environment | **Completed** (Phase 1.0 foundation wired — Docker Postgres, backend API, frontend/admin shells, env files) |
| Actual development start | **In Progress** — Phase 1.0 complete; next is Sub-Phase 1.1 Go-Live Shell |

---

## 4. Review & Approval Milestones

| Milestone | Target Date | Status | Notes |
|---|---|---|---|
| **First UI/Design Review** | 22 or 23 July 2026 | **Pending** | Review initial landing & core page designs; next milestones/review date set here (MOM 12) |
| **August Event Gate (Sub-Phase 1.1)** | Early August 2026 | **Pending** | Go-Live Shell must be live for event registrations |
| **Phase 1 MVP Go-Live** | 15–17 August 2026 | **Pending** | Full public site, basic admin, booking engine |
| **Phase 2 E-Commerce Go-Live** | ~Week 10 (indicative) | **Not Yet Due** | Independent shop, inventory engine, cross-linking |
| **Phase 3 Gift Registry Go-Live** | ~Week 13 (indicative) | **Not Yet Due** | Private registries, guest reservation flow, handover |
| **Overall Project Target (client-communicated)** | 1st Week Sept 2026 | **Pending / To Reconcile** | See Timeline Reconciliation Note (1) |

Per SOW 42 (Document 11 9): up to **two revision cycles** per major UI deliverable (Homepage, Theme template, Package/Checkout flow, Admin CMS, Admin CRM, Shop, Gift Registry). Track revision-cycle usage per deliverable as reviews happen:

| Major Deliverable | Revision Cycles Used | Notes |
|---|---|---|
| Homepage | 0 / 2 | — |
| Theme Template | 0 / 2 | — |
| Package/Checkout Flow | 0 / 2 | — |
| Admin CMS | 0 / 2 | — |
| Admin CRM | 0 / 2 | — |
| Shop (Phase 2) | 0 / 2 | Not yet due |
| Gift Registry (Phase 3) | 0 / 2 | Not yet due |

---

## 5. Commercial Milestone Tracker (Informative — Document 11 8, Document 01 5 Governance Note)

| Milestone | Amount | Trigger | Status |
|---|---|---|---|
| Deposit | ₹15,000 | Contract signed / project kickoff | — |
| Phase 1 completion | ₹20,000 | Phase 1 go-live sign-off | — |
| Phase 2 completion | ₹7,500 | Phase 2 go-live sign-off | — |
| Phase 3 completion | ₹7,500 | Phase 3 go-live sign-off / start of free-maintenance window | — |
| **Total** | **₹50,000** | | |

> This split was discussed operationally (Meeting 2) but is **not restated verbatim in SOW v1.1** — Finance/PM should confirm the exact invoice schedule with the client in writing (Doc 01 5). Doesn't change engineering scope.

---

## 6. Phase 1 Development Tracker — MVP & Core Platform

**Governs:** SOW 5–18 · **Full detail:** Document 05 · **Hard deadline driver:** Client's early-August event

*Task Statuses: Pending → In Progress → Under Review/Blocked → Completed*

### 1.0 — Foundation, Environments, Migrations, Design System (Week 1)

| Task | Owner(s) | Status |
|---|---|---|
| Lock Prisma schema, Migration Batches 0001–0006 | Shubham | **Completed** (migration `20260719121227_phase1_foundation`) |
| Set up Postgres (dev + staging), run initial migrations, seed script | Shubham | **Completed** (Docker Compose on `:5433`, seed: SUPER_ADMIN + 3 themes + 3 packages) |
| Configure `helmet`, CORS allowlist, Zod validation, error handler, request logger | Shubham | **Completed** |
| Admin auth (JWT + refresh cookie), seed one `SUPER_ADMIN` | Shubham | **Completed** (login verified) |
| Shared design tokens (colors, type scale, spacing) in Tailwind config | Vishal (lead), Chaitanya (align) | **Completed** (frontend + admin brand tokens) |
| Component library skeleton (Button, Card, Badge, Modal, Tabs, Stepper, Toast) | Vishal | **Completed** (`frontend/src/components/ui`) |
| Admin layout skeleton: sidebar nav, topbar, auth-guarded routes | Chaitanya | **Completed** (`/login` + `/dashboard` shell) |
| CI/CD wiring: Vercel (frontend/admin) + Render (backend) | Shubham | **In Progress** (GitHub Actions CI added; Vercel/Render project connect pending) |
| Error tracking + uptime monitor (free tiers) | Shubham | **In Progress** (Sentry DSN env placeholder + `/health` for uptime monitors) |
| `.env.example` finalized for all 3 repos, secrets rotation policy documented | Shubham | **Completed** (see Doc 14) |
| GitHub repo, domain/DNS, Cloudflare configuration | Shubham | **In Progress** |

### 1.1 — Go-Live Shell (Weeks 1–2) ◄── AUGUST EVENT GATE

| Task | Owner(s) | Status |
|---|---|---|
| `Theme`, `Package`, `GalleryImage`, `Event`, `EventRegistration`, `LegalPage`, `SiteMetadata` read APIs | Shubham | Pending |
| `POST /events/:slug/register` (optional paid registration support) | Shubham | Pending |
| Homepage (Hero → Why Us → Featured Themes → Featured Packages → Upcoming Events → Testimonials → Instagram embed → CTA) | Vishal | **In Progress** |
| Theme listing + Theme detail page | Vishal | **In Progress** |
| Package listing + polished comparison table | Vishal | Pending |
| Gallery with tag filter chips + theme routing | Vishal | Pending |
| Event/Landing Page template (ad-destination page) | Vishal | Pending |
| Contact page + stub contact form (`/leads/contact-form`) | Vishal | Pending |
| Global header/nav, footer, legal page templates | Vishal | Pending |
| Mobile-first responsive pass | Vishal | Pending |
| Minimal Event CMS screen (create/edit, banner, schedule, registrants) | Chaitanya | Pending |
| Minimal Theme/Package "quick edit" screens | Chaitanya | Pending |

**Gate:** "Event-ready" = homepage + ≥1 live theme page + event landing page + event registration deployed, mobile-tested, GA4/Meta Pixel firing — independent of booking/payments/full-admin readiness.

### 1.2 — Booking Engine, Customization, Checkout, Payments, Invoicing (Weeks 2–4)

| Task | Owner(s) | Status |
|---|---|---|
| Migration Batches 0005–0006 (`Booking`, `BookingCustomization`, `BookingCapacityRule`, `Invoice`) | Shubham | Pending |
| `GET /availability`, `GET /availability/range`, `POST /bookings` (advisory-lock, overbooking prevention) | Shubham | Pending |
| Pricing engine `POST /pricing/quote` (unit-tested) | Shubham | Pending |
| Checkout summary + Razorpay order creation + webhook (signature-verified) | Shubham | Pending |
| Invoice generation job (PDF render, Cloudflare upload, email + WhatsApp trigger) | Shubham | Pending |
| Nodemailer integration (OTP, invoice, booking confirmation templates) | Shubham | Pending |
| WhatsApp adapter (feature-flagged, provider-agnostic interface) | Shubham | Pending |
| Guest Verification Service (Order-ID + Email-OTP, reused across all 3 phases) | Shubham | Pending |
| Booking journey UI: date picker → theme → package → customization → summary → contact → Razorpay → confirmation | Vishal | Pending |
| Consultation request form + minimum-notice warning banner | Vishal | Pending |
| Order/Booking lookup page (`/order/lookup`) | Vishal | Pending |
| Theme selector redesign (vertical/grid cards, per client feedback on legacy system) | Vishal | Pending |
| WhatsApp enquiry CTA (click-to-chat, pre-filled message) | Vishal | Pending |
| Booking capacity settings screen (global max/day, per-date overrides, blocked dates) | Chaitanya | Pending |
| GST % and `OperationalSetting` values exposed in Settings | Chaitanya | Pending |
| Invoice list view (filters, bulk export, manual resend) | Chaitanya | Pending |

### 1.3 — Admin Panel CMS Modules (Weeks 2–4)

| Task | Owner(s) | Status |
|---|---|---|
| Themes module (list, edit, gallery/sample-asset managers, package linking, reorder) | Chaitanya | Pending |
| Packages module (incl. business-critical customization-option "extra column" manager) | Chaitanya | Pending |
| Gallery module (upload, tag manager, theme-link, CTA selector) | Chaitanya | Pending |
| Testimonials module | Chaitanya | Pending |
| FAQs module | Chaitanya | Pending |
| Events module (full editor + registrant export) | Chaitanya | Pending |
| Popups module | Chaitanya | Pending |
| Legal Pages module (4 mandatory documents — go-live blocker pending client content) | Chaitanya | Pending |
| Blog module (full CRUD) | Chaitanya | Pending |
| Site Metadata / SEO module | Chaitanya | Pending |
| Media Library (central picker, reused across CMS) | Chaitanya | Pending |

### 1.4 — Admin CRM + Booking Calendar + Capacity Settings (Weeks 3–5)

| Task | Owner(s) | Status |
|---|---|---|
| Customers module (searchable list, 360° detail view, internal notes) | Chaitanya | Pending |
| Leads module (source/status filters, pipeline) | Chaitanya | Pending |
| Consultation Requests module (pipeline, minimum-notice flag) | Chaitanya | Pending |
| Bookings module (filters, manual status transitions, audit trail) | Chaitanya | Pending |
| **Booking Calendar** (Day/Week/Month, color-coded by status, capacity display) | Chaitanya | Pending |
| Corresponding backend CRM APIs | Shubham | Pending |

### 1.5 — Static Chatbot + Lead Capture (Week 4)

| Task | Owner(s) | Status |
|---|---|---|
| Floating chatbot widget (reusable, all public pages) | Vishal | Pending |
| Decision-tree flow engine + persistence (`GET /chatbot/flow`) | Shubham | Pending |
| Baseline flow: qualify intent → date/contact capture → Lead record | Vishal, Shubham | Pending |
| Explicitly confirm no AI/LLM wiring (Out-of-Scope guardrail check) | All | Pending |

### 1.6 — SEO Foundation, Analytics, Performance (Weeks 4–5)

**Full field mapping:** Document 10

| Task | Owner(s) | Status |
|---|---|---|
| Sitemap.xml, robots.txt (admin subdomain disallowed) | Vishal | Pending |
| Structured data (JSON-LD): Organization, LocalBusiness, WebSite, Article, FAQ, Breadcrumb, Event schema | Vishal | Pending |
| Open Graph + Twitter Card meta on all templated pages | Vishal | Pending |
| Image pipeline: WebP via Cloudflare, mandatory alt text | Vishal | Pending |
| Core Web Vitals pass (lazy-load, font-display swap, code-splitting) | Vishal | Pending |
| GA4, Google Search Console, Meta Pixel, GTM installation | Vishal | Pending |
| Conversion events (booking, consultation, lead, event registration) | Vishal, Shubham | Pending |

### 1.7 — QA, Security Hardening, UAT, Go-Live (Weeks 5–6)

| Task | Owner(s) | Status |
|---|---|---|
| Full regression pass vs. Definition of Done (Doc 05 1.1) | All | Pending |
| Security checklist execution (Doc 09 9 Pre-Go-Live Checklist) | Shubham | Pending |
| Load/traffic sanity check (~50 users/month scale) | Shubham | Pending |
| Backup + restore drill | Shubham | Pending |
| Client UAT session (tracked against 2-revision policy) | All | Pending |
| DNS cutover, Vercel/Render production promotion, Razorpay live-mode switch | Shubham | Pending |
| Client handover walkthrough + Admin User Guide | All | Pending |

### Phase 1 Definition of Done (Doc 05 1.1) — Exit Checklist
- [ ] All Doc 01 13 "Doc 05" checklist items live in production
- [ ] Legal pages published and linked from checkout
- [ ] Razorpay live mode, verified webhook, one real settled test transaction
- [ ] WhatsApp invoicing live or gracefully degraded to email-only
- [ ] Booking capacity, GST %, min. consultation notice configured with real business numbers
- [ ] Daily backups verified + one successful test restore
- [ ] Lighthouse: Performance ≥ 85, SEO/Accessibility ≥ 90 (homepage, theme, package pages)
- [ ] GA4, GSC, Meta Pixel, GTM verified firing on production domain
- [ ] Admin can independently manage Theme/Package/Gallery/Blog/FAQ/Testimonial/Event/Popup without developer involvement
- [ ] Document 09 Pre-Go-Live security checklist signed off

### Phase 1 Risk Register (Document 05 12)

| Risk | Impact | Mitigation |
|---|---|---|
| Client package pricing/inclusions arrive late | Blocks pricing engine testing & real content before August event | Ship placeholder/demo pricing; swap via CMS, no redeploy |
| WhatsApp Business verification delay (10–15 days) | Invoice-by-WhatsApp not ready at go-live | Feature-flagged sender; go-live proceeds email-only |
| Legal pages not supplied in time | Go-live blocker (checkout must link to them) | Escalate early; labeled "Coming Soon" interim only if unavoidable |
| Razorpay KYC/account delay | Payments can't go live | Start immediately at contract signing; build/test against test mode in parallel |
| Overbooking under concurrent load | Data integrity / trust | Advisory-lock design, explicit concurrency test pre-go-live |
| Scope creep (affiliate, AI chatbot, full accounts) | Budget/timeline overrun | Log as Change Request (11 below), do not silently build |

---

## 7. Phase 2 Development Tracker — Independent E-Commerce

**Governs:** SOW 19–24 · **Full detail:** Document 06 · **Status:** Not Yet Due (begins after Phase 1 go-live)

### 2.0 — Data Layer & Admin Catalog Foundations (Week 1)

| Task | Owner(s) | Status |
|---|---|---|
| Migration Batches 0007–0008 (Product, Category, Inventory, Order + `linkedProductId` alter) | Shubham | Not Yet Due |
| Seed `ECOM_MAX_QTY_PER_PRODUCT`, `OUT_OF_STOCK_AUTO_FLAG_DAYS` settings | Shubham | Not Yet Due |
| `/admin/products`, `/admin/categories` CRUD APIs | Shubham | Not Yet Due |
| Product Catalog admin screen | Chaitanya | Not Yet Due |
| Category management screen | Chaitanya | Not Yet Due |

### 2.1 — Storefront: Browse, Filter, Product Detail (Weeks 1–2)

| Task | Owner(s) | Status |
|---|---|---|
| `/shop` landing (category + theme tiles, search, filters) | Vishal | Not Yet Due |
| Product grid with live stock-status badges | Vishal | Not Yet Due |
| Product detail page (personalization fields, quantity stepper) | Vishal | Not Yet Due |
| Related-products module + Product schema (SEO) | Vishal | Not Yet Due |
| `GET /shop/products`, `GET /shop/products/:slug` (live stock at request time) | Shubham | Not Yet Due |

### 2.2 — Cart, Personalization, Checkout, Payments (Weeks 2–3)

| Task | Owner(s) | Status |
|---|---|---|
| Client-held cart with `POST /cart/quote` price/stock revalidation | Vishal | Not Yet Due |
| Checkout form (shipping, guest contact, order summary, Razorpay handoff) | Vishal | Not Yet Due |
| Order lookup page (Order-ID + Email-OTP, reused pattern) | Vishal | Not Yet Due |
| `POST /shop/checkout` — inventory-safe transaction (`SELECT...FOR UPDATE` row locks) | Shubham | Not Yet Due |
| Payment webhook extended for `ORDER` type; invoice pipeline reused | Shubham | Not Yet Due |

### 2.3 — Inventory Engine & Admin Inventory Console (Weeks 2–3, parallel with 2.2)

| Task | Owner(s) | Status |
|---|---|---|
| `GET /admin/inventory` (In Stock/Low Stock/Out of Stock/Stale views) | Shubham | Not Yet Due |
| `PUT /admin/inventory/:productId` (manual adjust, ledger-logged) | Shubham | Not Yet Due |
| Scheduled stale-inventory sweep job | Shubham | Not Yet Due |
| Inventory dashboard (sortable table, quick-adjust, ledger drawer) | Chaitanya | Not Yet Due |
| Red "long out of stock" tag | Chaitanya | Not Yet Due |

### 2.4 — Cross-Linking with Package Customization (Week 3)

| Task | Owner(s) | Status |
|---|---|---|
| `PackageCustomizationOption` reads enriched with linked-product summary | Shubham | Not Yet Due |
| Product card rendering in booking customization step | Vishal | Not Yet Due |
| "Link to Shop Product" picker in Package Customization Option editor | Chaitanya | Not Yet Due |

### 2.5 — Order Management (Admin) & Notifications (Week 3)

| Task | Owner(s) | Status |
|---|---|---|
| Orders list/detail (status pipeline, shipping/personalization display, invoice link) | Chaitanya | Not Yet Due |
| `PUT /admin/orders/:id/status` (audit-logged) | Shubham | Not Yet Due |
| Order-confirmed email; optional "Shipped" status email (confirm scope with client) | Shubham | Not Yet Due |

### 2.6 — QA, Regression, SEO for Shop Pages, Go-Live (Week 4)

| Task | Owner(s) | Status |
|---|---|---|
| Concurrency test: simultaneous checkout on `quantityAvailable = 1` | Shubham | Not Yet Due |
| Full regression pass on Phase 1 booking flow | All | Not Yet Due |
| SEO: sitemap update, Product JSON-LD validated (Rich Results Test) | Vishal | Not Yet Due |
| Performance check on image-heavy product grid | Vishal | Not Yet Due |
| Client UAT on shop journey (2-revision policy tracked) | All | Not Yet Due |

### Phase 2 Risk Register (Document 06 12)

| Risk | Impact | Mitigation |
|---|---|---|
| Client product data/images/inventory arrive late | Blocks realistic catalog testing | Seed placeholder SKUs; swap via Admin |
| Ambiguity in 45–50 day stale-flag trigger (listing date vs. zero-stock date) | Wrong products flagged/hidden | Confirm exact rule with client at Phase 2 kickoff (see 10 below) |
| Overselling under concurrent checkout | Financial/trust damage | Row-level locking + compensating transaction, load-tested |
| Scope creep toward deeper cross-linked purchasing engine | Budget/timeline overrun | Log as Change Request, not silently built |

---

## 8. Phase 3 Development Tracker — Gift Registry

**Governs:** SOW 25–33 · **Full detail:** Document 07 · **Status:** Not Yet Due (begins after Phase 2 go-live)

### 3.0 — Data Layer, Eligibility Rules, Registry Creation Flow (Week 1)

| Task | Owner(s) | Status |
|---|---|---|
| Migration Batch 0009 (`GiftRegistry`, `GiftRegistryItem`, `GiftReservation`, `GiftRegistryEligibilityRule`) | Shubham | Not Yet Due |
| Seed eligibility rules (Premium/Luxe included; Standard excluded, optional paid upgrade) | Shubham | Not Yet Due |
| `POST /registry/from-booking/:bookingCode` (eligibility check, code gen, password gen, pre-fill from booking) | Shubham | Not Yet Due |
| Auto-trigger registry creation on post-payment confirmation (bundled with invoice send) | Shubham | Not Yet Due |
| "Gift Registry Included" toggle + Upgrade Add-On picker in Package editor | Chaitanya | Not Yet Due |

### 3.1 — Owner Dashboard: Configure Registry, Add/Edit Gift Items (Weeks 1–2)

| Task | Owner(s) | Status |
|---|---|---|
| Owner configuration screen (details, photo, address, password reset) | Vishal | Not Yet Due |
| Gift item manager ("Add a Gift Link" + "Add from our Shop") | Vishal | Not Yet Due |
| Item list (edit/remove/reorder, "Reverse Reservation" action) | Vishal | Not Yet Due |
| Shareable link + password UI (copy actions, WhatsApp share) | Vishal | Not Yet Due |
| `PUT /registry/:registryCode`, item CRUD, `POST /registry/:registryCode/set-password` | Shubham | Not Yet Due |

### 3.2 — Metadata Extraction Job + Manual Fallback UX (Week 2)

| Task | Owner(s) | Status |
|---|---|---|
| Async server-side fetch job (Open Graph parse, JSON-LD price best-effort) | Shubham | Not Yet Due |
| `metadataFetchStatus` handling (SUCCESS/PARTIAL/FAILED) | Shubham | Not Yet Due |
| Manual-entry fallback UX (first-class, not an error state) | Vishal | Not Yet Due |

### 3.3 — Guest-Facing Registry Page & Reservation Flow (Week 2)

| Task | Owner(s) | Status |
|---|---|---|
| Public registry page (`/registry/[registryCode]`) — password gate, celebration presentation, gift grid | Vishal | Not Yet Due |
| Reservation confirmation modal + grayed-out state update | Vishal | Not Yet Due |
| Expired-registry friendly error state | Vishal | Not Yet Due |
| `GET /registry/public/:registryCode`, `POST .../items/:itemId/confirm` (idempotent-safe) | Shubham | Not Yet Due |

### 3.4 — Expiry Job, Admin Oversight, Retention (Week 3)

| Task | Owner(s) | Status |
|---|---|---|
| `jobs/registry-expiry-sweep` (daily, ACTIVE→EXPIRED, retention action) | Shubham | Not Yet Due |
| `GET /admin/registries` (status filter, expiring-within-7-days view) | Shubham | Not Yet Due |
| Registry oversight admin screen (read-only, force-expire/archive) | Chaitanya | Not Yet Due |

### 3.5 — QA, Regression, Go-Live (Week 3)

| Task | Owner(s) | Status |
|---|---|---|
| Full end-to-end walkthrough (book → registry created → configured → shared → guest reserves → owner reverses) | All | Not Yet Due |
| Expiry job tested against backdated `expiresAt` in staging | Shubham | Not Yet Due |
| Regression pass on Phase 1 (Guest Verification reuse) and Phase 2 (product linking) | All | Not Yet Due |
| Negative test: confirm zero affiliate-link UI/API surface exists anywhere | Shubham | Not Yet Due |

### Phase 3 Risk Register (Document 07 12)

| Risk | Impact | Mitigation |
|---|---|---|
| Client requests real affiliate integration mid-phase | Scope/budget/brand-risk overrun | Log as Change Request; do not build (SOW 33) |
| Metadata scraping blocked by major retailers (expected/common) | Owner experience feels "broken" | Manual-entry fallback is first-class UX from day one |
| Ambiguity in exact retention mechanic post-expiry | Data-retention/compliance risk | Confirm with client at Phase 3 kickoff (see 10 below) |
| Guest confirms wrong item / owner disputes | Support burden | "Reverse Reservation" shipped from day one |
| Owner/guest auth-context confusion during implementation | Security bug (privilege confusion) | Distinct middleware guards, specifically code-reviewed |

---

## 9. Client Action Requirements & Dependency Tracker (Living — Update Continuously)

*Merged from Document 11 6, original tracker, and MOM 4–10. This is the canonical blocker-tracking table.*

| # | Item Needed | Needed For (Sprint/Phase) | Status |
|---|---|---|---|
| 1 | Repository/codebase access | Week 1 (1.0) | **In Progress** |
| 2 | Domain access + nameserver update to Cloudflare | Week 1 (1.0, DNS) | **In Progress** |
| 3 | Brand assets, finalized logo/icon | UI Development (1.1) | Pending |
| 4 | Website content (About Us, Contact info, FAQs, Testimonials) | UI Development (1.1) | Pending |
| 5 | Theme-specific images, taglines, descriptions, Return Gift assets | Theme Pages (1.1, 1.3) | Pending |
| 6 | Package details, prices, inclusions | **Urgent** — Week 1–2 (1.2, 1.3) | Pending |
| 7 | Event content (August event) | **Urgent** — Week 1 (1.1) | Pending |
| 8 | Core Policies (Refund/ToS/Privacy/Cancellation) | Week 4 / go-live gate (1.7) | Pending |
| 9 | GST information | Week 3 (1.2) | Pending |
| 10 | Razorpay account registration, KYC, credentials + webhook | **Urgent** — Week 1 (1.2) | Pending |
| 11 | Dedicated WhatsApp number + Meta Business verification (10–15 day lead time) | Week 1 (1.2, degrades gracefully if late) | Pending |
| 12 | Cloudflare R2 / cloud storage payment verification | Media Storage (1.0/1.1) | Pending |
| 13 | Core business email access (Marketing/Analytics/SEO tools) | Integrations (1.6) | Pending |
| 14 | Analytics account access (GA4/GSC/Meta Pixel/GTM) | Week 4 (1.6) | Pending |
| 15 | Timely UI/UX approvals within 2-revision window | Ongoing, all phases | Pending |
| 16 | Product info/images/inventory counts | Phase 2 kickoff (2.0, 2.1) | Not Yet Due |
| 17 | Gift Registry retention-policy confirmation | Phase 3 kickoff (3.4) | Not Yet Due |

---

## 10. Key Open Decisions — Require Client or Team Confirmation

*A new, actionable list surfaced across the documentation suite. Each of these should be closed out explicitly, not defaulted silently.*

| # | Decision | Where Flagged | Target Resolution |
|---|---|---|---|
| 1 | Final WhatsApp provider: Meta Cloud API (direct) vs. Twilio vs. BSP aggregator (Interakt/AiSensy/Gupshup/Wati) — Doc 12 is a Twilio-specific setup guide, but Doc 02 defaults to Meta Cloud API direct for lowest cost | Doc 02 6.2 | First 2 weeks of Phase 1 |
| 2 | Exact commercial milestone invoice schedule (15k/20k/7.5k/7.5k) — discussed in Meeting 2, not restated verbatim in signed SOW | Doc 01 5, Doc 11 8 | Before Phase 1 completion invoice |
| 3 | Stale-inventory flag trigger: "days since listing" vs. "days since stock hit zero" | Doc 06 7 | Phase 2 kickoff |
| 4 | Gift Registry retention action on expiry: archive + later soft-delete vs. immediate soft-delete | Doc 07 9 | Phase 3 kickoff |
| 5 | Standard-tier Gift Registry paid upgrade add-on — build or skip | Doc 07 5.0 | Phase 3 kickoff |
| 6 | "Shipped" status email for orders — in Phase 2 MVP scope or deferred | Doc 06 9 | Phase 2, Sub-Phase 2.5 |
| 7 | Booking capacity granularity — stay per-day, or add per-time-slot rules later | Doc 01 7 | Post-Phase-1 refinement, not a launch blocker |
| 8 | Reconcile "Overall Project Target — 1st week Sept" against the ~13-week indicative phase plan | This document 1 | First review session (22/23 July) |

---

## 11. Change Request Log (Document 11 7)

Per Doc 01 14/41 — anything requested that isn't in SOW 1–39 gets logged here, not silently built:

| # | Date | Requested By | Description | Traced To | In SOW? | Decision | Impact if Approved |
|---|---|---|---|---|---|---|---|
| 1 | — | Client | Amazon affiliate integration | Meeting 2 | No (SOW 33/40 excludes) | Deferred | Additional research + separate scope/budget |
| 2 | — | Client | AI/LLM chatbot | Meeting 2 | No (SOW 11/40 excludes) | Deferred | ~₹40–50k additional (client-communicated context, not a commitment) |
| 3 | — | Client | Full permanent customer login/dashboard | Implied by various discussions | No (SOW 4/40 excludes) | Not building | Would require redesigning the guest-first architecture |

*Add new rows as real requests arise; use this exact structure so every entry traces to its source and scope decision.*

---

## 12. Out-of-Scope Quick Reference (SOW 40 — Document 01 14)

Do **not** build any of the following without a signed Change Request:

- AI/LLM-powered chatbot
- Full enterprise CRM platform (this CRM is an Admin Panel module, not a standalone product)
- Full customer login/registration system and permanent customer dashboard
- Advanced employee/task management system, document vault, advanced marketing automation
- Advanced configurable RBAC (fixed 3-role set only — Doc 08)
- Native Android/iOS applications
- Marketplace/multi-vendor functionality
- Verified (vs. confirmation-based) Gift Registry duplicate-purchase prevention
- Guaranteed external product metadata extraction (best-effort only)
- Amazon/third-party affiliate API integration
- Ongoing paid ad management, ongoing SEO campaigns, guaranteed rankings
- Any third-party subscription/messaging/gateway/hosting cost (all client-borne)

---

## 13. Testing & Pre-Go-Live Gates (Document 09 7, 9)

| Priority | Module | Approach |
|---|---|---|
| Critical — automated | Pricing engine, booking capacity/locking, inventory-safe checkout, payment webhook signature | Unit + concurrency tests |
| High — automated | Guest Verification (OTP) flow | Unit + integration tests |
| High — manual, scripted | Full booking journey, e-commerce checkout, gift registry journey | Documented manual scripts before each phase go-live |
| Medium — manual | CMS/CRM CRUD screens | Smoke-tested per module |
| Low — spot-checked | SEO/schema output | Rich Results Test + Lighthouse pre-go-live |

**Pre-Go-Live Checklist (every phase, Doc 09 9):** CSP/CORS reviewed · dependency audit clean · rate limits live-tested · admin panel unreachable from public site + `noindex` · secret scan run · backup/restore drill documented · error tracker + uptime monitor confirmed · payment webhook verified against real transaction · traffic smoke test appropriate to ~50 users/month scale.

---

## 14. Post-Launch Support & Handover (Document 11 10–11)

- **Support window:** 2 months complimentary post-launch (bug fixes + minor adjustments only; new features/integrations/redesigns are out of scope — logged as Change Requests).
- **Intake:** single tracked channel (issue tracker or existing WhatsApp group), triaged by Shubham.
- **Handover package (end of Phase 3):** full source in client-owned GitHub repos · all env vars/secrets transferred to client-controlled accounts · this 11+1-document `/Docs` suite kept current · a short Admin User Guide (doc or recorded walkthrough) · written confirmation of support-window start date · IP assignment documentation.

---

## 15. Action Items (Affor Technologies)

| Task | Assignee | Status |
|---|---|---|
| Share the detailed project requirements document with client | Affor Team | Pending |
| Share 19 July MOM with the client | Affor Team | Pending |
| Set up the centralized milestone/development tracker | Affor Team | **Completed** *(this document)* |
| Begin Phase 1 UI and frontend development | Vishal | **In Progress** |
| Prepare the initial landing and core page designs | Vishal | **In Progress** |
| Plan the first design review for 22 or 23 July 2026 | Affor Team | **Completed** |
| Provide DNS/nameserver configuration guidance | Affor Team | Pending |
| Guide the client through Razorpay registration and API setup | Affor Team | Pending |
| Assist with cloud storage configuration | Affor Team | Pending |

---

## 16. Document Suite Cross-Reference (Document 00)

| # | Document | What It Answers |
|---|---|---|
| 00 | Master Index | "Where do I find X?" |
| 01 | Executive Summary & SOW Alignment | What are we building, for how much, in what phases, and what's excluded? |
| 02 | System Architecture & Infrastructure | How are the 3 repos deployed/secured/connected? What's the hosting/CDN stack? |
| 03 | Database Schema & Data Model | What does every table look like across all 3 phases? |
| 04 | Backend API Specification | Exact endpoints, auth rules, request/response shapes, error codes |
| 05 | Phase 1 — MVP Development Plan | What's built first, in what order, by whom? |
| 06 | Phase 2 — E-Commerce Development Plan | How does the shop/inventory engine/cross-linking work? |
| 07 | Phase 3 — Gift Registry Development Plan | How does the private registry/reservation/duplicate-prevention work? |
| 08 | Admin Panel (CMS + CRM) Specification | What does every Admin screen do, and who can access what? |
| 09 | Security, Performance & Engineering Standards | Concrete security/performance/coding rules every PR must satisfy |
| 10 | Content, SEO & Analytics Implementation Guide | How does content strategy map onto CMS fields/schema/analytics? |
| 11 | Team Workflow, Timeline, RACI & Governance | Who owns what; timeline; dependency/change-request governance |
| 12 | Twilio WhatsApp Integration Guide | Client-facing Twilio/WhatsApp setup walkthrough |
| **13** | **This Tracker** | Centralized live status: tasks, phases, milestones, owners, dependencies |

---

*This tracker should be kept current in whatever day-to-day project-tracking tool the team actually uses — this markdown file is the canonical snapshot/template referenced by Document 11 6 and requested directly by the client in the 19 July 2026 MOM (11).*
