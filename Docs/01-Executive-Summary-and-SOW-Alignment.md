# 01 — Executive Summary, SOW v1.1 Alignment & Commercial Governance

**Project:** Vaibhav Celebrations — Website Redevelopment, Booking Platform, E-Commerce & Gift Registry
**Client:** Vaibhav Celebrations (Client Representative: Charu Saxena)
**Delivery Partner:** Affor Technologies (Project Lead: Shubham Deshmukh)
**Governing Contract Document:** Scope of Work v1.1, dated 17 July 2026
**Document Status:** Living engineering reference — derived from SOW v1.1, discovery calls (Meeting 1 — Scope Walkthrough, Meeting 2 — Phase 2/3 Deep Dive), and the Content & SEO Guide v1.0
**Document Owner:** Shubham Deshmukh (Lead / Backend Engineer)
**Contributors:** Vishal (Frontend & UI/UX Engineer), Chaitanya (Admin Panel UI/UX Engineer)

> **How to read this document set:** This is document **1 of 11** in the `/Docs` development documentation suite. It is the "constitution" of the project — every other document (architecture, database, API, phase plans, admin panel spec, security standards, SEO guide, team workflow) must remain consistent with what is written here. Where any other document appears to conflict with the SOW, **the SOW v1.1 governs**, per its own Document Hierarchy clause (Section 41 of the SOW). This documentation set intentionally builds slightly above the literal minimum of the SOW in engineering rigor, security posture and UI/UX polish ("enterprise-grade delivery") — but it never *reduces* or *bypasses* the committed scope, exclusions or budget guardrails defined in the SOW.

---

## 1. Purpose of the Documentation Suite

Affor Technologies is redeveloping the Vaibhav Celebrations digital platform as a three-repository, three-phase, three-engineer program:

| Repo | Framework | Purpose |
|---|---|---|
| `frontend/` | Next.js 16 (App Router, React 19, Tailwind v4) | Public customer-facing website |
| `admin/` | Next.js 16 (App Router, React 19, Tailwind v4) | Admin Panel — integrated CMS + CRM |
| `backend/` | Node.js + Express 5 + TypeScript | Core API, booking/commerce engine, auth, integrations |
| `cdn/` | Config + scripts | Cloudflare CDN / media delivery configuration, image pipeline |

This suite of 11 documents exists so that three engineers working largely in parallel (Backend Lead, Frontend, Admin Panel) can build **without ambiguity**, without re-litigating decisions already made in client meetings, and without silently expanding scope beyond what was commercially agreed. Every functional decision below traces back to one of three sources:

1. **SOW v1.1** (the contract) — authoritative for scope boundaries, inclusions/exclusions, deliverables, and commercial terms.
2. **Meeting 1 (Scope Walkthrough)** and **Meeting 2 (Phase 2/3 Deep Dive)** — authoritative for *why* a feature works the way it does, and for operational/business rules that the SOW deliberately leaves open for configuration (e.g., booking capacity, gift registry validity, chatbot depth).
3. **Content & SEO Guide v1.0** — authoritative for content structure, keyword strategy, schema strategy and editorial workflow.

Where meeting discussion proposed functionality that is **not** reflected in the final SOW (e.g., Amazon affiliate integration, AI chatbot, full customer accounts), this suite explicitly marks it **Out of Scope / Future Change Request**, per SOW Section 40 and the Document Hierarchy clause (Section 41). This protects both the client relationship and the delivery team from silent scope creep while still documenting the client's future intent so Phase 4+ can be scoped quickly later.

---

## 2. Project Objective (SOW 2)

Transform the existing Vaibhav Celebrations website into a scalable digital business platform supporting: celebration/event discovery, theme exploration, package selection/comparison/customization, custom consultation requests, date availability & booking, online payments, automated booking confirmation & invoicing, customer/booking management, website content management, lead collection, independent e-commerce shopping, product/inventory management, Gift Registry, and SEO/analytics readiness — delivered across **three phases**.

### 2.1 Architecture in One Sentence
A **guest-first**, **Order-ID-verified** commerce and booking platform, with a strict separation between a fast/SEO-optimized public website, a security-hardened admin control plane, and a backend that acts as the only party ever allowed to talk to the database.

---

## 3. The Four Architectural Pillars (SOW 3)

| Pillar | What it is | Primary Owner |
|---|---|---|
| **A. Customer-Facing Website** | Public Next.js site — theme discovery, packages, gallery, events, blog, booking journey, checkout | Vishal (Frontend/UI-UX) |
| **B. Booking & Commerce Engine** | Backend logic for availability, package customization pricing, payments (Razorpay), orders, invoices, e-commerce transactions | Shubham (Backend Lead) |
| **C. Admin Panel — Integrated CMS + CRM** | One authenticated dashboard; CMS tab manages content, CRM tab manages customers/leads/bookings | Chaitanya (Admin UI/UX) + Shubham (APIs) |
| **D. Gift Registry Module (Phase 3)** | Private, link-based curated gift list system | Shubham (engine) + Vishal (guest-facing pages) + Chaitanya (owner/admin views) |

These four pillars map 1:1 onto the four repositories already scaffolded (`frontend`, `admin`, `backend`, `cdn`), confirming the existing project structure is correct and requires no restructuring before development begins.

---

## 4. Customer Account & Authentication Philosophy (SOW 4)

This is the single most important architectural decision in the entire project and it must be respected by every module built in all three phases.

**There is no traditional customer login/registration/dashboard system.** The platform is **guest-first**:

1. Customer completes a booking or an eligible e-commerce purchase **without creating an account**.
2. System generates a unique **Booking ID** and/or **Order ID** (human-readable, e.g. `VBC-BK-2026-000123` / `VBC-OR-2026-000456`).
3. If the customer later needs to view/manage that record, the verification flow is:

```
Enter Booking/Order ID → Verify Registered Email → Receive Email OTP → Enter OTP → Access Eligible Booking/Order Information
```

4. **Email OTP is the implemented mechanism.** WhatsApp OTP is explicitly **not** a committed feature (Meeting 2: cost of ~₹1–2 per WhatsApp utility message makes it commercially unattractive at MVP scale; Node Mailer/SMTP email OTP has effectively zero marginal cost). WhatsApp OTP may be evaluated later as a paid Change Request.
5. This same **Order-ID + Email-OTP** pattern is reused, unmodified, for:
   - Editing/viewing a booking (Phase 1)
   - Managing an e-commerce order (Phase 2)
   - Accessing and configuring an owned Gift Registry (Phase 3)

Building one hardened, reusable "Guest Access Verification" backend service in Phase 1 is therefore a **foundation-setting task**, not a Phase-1-only feature — see Document 05 (Phase 1 Plan) "Foundation Services" and Document 04 (API Spec) "Guest Verification Service".

---

## 5. Phase Structure & Budget Envelope

The SOW and both discovery meetings agree on a **three-phase program**, and the discovery meetings additionally recorded the commercial envelope and milestone intent (informative — the SOW commercial figure governs):

| Phase | Scope Theme | Meeting-Referenced Milestone Amount | SOW Reference |
|---|---|---|---|
| **Phase 1 — MVP & Core Platform** | Website + Booking Engine + Admin CMS/CRM + Payments + Invoicing + SEO foundation + static chatbot | ₹15,000 deposit + ₹20,000 on Phase 1 completion | SOW 5–18 |
| **Phase 2 — Independent E-Commerce** | Standalone shop, products, inventory, personalization, cross-linking | ₹7,500 on Phase 2 completion | SOW 19–24 |
| **Phase 3 — Gift Registry** | Private registry links, guest reservation flow, duplicate-prevention | ₹7,500 on final delivery / start of free maintenance | SOW 25–33 |
| **Total Project Value** | | **₹50,000** | SOW cover page |

> **Governance note:** The specific milestone split (15k/20k/7.5k/7.5k) was discussed operationally in Meeting 2 but is **not restated verbatim inside SOW v1.1**. It is retained here as the working commercial plan because it is the only concrete figure on record and it aligns with the three-phase deliverable structure. Finance/PM should confirm the exact milestone invoice schedule with the client in writing before raising Phase-1-completion invoices. This does not change engineering scope.

### 5.1 Why Phase 1 Must Ship Before Early August
Per Meeting 1, the client has a real event in the **first week of August** and explicitly deprioritized the Gift Registry and E-Commerce for Phase 1 in favor of:
- Homepage, core navigation, "basic website that requires to go live"
- **Event Page / Campaign Landing Page** functionality (client will run Google/Facebook ads pointing at this page)

**Engineering implication:** Within Phase 1, the **Event Page module** and the **public marketing site shell** (homepage, header/footer, theme pages, packages, contact) are the highest-priority sub-phase and must be sequenced first — see Document 05 "Sub-Phase 1.1: Go-Live Shell", which is explicitly timeboxed to land before the client's August event.

---

## 6. Package Structure (SOW 6, Meeting 1 & 2)

Three package tiers ship at Phase 1 launch (final names client-configurable via Admin Panel, but backend must not hardcode tier count as exactly 3 forever — model as an admin-manageable list, defaulting to 3 seeded tiers):

| Tier (default names) | Position | Special Behaviour |
|---|---|---|
| **Standard** | Entry tier | No Gift Registry access by default (Meeting 2) |
| **Premium** | Middle tier | Marked "Most Popular / Recommended" with a visual badge/pip (Meeting 2 — client explicitly wants this to be the best-selling tier); **Gift Registry included** |
| **Luxe** | Top tier | Full inclusions; **Gift Registry included** |

Each package is a configurable bundle of:
- Title, price, display order, visibility flag
- Feature/deliverable list (Digital Invite, Video Invite, Parent Party Brief, Countdown Cards, Activity Kits, Return Gifts, etc.) with **quantities per item** (admin sets "2× Activity Kits, 5× Countdown Cards..." — this is exactly the Fiverr-gig-style configurator the client referenced in Meeting 1: *"like in fiverr when we creating a gig it shows the particular number... options you are able to choose"*)
- Optional add-on services with their own price/quantity rules, each flagged as applicable to specific package(s)
- A dedicated **"extra column"** in the pricing engine used specifically for **Package Customization** (Meeting 1 "customization for calculation, we will be using that column only") — see Document 03 "Package Pricing Engine" for the exact schema.

**Business rule captured from Meeting 2:** a customer on Standard who wants Gift Registry may be offered an **upgrade/add-on** path (admin-configured), rather than being hard-blocked. This must be modeled as a configurable eligibility rule, not a hardcoded `tier === 'premium'` check — see Document 03 "Gift Registry Eligibility".

---

## 7. Booking Capacity & Overbooking Prevention (SOW 8.1, Meeting 1)

Client asked directly in Meeting 1: *"What happens if three customers book the same day? How will the system stop overbooking?"* Shubham's answer, now formalized as an engineering rule:

- Admin Panel exposes a **"Max Bookings Per Day"** capacity setting (global default, overridable per specific date).
- The rule counts **all bookings that occupy that date**, regardless of whether their time windows are parallel or sequential — i.e., capacity is **per-day**, not per-time-slot, unless the client later asks for time-slot granularity (flagged as a Phase 1.x refinement decision, not Phase 1 MVP blocker).
- Additional configurable rules: blocked/unavailable dates, minimum advance-booking window (also reused for the Consultation flow, 9), and (future) per-time-slot rules if the client's workforce capacity is time-sensitive.
- The booking creation endpoint must be **transactionally safe** (DB-level locking or serializable transaction) so two simultaneous checkouts for the last available slot on a date cannot both succeed — see Document 04 "Booking Availability & Locking".

This is a concrete example of a *"logical and technical decision from chats"* that must be encoded as code, not just as a policy document — see Document 03 (schema: `booking_capacity_rules`) and Document 04 (API: `GET /availability`, `POST /bookings` with row-level locking).

---

## 8. Payments (SOW 12–13, Meeting 1 & 2)

- **Gateway:** Razorpay (client to register business account, complete KYC, generate test + live API keys, configure webhook endpoint).
- **Modes:** UPI, Cards, Wallets. **No COD.**
- **Payment structure:** Full payment upfront at checkout (client explicitly rejected partial/advance-deposit-plus-balance model in Meeting 1: *"the full payment needs to be done"*).
- **Fees (informative, client-borne, not part of dev budget per SOW 40):** Razorpay charges ~2% per transaction after an initial fee-free revenue threshold (~₹5,000 lifetime, per Meeting 1 anecdote — **must be confirmed against Razorpay's current published pricing before go-live**, do not hardcode this number into UI copy). Settlement T+1 to T+2 business days.
- **Refunds:** Handled via a backend webhook-driven refund flow once the system is live; refund initiation triggers a webhook from Razorpay confirming success/failure, settlement ~2 days.
- **GST:** Displayed as a separate line at checkout summary. Actual GST *rate/applicability* is a client-provided business input (client to confirm with their CA) — backend must treat GST rate as an **admin-configurable value**, not a hardcoded constant.

---

## 9. WhatsApp & Email Communication (SOW 18, Meeting 1 & 2)

- **Email (Node Mailer / SMTP):** Primary, low-cost channel. Used for: OTP delivery, invoice delivery, booking confirmations, consultation acknowledgements.
- **WhatsApp (Business/Cloud API, subject to Meta approval):** Used **only** for transactional invoice/booking delivery — not as a general inbox. Requires:
  - A **dedicated WhatsApp Business number** that has never been used as a personal/regular WhatsApp account, verified by Meta.
  - The client's existing personal number (already linked to Instagram/Facebook marketing) **cannot** be reused for this — a fresh number is required (Meeting 1, confirmed by client: *"I'll take another number, no problem"*).
  - The exact BSP/provider (Twilio WhatsApp API, Meta Cloud API directly, or an aggregator) is a **pending infrastructure decision** — Document 02 "WhatsApp Provider Decision" tracks this explicitly as an open item with a recommended default (Meta Cloud API direct, lowest per-message cost, no BSP markup) and a fallback (Twilio, faster to provision, higher per-message cost).
  - **Any WhatsApp messaging/session charges are a client-borne third-party cost**, per SOW 40 — never assume free-tier volume in capacity planning.
  - A pre-filled WhatsApp **enquiry CTA** (click-to-chat link with a predefined message) is a separate, simple, no-API feature that ships in Phase 1 regardless of Business API approval status.

---

## 10. Static Lead-Generation Chatbot (SOW 11, Meeting 2)

Explicitly **not** AI/LLM/NLP. A **predefined decision-tree widget**:
- Fixed set of questions and selectable options (client showed a reference implementation from a prior project in Meeting 2).
- Filters/qualifies visitors (e.g., "What are you looking for?" → Birthday Party / Return Gifts / Just Browsing → follow-up branch).
- Every completed flow writes a **Lead** record, visible in Admin CRM.
- Any future AI/LLM chatbot is explicitly flagged in the SOW as an out-of-scope item requiring ~₹40,000–50,000 of *additional* budget per the client/vendor discussion in Meeting 2 — this number is **client-communicated context only**, not a commitment, and must not be built now.

---

## 11. Data Governance Rules (SOW 16, Meeting 1)

- **Soft delete everywhere** for business-critical records (bookings, orders, customers, products, invoices, gift registries). Nothing is hard-deleted from an admin action; a `deletedAt` timestamp removes it from active views while retaining it for audit/legal/GST purposes.
- **Daily backups** — configured at the infrastructure layer (see Document 02 "Backup Strategy"). Per Meeting 1, backups can be enabled from day one since the marginal cost is low relative to the risk of pre-launch data loss during ad-driven traffic spikes (client will be running Google/Meta ads around launch).
- **Legal documents required from client before go-live** (SOW 39, Meeting 1): Refund Policy, Terms of Service, Privacy Policy, Cancellation Policy — required for DPDP Act alignment. These are **content**, not code, but the CMS must have a dedicated **Legal Pages** content type so they are editable without a developer, and the checkout flow must link to them (a hard blocker for go-live, tracked in Document 05 as a Phase 1 dependency/gate).

---

## 12. Infrastructure & Hosting Summary (SOW 34, Meeting 1)

Full detail lives in Document 02. Summary for commercial context:

| Layer | Provider | Notes |
|---|---|---|
| Frontend (`frontend/`) | Vercel | 100% uptime SLA target, best for Next.js + SEO |
| Admin (`admin/`) | Vercel (separate project, separate domain/subdomain, IP-agnostic access control) | Never linked from public site; not indexed |
| Backend (`backend/`) | Render (or equivalent Node host) | ~512MB RAM / shared CPU tier at MVP scale; acts as the **only** system with DB credentials |
| Database | PostgreSQL (managed, Render or equivalent) | Never publicly exposed; reachable only from backend's private network/VPC |
| CDN / Media | Cloudflare (CDN + Images/R2) | Free tier initially; image storage pricing to be confirmed before scale-up |
| WhatsApp API | TBD (Meta Cloud API default) | Client-borne messaging cost |
| Payments | Razorpay | Client-owned account; client-borne transaction fees |

**Estimated recurring infra cost:** ₹1,300–4,000/month at low traffic (Meeting 1 estimate), rising with backend RAM/CPU tier as traffic grows. All third-party/recurring hosting costs are **client-borne**, per SOW 40.

**Ownership:** All third-party accounts (hosting, domain, database, CDN, payments, analytics) are registered and owned by the **client**, not Affor Technologies. Source code and IP rights transfer to the client upon completion of all phases and the start of the free-maintenance period, per contractual documentation (SOW 55/Meeting 1).

---

## 13. SOW Deliverables Checklist (SOW 38)

This checklist is the single source of truth for "are we done yet" at final handover. Each item is cross-referenced to the document/phase where it is engineered:

- [ ] Production-ready customer-facing website — Doc 05
- [ ] Theme and package experience — Doc 05, Doc 03
- [ ] Package comparison and customization — Doc 05, Doc 03
- [ ] Booking and availability system — Doc 05, Doc 04
- [ ] Consultation request functionality — Doc 05
- [ ] Event Page functionality — Doc 05
- [ ] Guest checkout — Doc 05
- [ ] Online payment integration — Doc 05, Doc 04
- [ ] Booking/Order ID generation — Doc 04
- [ ] Invoice generation — Doc 05
- [ ] Email invoice delivery — Doc 05
- [ ] WhatsApp invoice delivery (subject to API readiness) — Doc 05
- [ ] Admin Panel — Doc 08
- [ ] Integrated CMS functionality — Doc 08
- [ ] Integrated CRM functionality — Doc 08
- [ ] Booking calendar — Doc 08
- [ ] Customer/lead management — Doc 08
- [ ] Static option-based lead-generation chatbot — Doc 05
- [ ] SEO/analytics integrations — Doc 10
- [ ] Phase 2 independent E-Commerce module — Doc 06
- [ ] Product management — Doc 06, Doc 08
- [ ] Inventory management — Doc 06
- [ ] Independent product checkout — Doc 06
- [ ] Phase 3 Gift Registry — Doc 07
- [ ] Private registry links — Doc 07
- [ ] Registry gift management — Doc 07
- [ ] Gift reservation/confirmation functionality — Doc 07
- [ ] Duplicate gift prevention mechanism — Doc 07
- [ ] Production deployment — Doc 02
- [ ] Agreed technical handover — Doc 11

---

## 14. Out of Scope (SOW 40) — Do Not Build Without a Signed Change Request

- AI/LLM-powered chatbot
- Full enterprise CRM platform (the CRM here is an integrated module inside the Admin Panel, not a standalone product)
- Full customer login/registration system and permanent customer dashboard
- Advanced employee/task management system
- Document vault
- Advanced marketing automation engine
- Advanced configurable RBAC system (Admin Panel ships with a **simple, fixed role set** — see Doc 08 — not a general-purpose permission builder)
- Native Android/iOS applications
- Marketplace/multi-vendor functionality
- Automated verification of purchases made on unrelated third-party websites (Gift Registry duplicate prevention is confirmation-based, not verified — see Doc 07)
- Guaranteed external product metadata extraction (best-effort Open Graph scraping only — see Doc 07)
- Amazon/third-party affiliate API integration (explicitly discussed and explicitly deferred in Meeting 2 — architecture in Doc 07 leaves an extension point but ships nothing)
- Ongoing paid ad management, ongoing SEO campaigns, guaranteed rankings
- Any third-party service/subscription cost, WhatsApp messaging charge, payment gateway fee, or hosting/infra recurring cost (all client-borne)
- Any major functionality not expressly defined in the SOW

**Engineering rule of thumb:** if a feature request during development traces only to a meeting transcript and not to the SOW body (Sections 1–39), treat it as a Change Request discussion item, log it in Document 11 "Change Request Log", and continue building the committed scope. Do not silently build it "since it's quick" — this exact anti-pattern is what SOW 41 (Document Hierarchy) exists to prevent.

---

## 15. Revisions, Testing & Support Windows (SOW 42–44)

- **Revisions:** Up to **two reasonable revision cycles** for major UI deliverables (note: Meeting 1 verbally mentioned "three free revisions" — the **finalized SOW states two**; the SOW governs). A revision = adjustment to an *already-approved* requirement/design. A new module/workflow/major redesign is a Change Request, not a revision.
- **Testing:** Internal testing before each deployment — functional, booking-flow, payment-integration, e-commerce-flow, gift-registry-flow, responsive/cross-browser, admin-workflow testing. Client reviews and signs off per deliverable. Third-party integration testing is gated on the client providing live/test credentials in time (see 16 below and Doc 11 "Client Dependency Tracker").
- **Support:** **Two months of complimentary post-launch support** (bug fixes on delivered functionality, technical assistance, minor adjustments/content help). Does **not** include new modules, redesigns, new integrations, or new functionality. Optional AMC discussed separately after the free window (no fixed AMC product exists yet — client explicitly asked and was told it's negotiated per-need, not a subscription).

---

## 16. Client Dependencies (SOW 39) — Blocking Items Tracker

Development velocity is directly gated on the client supplying, in a timely manner:

- Existing source code / repository access (already obtained — repos scaffolded)
- Domain access; branding assets
- Theme information, theme assets, package preview assets, Return Gift assets
- Package details, prices, inclusions (client explicitly asked to send these ASAP in Meeting 1 — this is the #1 real-world blocker for Phase 1 package/pricing engine work)
- Event content (urgent — needed for the August event landing page)
- Product information/images/inventory counts (Phase 2 blocker)
- Legal policies (Refund/ToS/Privacy/Cancellation) — go-live blocker
- GST information (client confirming with their CA)
- Razorpay account + live/test API credentials + webhook configuration
- WhatsApp Business/API requirements (dedicated number, Meta Business verification)
- Analytics account access (GA4, GSC, Meta Pixel, GTM — client is a digital marketer and will self-serve most of this, per Meeting 1)
- Timely UI/UX approvals within the 2-revision window

This list is operationalized into a live tracker in Document 11 "Client Action Requirements" so the PM/Lead can chase specific missing items against specific sprint dates rather than discovering blockers mid-sprint.

---

## 17. Document Map

| # | Document | Primary Audience |
|---|---|---|
| 00 | Master Index & How to Use This Suite | Everyone |
| **01** | **This document — Executive Summary & SOW Alignment** | Everyone, esp. PM/Client-facing |
| 02 | System Architecture & Infrastructure Blueprint | Shubham |
| 03 | Database Schema & Data Model | Shubham (impl.), Vishal/Chaitanya (reference) |
| 04 | Backend API Specification | Shubham (impl.), Vishal/Chaitanya (consumers) |
| 05 | Phase 1 — MVP Development Plan | All three |
| 06 | Phase 2 — E-Commerce Development Plan | All three |
| 07 | Phase 3 — Gift Registry Development Plan | All three |
| 08 | Admin Panel (CMS + CRM) Specification | Chaitanya (impl.), Shubham (APIs) |
| 09 | Security, Performance & Engineering Standards | All three |
| 10 | Content Strategy, SEO & Analytics Implementation Guide | Vishal, Marketing/Client |
| 11 | Team Workflow, Timeline, RACI & Delivery Governance | All three, PM |

---

## 18. Sign-off

This document set is the engineering interpretation of SOW v1.1. Any clause here that a reviewer believes contradicts the signed SOW should be raised immediately with the Project Lead before development proceeds on that item — per SOW 41, the signed SOW always wins.
