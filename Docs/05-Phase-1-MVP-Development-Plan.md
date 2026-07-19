# 05 — Phase 1: MVP & Core Platform — Development Plan

**Team:** Shubham Deshmukh (Lead/Backend), Vishal (Frontend/UI-UX), Chaitanya (Admin Panel/UI-UX)
**Governs:** SOW 5–18
**Depends on:** Documents 01–04
**Hard deadline driver:** Client event in the first week of August (Meeting 1) — the **Go-Live Shell** (Sub-Phase 1.1) must ship ahead of everything else that isn't a blocking dependency for it.

---

## 1. Phase 1 Objective

Ship a production, SEO-ready, mobile-responsive customer website with a full guest booking → package customization → payment → invoice journey, a static lead-gen chatbot, and an Admin Panel with integrated CMS + CRM — on a stack that is already secure and scalable enough to carry Phase 2/3 without rework.

## 1.1 Definition of Done for Phase 1 (Exit Criteria)
Phase 1 is not "done" until **all** of the following are true simultaneously:
1. Every item in Document 01 13 tagged "Doc 05" is live in production.
2. Go-live legal pages (Refund/ToS/Privacy/Cancellation) are published and linked from checkout (client-provided content).
3. Razorpay is in **live mode** with a verified webhook, and at least one real end-to-end test transaction has settled.
4. WhatsApp invoice delivery is either live, or gracefully degraded to email-only with a tracked follow-up item (Business API approval can lag — must not block go-live).
5. Booking capacity, GST %, and minimum consultation notice are configured with the client's real business numbers (not placeholder defaults).
6. Daily backups are verified running with one successful test restore.
7. Lighthouse mobile score ≥ 85 on Performance, ≥ 90 on SEO/Accessibility for homepage, theme page, package page (see Document 09 performance budget).
8. GA4, GSC, Meta Pixel, GTM are verified firing on production domain.
9. Admin can independently create/edit a Theme, Package, Gallery item, Blog post, FAQ, Testimonial, Event and Popup without developer involvement, and publish is reflected on the live site within the ISR revalidation window.
10. Security checklist in Document 09 "Pre-Go-Live Checklist" is signed off.

---

## 2. Sub-Phase Structure

Phase 1 is broken into **7 sub-phases**. Sub-phases 1.0 and 1.1 are sequential and prioritized ahead of everything else due to the August event deadline; 1.2–1.6 run substantially in parallel across the three developers once foundations exist; 1.7 is the hardening/launch gate.

```
1.0  Foundation, Environments, Migrations, Design System      (Week 1)
1.1  Go-Live Shell: Homepage, Nav, Theme/Package pages,        (Weeks 1-2)  ◄── AUGUST EVENT GATE
     Gallery, Event Page, Contact, Legal placeholders
1.2  Booking Engine, Package Customization, Checkout,          (Weeks 2-4)
     Payments, Invoicing (email + WhatsApp)
1.3  Admin Panel — CMS modules                                  (Weeks 2-4)
1.4  Admin Panel — CRM + Booking Calendar + Capacity Settings   (Weeks 3-5)
1.5  Static Chatbot + Lead Capture                               (Week 4)
1.6  SEO Foundation, Analytics, Performance Hardening            (Weeks 4-5)
1.7  QA, Security Hardening, UAT, Go-Live                        (Weeks 5-6)
```

Indicative total: **~6 working weeks** for Phase 1 with 3 developers working near-full-time, assuming client content/assets/credentials arrive on the schedule tracked in Document 11 "Client Action Requirements". Any material delay in client-provided package pricing, theme assets, legal copy, or Razorpay/WhatsApp credentials directly extends this timeline — flag immediately rather than absorbing silently.

---

## 3. Sub-Phase 1.0 — Foundation (Week 1)

| Task | Owner | Notes |
|---|---|---|
| Confirm/lock Prisma schema for Migration Batches 0001–0006 (Document 03 3, 7) | Shubham | Blocking for everyone else's API integration work |
| Set up Postgres (dev + staging), run initial migrations, seed script (sample themes/packages for FE/Admin dev) | Shubham | |
| Configure `helmet`, `cors` allowlist, Zod validation middleware, error handler, request logger | Shubham | Baseline security from day one, not bolted on later |
| Stand up Admin auth (JWT + refresh cookie), seed one `SUPER_ADMIN` | Shubham | Unblocks Chaitanya's login screen |
| Establish shared design tokens (colors, type scale, spacing) in Tailwind config, shared between `frontend` and `admin` where sensible | Vishal (lead), Chaitanya (align) | Client wants premium/elegant/warm/trustworthy tone (Content & SEO Guide 3) — encode as design tokens, not ad hoc CSS |
| Component library skeleton: Button, Card, Badge, Modal, Tabs, Stepper, Toast | Vishal | Reused across booking journey and admin forms |
| Admin layout skeleton: sidebar nav (CMS / CRM / Settings), topbar, auth-guarded route group | Chaitanya | |
| Error tracking + uptime monitor wired (free tiers) | Shubham | |
| `.env.example` finalized for all three repos, secrets rotation policy documented | Shubham | See Document 09 |

---

## 4. Sub-Phase 1.1 — Go-Live Shell (Weeks 1–2) — **August Event Priority**

This sub-phase exists specifically because the client stated in Meeting 1: *"I want the event part to be [ready]... I want the home page part and the basic website part which I can go live [with]."* Everything here must work even if Booking/Payments/Admin CRM are not yet fully live — the event page can go live with a registration form that stores leads/registrations even before the full package/booking engine is finished, decoupling the "must launch for the event" surface from the "full MVP" surface.

### 4.1 Backend (Shubham)
- `Theme`, `Package` (read APIs only, seeded via SQL/seed script or a minimal temp admin form if CMS isn't ready yet), `GalleryImage`, `Event`, `EventRegistration`, `LegalPage`, `SiteMetadata` endpoints (Document 04 3, 3.6).
- `POST /events/:slug/register` with optional Razorpay integration if the event requires paid registration (confirm with client early — Meeting 1 event discussion implies free registration + interest capture, not necessarily paid, but the schema supports either via `registrationFeeInPaise`).

### 4.2 Frontend (Vishal)
- **Homepage** per Content & SEO Guide 5: Hero (headline + sub-heading + CTA to Explore Themes / Book Free Consultation / Upcoming Events) → Why Vaibhav Celebrations → Featured Themes → Featured Packages → Upcoming Events → Testimonials → Instagram feed embed → Final CTA.
- **Theme listing + Theme detail page** per SOW 5.2 / Content & SEO Guide 6: Hero → Theme Story → "Who is this theme for?" → Gallery → What's Included → Sample Deliverables (with preview modal/lightbox) → Packages → FAQs → CTA. Ships with placeholder/seed content if client assets aren't in yet, structured so swapping in real content is a CMS action, not a redeploy, once 1.3 lands.
- **Package listing + comparison table** per SOW 6 and the reference screenshot shared in Meeting 1 (client explicitly liked the tabular comparison, asked for it "more good looking... as per our color seminar" and business niche) — build a polished, animated comparison table component, not the plain reference table.
- **Gallery** with tag filter chips; clicking a theme-tagged image routes to the Theme page (SOW 5.3 "Gallery-to-Theme Navigation").
- **Event/Landing Page template** (SOW 10): Hero banner → Description → Activities → Age Group → Venue → Schedule → Gallery → Registration form → FAQ → CTA (Content & SEO Guide 9). Built as **one reusable template**, not a page-builder — explicitly matches SOW's "template-based, not drag-and-drop" boundary. This is the exact page the client will point Google/Facebook ads at.
- **Contact page** with the static chatbot entry point (stub until 1.5 completes; a simple contact form posting to `/leads/contact-form` ships first).
- **Global header/nav, footer, legal page templates** (content populated once client supplies copy in 1.7).
- Mobile-first responsive pass on every page above (non-negotiable — Meeting 1 lists "mobile responsiveness" as a primary focus).

### 4.3 Admin (Chaitanya)
- Minimal **Event CMS screen** (create/edit event, upload banner/gallery, set schedule, toggle registration open/closed, view registrants) — prioritized ahead of the rest of the CMS specifically to support the August event without waiting for the full CMS suite in 1.3.
- Minimal **Theme/Package "quick edit" screens** (title, description, price, active toggle) so the client isn't blocked on a developer to get real content live, even before the fully-featured CMS (1.3) ships.

**Gate:** Sub-Phase 1.1 is considered "event-ready" when: homepage + at least one live theme page + the event landing page + event registration (with lead capture) are deployed to production, mobile-tested, and GA4/Meta Pixel are firing — independent of whether booking/payments/full-admin are finished.

---

## 5. Sub-Phase 1.2 — Booking Engine, Customization, Checkout, Payments, Invoicing

### 5.1 Backend (Shubham)
- Migration Batches 0005–0006 (`Booking`, `BookingCustomization`, `BookingCapacityRule`, `Invoice`).
- `GET /availability`, `GET /availability/range`, `POST /bookings` with advisory-lock overbooking prevention (Document 04 4.1).
- Pricing engine: `POST /pricing/quote` (Document 04 3.2) — build and unit-test this in isolation before wiring to checkout UI, since it's the module most likely to have subtle rounding/edge-case bugs (e.g., zero-quantity options, package-level price override per theme).
- `POST /checkout/booking/:bookingCode/summary`, Razorpay order creation, webhook handler with signature verification (Document 04 6).
- Invoice generation job: renders a PDF (recommend a simple HTML→PDF pipeline, e.g. `puppeteer` in a controlled/queued job or a lightweight PDF library — avoid running headless Chrome inline in the request path), uploads to Cloudflare, stores `Invoice` row, triggers email + WhatsApp send jobs.
- Nodemailer integration: OTP email, invoice email, booking confirmation email templates.
- WhatsApp adapter (Document 02 6.2) — build behind the internal interface even if the live provider isn't finalized yet; ship with a feature flag so invoice-by-WhatsApp can be toggled on the moment Business API approval lands without a code change.
- Guest Verification Service (Document 01 4, Document 04 2) — build once here, reused by Order lookup (Phase 2) and Registry owner access (Phase 3).

### 5.2 Frontend (Vishal)
- **Booking journey UI:** Date picker (calendar showing availability/blocked dates from `/availability/range`) → Theme selection → Package selection → Customization step (quantity steppers driven by `PackageCustomizationOption`, "Fiverr-gig-style" UI per Meeting 1) → Order Summary (itemized: theme, package, deliverables included, add-ons, quantities, GST, total — SOW 12) → Guest contact details → Razorpay Checkout → Confirmation page with Booking ID.
- Sequence note: SOW explicitly allows the Theme→Package→Date order to be adjusted during UI/UX design for the best conversion flow — Vishal should prototype both orders (Date-first vs. Theme-first) against the Content & SEO Guide's storytelling framework (Emotion → Problem → Solution → Benefits → Social Proof → CTA) and pick one, documenting the decision rather than silently changing it later.
- **Consultation request form** (separate flow from standard booking) with the minimum-advance-notice warning banner (SOW 9) driven by the backend's `belowMinimumNotice` flag.
- **Order/Booking lookup page** (`/order/lookup`) implementing the Order-ID + Email-OTP flow end to end.
- Current-system UI debt explicitly called out in Meeting 1 to fix, not carry forward: **theme selector must become a polished vertical/grid card layout** (client: *"current system... is very bad... instead of [horizontal], we are planning to convert that into a... vertical view"*), and all positive/success micro-interactions get a consistent green affirmative color treatment.
- WhatsApp enquiry CTA with pre-filled message (`https://wa.me/<number>?text=<url-encoded predefined message>`), placed consistently (footer/floating button).

### 5.3 Admin (Chaitanya)
- **Booking capacity settings screen**: global max/day, per-date overrides, blocked dates calendar-picker UI.
- **GST % and other `OperationalSetting` values** exposed in a Settings screen (not hardcoded, not raw DB editing).
- **Invoice list view** with filters + bulk export button (wired to `/admin/invoices/export`), and a manual "resend" action per invoice.

---

## 6. Sub-Phase 1.3 — Admin Panel CMS Modules (Weeks 2–4)

**Owner:** Chaitanya (UI/UX + screens), Shubham (APIs already defined in Document 04 3).

Per Meeting 1's explicit UI/UX budget guidance — *"we will not be working as much on the... UI part [of the admin]... to save time and work on real backend and front end... there will be some UI degradation for the backend only"* — Admin CMS screens should prioritize **clarity, speed and correctness of every control** over bespoke visual polish, while still meeting a baseline professional bar (consistent spacing/typography from the shared design tokens, not literally ugly). Concretely: reuse a data-table + drawer/modal-form pattern across every CMS entity rather than hand-designing a unique layout per module.

| Module | Key Controls |
|---|---|
| Themes | List, create/edit (title, slug, descriptions, hero image, SEO fields), gallery manager, sample-asset manager (Digital Invite/Video/Brief/Countdown/Activity-Kit uploads with preview), package linking, reorder (drag or numeric) |
| Packages | List, create/edit (title, price, tier rank, recommended toggle), feature/deliverable line items with quantity, add-on service linking, **customization-option ("extra column") manager** — this is the most business-critical screen in the entire CMS and deserves the most UX care within the module |
| Gallery | Upload, tag manager, theme-link, CTA-type + target selector, reorder |
| Testimonials | Create/edit, subject type (Theme/Package/General), rating (Themes only, per SOW 14.1), featured toggle |
| FAQs | Create/edit, category grouping, reorder |
| Events | Full event editor (already partially built in 1.1), registrant list export |
| Popups | Create/edit, placement multi-select, trigger-delay seconds, linked event, schedule (start/end) — directly implements Meeting 1's "closest event pop-up... first 5-6 seconds... or if user doesn't change page in 4-5 seconds" behaviour |
| Legal Pages | Rich text editor for the 4 mandatory legal documents (go-live blocker once client supplies content) |
| Blog | Full blog CRUD (SOW 14.1 "Blog Management") — title, featured image, content (rich text), categories, tags, author, publish date, SEO title/description, slug, status (draft/published/unpublished) |
| Site Metadata / SEO | Per-page meta title/description/OG image/canonical override screen — see Document 10 for the full field mapping |
| Media Library | Central upload/browse/search across all CMS modules, reused as a picker component everywhere an image is needed |

**Rich text editor choice:** a lightweight, well-maintained editor (e.g., Tiptap) rather than a full legacy WYSIWYG — keeps bundle size sane and output HTML clean for SEO.

---

## 7. Sub-Phase 1.4 — Admin CRM + Booking Calendar (Weeks 3–5)

**Owner:** Chaitanya (screens), Shubham (APIs, Document 04 7).

| Module | Key Controls |
|---|---|
| Customers | Searchable list, 360° detail view (bookings/orders/consultations/invoices/notes in one screen), internal note-adding |
| Leads | List with source/status filters, status pipeline (New→Contacted→Qualified→Converted/Closed-Lost), quick-contact info |
| Consultation Requests | List, status pipeline, minimum-notice-violation flag surfaced visually |
| Bookings | List/filter (date range, theme, package, status, payment status), manual status transitions with an audit trail (who changed what, when — via `AuditLog`) |
| **Booking Calendar** (SOW 15) | Day/Week/Month calendar views, color-coded by status (Scheduled/Confirmed/In Progress/Completed/Cancelled per Meeting 2's dental-CRM reference demo, adapted to celebration bookings), click-through to booking detail |
| Invoices | (built in 1.2, lives here navigationally) |

**Design reference from Meeting 2:** the client was shown a dental-clinic CRM calendar (scheduled/confirmed/in-progress/completed/no-show→**cancelled** for this project) as a *visual pattern reference only* — Vaibhav Celebrations' actual data model, statuses and business rules are fully custom per Document 03, not a copy of that unrelated system.

---

## 8. Sub-Phase 1.5 — Static Chatbot + Lead Capture (Week 4)

**Owner:** Vishal (widget UI), Shubham (flow engine + persistence, Document 04 9), Chaitanya (admin lead-view surfaces already covered in 1.4).

- Build the chatbot as a **reusable floating widget** rendered on all public pages, backed by the JSON decision-tree from `GET /chatbot/flow`.
- Ship the specific flow the client was shown in Meeting 2 as the baseline: qualify visitor intent (Party Planning / Return Gifts–Shop / Just Browsing), branch to date/contact capture, write a `Lead`.
- Explicitly **not** wired to any AI/LLM — verify no team member accidentally reaches for an AI API "since it would be easy," per Document 01 14 Out-of-Scope guardrail.

---

## 9. Sub-Phase 1.6 — SEO Foundation, Analytics, Performance (Weeks 4–5)

**Owner:** Vishal (implementation), Shubham (server-side verification/webhooks), full detail in Document 10.

- Sitemap.xml (dynamic, includes Themes/Packages/Gallery/Blog/Events), robots.txt (allow public, disallow admin subdomain entirely).
- Structured data (JSON-LD): Organization + LocalBusiness + WebSite on homepage; Article+FAQ+Breadcrumb on blog; Event schema on event pages (Document 10 "Schema Strategy").
- Open Graph + Twitter Card meta on every templated page.
- Image pipeline: WebP delivery via Cloudflare, mandatory alt text (enforced at the CMS upload step — `MediaAsset.altText` should not be nullable for public-facing images in practice, flagged as a CMS validation rule even though the DB column is nullable for flexibility).
- Core Web Vitals pass: lazy-loading below-the-fold images, font-display swap, route-level code-splitting already default in Next App Router — verify, don't assume.
- GA4, Google Search Console verification, Meta Pixel, Google Tag Manager — container-based so the client (a digital marketer per Meeting 1) can self-serve additional tags later without a deploy.
- Conversion events wired: booking completed, consultation submitted, lead captured, event registration completed.

---

## 10. Sub-Phase 1.7 — QA, Security Hardening, UAT, Go-Live (Weeks 5–6)

- Full regression pass against the **Definition of Done** checklist in 1.1.
- Security checklist execution — Document 09 "Pre-Go-Live Checklist" (helmet/CORS verification, secret scan, rate-limit verification, admin route penetration smoke-test, dependency audit `npm audit`/`pnpm audit`).
- Load/traffic sanity check appropriate to the client's own conservative estimate (~50 users/month per Meeting 1) — a light smoke/load test, not an enterprise load-test suite, sized proportionate to actual expected traffic.
- Backup + restore drill executed and documented.
- Client UAT session against the two-revision policy (SOW 42) — track every requested change in Document 11 "Change Log", explicitly marking each as "Revision" vs. "Change Request" per the SOW 42 definition, so the two-revision allowance isn't silently exceeded.
- DNS cutover, Vercel/Render production promotion, Razorpay live-mode switch, WhatsApp Business number go-live (or documented fallback to email-only).
- Client handover walkthrough of the Admin Panel (recorded session recommended) + short written Admin User Guide (can live as a page inside Document 08 or a separate quick-start — see Document 11 "Handover Package").

---

## 11. Developer Allocation Summary (Phase 1)

| Developer | Primary Focus | Secondary Focus |
|---|---|---|
| **Shubham** (Lead/Backend) | Data model, all backend modules (auth, guest-verification, CMS APIs, booking engine, pricing engine, payments/webhooks, invoicing, notifications, chatbot engine), infra/CI-CD, security | Cross-review of Vishal/Chaitanya's API integration code |
| **Vishal** (Frontend/UI-UX) | Public site: homepage, theme/package/gallery/event/blog pages, booking journey UI, checkout UI, chatbot widget, SEO/analytics implementation, mobile responsiveness, design system | Content-structure alignment with Content & SEO Guide |
| **Chaitanya** (Admin/UI-UX) | Admin Panel: auth screens, CMS module UIs, CRM module UIs, booking calendar UI, settings screens, media library UI | Coordinate with Vishal on shared design tokens/component patterns where reusable |

---

## 12. Phase 1 Risk Register (see Document 11 for live tracking)

| Risk | Impact | Mitigation |
|---|---|---|
| Client package pricing/inclusions arrive late | Blocks pricing engine testing & real content on Theme/Package pages before August event | Ship with clearly-marked placeholder/demo pricing (per Meeting 1: *"right now we will be putting it simple and demo"*); swap via CMS the moment real data lands — no redeploy needed |
| WhatsApp Business verification delays (10–15 days lead time) | Invoice-by-WhatsApp not ready at go-live | Feature-flagged WhatsApp sender (5.1); go-live proceeds on email-only invoicing, WhatsApp enabled later with zero redeploy |
| Legal pages (Refund/ToS/Privacy/Cancellation) not supplied in time | Go-live blocker (checkout must link to them) | Escalate early via Document 11 tracker; use a clearly-labeled "Coming Soon" interim page rather than launching with broken links, if absolutely necessary — flag to client as a compliance risk, not a silent default |
| Razorpay KYC/account setup delay | Payments can't go live | Start this the moment the contract is signed (Meeting 1 explicitly flagged this as an early action item); build and test against Razorpay **test mode** in parallel so backend work isn't blocked |
| Overbooking under concurrent load | Data integrity / customer trust | Advisory-lock design (Document 04 4.1) tested explicitly with a concurrency test (two simultaneous booking requests for the last slot) before go-live |
| Scope creep from meeting-only ideas (affiliate, AI chatbot, full accounts) | Budget/timeline overrun | Document 01 14 guardrail; any such request logged as a Change Request, not silently built |
