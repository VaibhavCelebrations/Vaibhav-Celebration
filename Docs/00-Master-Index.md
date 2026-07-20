# 00 — Master Index: Vaibhav Celebrations Development Documentation Suite

**Project:** Vaibhav Celebrations — Website Redevelopment, Booking Platform, E-Commerce & Gift Registry
**Delivery Partner:** Affor Technologies
**Team:** Shubham Deshmukh (Lead & Backend Developer) · Vishal (Frontend & UI/UX Developer) · Chaitanya (Admin Panel UI/UX Developer)
**Governing Contract:** Scope of Work v1.1 (17 July 2026)
**Repos:** `frontend/` (Next.js) · `admin/` (Next.js) · `backend/` (Node/Express) · `cdn/` (Cloudflare config)

---

## How This Suite Was Built

This documentation was produced by synthesizing three source materials:

1. **SOW v1.1** — the binding contract defining scope, deliverables, exclusions and commercial terms.
2. **Two client discovery calls** — Meeting 1 (initial scope walkthrough: packages, booking flow, payments, WhatsApp/invoicing, admin panel, infra, IP/ownership) and Meeting 2 (deep dive on Phase 2 E-Commerce and Phase 3 Gift Registry, plus CRM/CMS dashboard clarification).
3. **Content & SEO Guide v1.0** — the content strategy and technical SEO reference.

Every functional or technical decision in Documents 01–11 is traceable to one of these three sources, and every document is explicit about **which source governs** when there's any tension (short answer: the SOW always wins — see Document 01 41/Document 01's own framing). This suite intentionally engineers slightly **above** the SOW's literal minimum on security, code quality and UI polish (an "enterprise-grade" delivery bar, as requested), while never expanding the **committed scope** beyond what's contractually agreed — new ideas surfaced only in the meetings and not reflected in the final SOW are explicitly flagged as Change Request candidates, not built silently.

---

## Document Index

| #                                                        | Document                                                      | What It Answers                                                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [00](./00-Master-Index.md)                               | **Master Index (this document)**                              | "Where do I find X?"                                                                                        |
| [01](./01-Executive-Summary-and-SOW-Alignment.md)        | Executive Summary, SOW v1.1 Alignment & Commercial Governance | What are we building, why, for how much, in what phases, and what is explicitly excluded?                   |
| [02](./02-System-Architecture-and-Infrastructure.md)     | System Architecture & Infrastructure Blueprint                | How are the 3 repos deployed, secured, and connected? What hosting/CDN/third-party stack, and at what cost? |
| [03](./03-Database-Schema-and-Data-Model.md)             | Database Schema & Data Model (Phase 1→3)                      | What does every table look like, across all three phases, and how do they relate?                           |
| [04](./04-Backend-API-Specification.md)                  | Backend API Specification                                     | What are the exact endpoints, auth rules, request/response shapes, error codes?                             |
| [05](./05-Phase-1-MVP-Development-Plan.md)               | Phase 1 — MVP & Core Platform Development Plan                | What gets built first, in what order, by whom, and how do we protect the August event deadline?             |
| [06](./06-Phase-2-Ecommerce-Development-Plan.md)         | Phase 2 — Independent E-Commerce Development Plan             | How does the shop, inventory engine, and cross-linking with packages actually work?                         |
| [07](./07-Phase-3-Gift-Registry-Development-Plan.md)     | Phase 3 — Gift Registry Development Plan                      | How does the private registry, guest reservation flow, and duplicate-prevention mechanism work?             |
| [08](./08-Admin-Panel-CMS-CRM-Specification.md)          | Admin Panel (CMS + CRM) Functional & Technical Specification  | What does every Admin screen do, across all phases, and who can access what?                                |
| [09](./09-Security-Performance-Engineering-Standards.md) | Security, Performance & Engineering Standards                 | What are the concrete security/performance/coding rules every PR must satisfy?                              |
| [10](./10-Content-SEO-Analytics-Implementation-Guide.md) | Content Strategy, SEO & Analytics Implementation Guide        | How does the Content & SEO Guide v1.0 map onto real CMS fields, schema markup, and analytics events?        |
| [11](./11-Team-Workflow-Timeline-RACI-Governance.md)     | Team Workflow, Timeline, RACI & Delivery Governance           | Who owns what, what's the timeline, how do we track client dependencies and change requests?                |
| [12](./12-Twilio-WhatsApp-Integration-Guide.md)          | Twilio WhatsApp Integration Guide                             | How to set up Twilio for sending WhatsApp messages and what details we need for the backend?                |
| [13](./13-Project-Tracker.md)                            | Centralized Project Tracker & Milestones                      | Live task statuses across all phases                                                                        |
| [14](./14-Secrets-Rotation-Policy.md)                    | Secrets Rotation Policy                                       | How to rotate JWT/Razorpay/WhatsApp/SMTP/Cloudflare secrets safely                                          |

---

## One-Page Project Snapshot

- **Architecture:** Guest-first (no mandatory login), Order/Booking-ID + Email-OTP self-service, strict frontend/admin/backend separation, backend is the only system touching the database.
- **Stack:** Next.js 16 + React 19 + Tailwind v4 (frontend & admin), Node.js + Express 5 + TypeScript + Prisma + PostgreSQL (backend), Cloudflare (CDN/media), Vercel (frontend/admin hosting), Render (backend/DB hosting), Razorpay (payments), Nodemailer + WhatsApp Cloud/Business API (notifications).
- **Phases:**
  - **Phase 1 (MVP):** Public website, theme/package experience, booking engine, checkout/payments, invoicing (email+WhatsApp), Admin CMS+CRM, booking calendar, static lead chatbot, SEO/analytics foundation. **Priority sub-goal: Go-Live Shell + Event Page ready before the client's early-August event.**
  - **Phase 2 (E-Commerce):** Independent shop, theme/category product taxonomy, inventory engine (stock caps, low-stock/out-of-stock/stale flags), personalization fields, cross-linking with package customization.
  - **Phase 3 (Gift Registry):** Private link+password registries tied to eligible packages, external-link metadata scraping with manual fallback, guest reservation/confirmation duplicate-prevention, 30-day expiry.
- **Team:** 3 developers, ~13-week indicative program across all three phases (Document 11 5).
- **Budget:** ₹50,000 total (deposit + 3 phase-completion milestones, Document 01 5 / Document 11 8).
- **Explicitly out of scope (do not build without a Change Request):** AI/LLM chatbot, full customer login/dashboard, affiliate integrations, native apps, advanced configurable RBAC, marketplace features — full list in Document 01 14.

---

## Reading Order by Role

- **New developer onboarding:** 00 → 01 → 02 → 03 → 04, then the phase document you're currently working on (05/06/07), then 08/09/10 as needed.
- **Shubham (Lead/Backend):** 01 → 02 → 03 → 04 → 05/06/07 (backend sections) → 09 → 11.
- **Vishal (Frontend/UI-UX):** 01 → 05/06/07 (frontend sections) → 04 (as API consumer) → 10 → 09 (performance/coding standards).
- **Chaitanya (Admin/UI-UX):** 01 → 08 → 05/06/07 (admin sections) → 04 (as API consumer) → 09 (coding standards).
- **Client/PM-facing:** 01 (executive summary) → 11 (timeline, dependencies, change requests).

---

## Living Document Notice

This suite is maintained throughout the project (Document 11 12). If you find an inconsistency between this suite and the signed SOW v1.1, the **SOW governs** — raise it with the Project Lead before proceeding on that specific item.
