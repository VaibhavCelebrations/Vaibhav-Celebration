# 11 — Team Workflow, Timeline, RACI & Delivery Governance

**Owner:** Shubham Deshmukh (Project Lead)
**Team:** Shubham (Lead/Backend), Vishal (Frontend/UI-UX), Chaitanya (Admin/UI-UX)
**Purpose:** The operational rulebook — how the three developers actually work together day to day, how progress is tracked against the SOW, and how client dependencies/changes are governed without derailing the build documented in Documents 01–10.

---

## 1. Roles & Responsibility Matrix (RACI)

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

## 2. Git Workflow

- **Branching model:** trunk-based with short-lived feature branches — `main` is always deployable.
  - Branch naming: `feature/<phase>-<module>-<short-desc>` (e.g., `feature/p1-booking-availability`), `fix/<short-desc>`, `chore/<short-desc>`.
- **Pull Requests:** every change lands via PR, even for the lead developer — no direct pushes to `main`. PR description references the relevant Document (e.g., "Implements Document 04 4.1 booking lock").
- **Code review:** minimum one reviewer per PR. Cross-repo reviews encouraged where a change touches the API contract (Shubham reviews any `admin`/`frontend` PR that consumes a new/changed endpoint, and vice versa when Vishal/Chaitanya spot an API ergonomics issue).
- **Commit style:** conventional-commit-flavored messages (`feat:`, `fix:`, `chore:`, `docs:`) — not strictly enforced by tooling at this scale, but followed as team discipline for a readable history.
- **CI gate:** typecheck + lint (+ the targeted automated tests from Document 09 7) must pass before merge.

---

## 3. Communication Cadence

| Cadence | Format | Purpose |
|---|---|---|
| Daily (async, e.g., WhatsApp/Slack thread) | Short status: yesterday/today/blockers | Keep 3-person team synced without meeting overhead |
| Weekly | 30-min sync (video/call) | Cross-module dependency check (e.g., "is the pricing-quote API ready for Vishal's checkout UI this week?") |
| Per sub-phase completion | Internal demo (team-only) before client demo | Catch integration issues before the client sees them |
| Per major deliverable | Client demo/review session | Drives the two-revision-cycle clock (SOW 42) — start the revision window explicitly at this point, don't let it drift |
| Ad hoc | Immediate escalation | Any blocking client dependency (Document 01 16) or scope-ambiguity question (Document 01 14 guardrail) |

**Meeting-notes discipline (Meeting 1 client request honored going forward):** every client-facing call gets a written summary shared with the client within 24 hours, distinct from this internal documentation set — this is a relationship/communication practice, not a code artifact, but it directly satisfies the client's explicit request in Meeting 1 (*"if you can document it... share it with us"*).

---

## 4. Definition of Done (Universal, Applied Per Task/Feature)

A task is **not done** until:
1. Code merged to `main` via reviewed PR.
2. Matches the relevant Document (03/04/05/06/07/08) spec, or the spec was explicitly and consciously updated alongside the code (docs and code never silently diverge).
3. Manually tested against the acceptance criteria in the owning phase document.
4. No new lint/typecheck errors; no new `npm audit` high/critical findings introduced.
5. Deployed to staging and smoke-tested before being marked ready for client review.
6. For CRM/CMS/E-commerce/Registry mutating endpoints: soft-delete convention followed, audit-log entry written where applicable (Document 03 6.1, Document 09 4).

---

## 5. Master Timeline (Indicative — Adjust Live Against Actual Client Dependency Delivery)

```
Week 1        : Phase 1.0 Foundation + Phase 1.1 Go-Live Shell begins
Week 2        : Phase 1.1 completes (AUGUST EVENT GATE) | Phase 1.2/1.3 begin
Week 3        : Phase 1.2/1.3/1.4 in progress
Week 4        : Phase 1.4/1.5/1.6 in progress
Week 5        : Phase 1.6/1.7 — hardening, UAT
Week 6        : Phase 1 GO-LIVE
--- Phase 1 milestone invoice point ---
Week 7        : Phase 2.0/2.1 begin
Week 8        : Phase 2.1/2.2/2.3 in progress
Week 9        : Phase 2.4/2.5 in progress
Week 10       : Phase 2.6 — QA, GO-LIVE
--- Phase 2 milestone invoice point ---
Week 11       : Phase 3.0/3.1/3.2 begin
Week 12       : Phase 3.3/3.4 in progress
Week 13       : Phase 3.5 — QA, GO-LIVE, project handover
--- Phase 3 milestone invoice point / start of 2-month free support window ---
```

This is a **~13-week / ~3-month** indicative program across all three phases. The single hardest external date is the **Week 2 August-event gate** — everything in the timeline is sequenced so that date is protected even if later weeks slip due to client-dependency delays (Document 05 12 risk register).

---

## 6. Client Action Requirements & Dependency Tracker (Living Document — Template Below)

Populate and maintain this table for the life of the project (referenced from Document 01 16):

| # | Item Needed | Requested Date | Needed By (Sprint) | Status | Blocking |
|---|---|---|---|---|---|
| 1 | Repository/codebase access | — | Week 1 | Received | 1.0 |
| 2 | Domain access | — | Week 1 | Pending | 1.0 (DNS) |
| 3 | Theme info, assets, package preview assets, Return Gift assets | — | Week 1–2 | Pending | 1.1, 1.3 |
| 4 | Package details, prices, inclusions | — | Week 1–2 (**urgent**) | Pending | 1.2, 1.3 |
| 5 | Event content (August event) | — | Week 1 (**urgent**) | Pending | 1.1 |
| 6 | Legal policies (Refund/ToS/Privacy/Cancellation) | — | Week 4 | Pending | 1.7 go-live gate |
| 7 | GST information | — | Week 3 | Pending | 1.2 |
| 8 | Razorpay account + credentials + webhook | — | Week 1 (**urgent**) | Pending | 1.2 |
| 9 | WhatsApp Business number + Meta verification | — | Week 1 (10–15 day lead time) | Pending | 1.2 (degrade gracefully if late) |
| 10 | Analytics account access (GA4/GSC/Pixel/GTM) | — | Week 4 | Pending | 1.6 |
| 11 | Product info/images/inventory (Phase 2) | — | Phase 2 kickoff | Not yet due | 2.0, 2.1 |
| 12 | Gift Registry retention-policy confirmation (Phase 3) | — | Phase 3 kickoff | Not yet due | 3.4 |

*(Team should keep this table current in whatever project-tracking tool is actually used day-to-day — this markdown table is the canonical template/snapshot, not necessarily the live working copy.)*

---

## 7. Change Request Log (Template)

Per Document 01 14/41 — anything requested that isn't in SOW 1–39 gets logged here, not silently built:

| # | Date | Requested By | Description | Traced To (Meeting/Doc) | In SOW? | Decision | Impact if Approved |
|---|---|---|---|---|---|---|---|
| 1 | — | Client | Amazon affiliate integration | Meeting 2 | No (SOW 33/40 excludes) | Deferred | Additional research + separate scope/budget |
| 2 | — | Client | AI/LLM chatbot | Meeting 2 | No (SOW 11/40 excludes) | Deferred | ~₹40–50k additional per client-communicated context; separate scope |
| 3 | — | Client | Full permanent customer login/dashboard | Implied by various discussions | No (SOW 4/40 excludes) | Not building | Would require redesigning the guest-first architecture in Document 02 |

Add rows as real requests arise during development; use this exact structure so every entry is traceable back to its source and its scope decision.

---

## 8. Commercial Milestone Tracker (Informative — See Document 01 5 Governance Note)

| Milestone | Amount | Trigger | Status |
|---|---|---|---|
| Deposit | ₹15,000 | Contract signed / project kickoff | — |
| Phase 1 completion | ₹20,000 | Phase 1 go-live sign-off | — |
| Phase 2 completion | ₹7,500 | Phase 2 go-live sign-off | — |
| Phase 3 completion | ₹7,500 | Phase 3 go-live sign-off / start of free-maintenance window | — |
| **Total** | **₹50,000** | | |

Finance/PM confirms this schedule in writing with the client independently of this engineering document (Document 01 5 note applies).

---

## 9. Revision vs. Change Request Discipline (SOW 42 Enforcement)

For every client-requested change during a phase's UAT window, classify it explicitly before actioning:
- **Revision** = adjustment to an already-approved requirement/design (e.g., "make this button green instead of blue," "move this section up"). Up to **two** revision cycles per major UI deliverable.
- **Change Request** = new module, new workflow, materially different functionality, major redesign. Logged in 7 above, impact communicated before work starts (SOW 41).

Track revision-cycle count per major deliverable (Homepage, Theme template, Package/Checkout flow, Admin CMS, Admin CRM, Shop, Gift Registry) so nobody accidentally provides a "third free revision" without a conversation.

---

## 10. Handover Package (End of Phase 3 / Project Completion)

Per SOW 55/Meeting 1 (IP rights assignment) and SOW 44 (support window), final handover includes:
1. Full source code in client-owned GitHub repositories (already the case, since Affor works within the client's own repo/org from day one where possible, or transfers ownership at completion).
2. All environment variables/secrets securely transferred to client-controlled accounts (Razorpay, WhatsApp, Cloudflare, Vercel, Render, SMTP, analytics) — client owns every third-party account per Document 01 12.
3. This 11-document `/Docs` suite, kept current through the project, as the technical handover documentation (satisfies SOW 38's "agreed technical handover" deliverable).
4. A short **Admin User Guide** (can be authored as a 12th lightweight document or a recorded walkthrough video, per client preference) covering day-to-day CMS/CRM usage — distinct from this engineering documentation, aimed at the client's non-technical staff.
5. Written confirmation of the 2-month complimentary support window start date and scope boundaries (SOW 44).
6. IP assignment documentation per the signed contract.

---

## 11. Post-Launch Support Workflow (2-Month Window, SOW 44)

- Bug reports/minor-adjustment requests channeled through a single tracked intake (issue tracker or the same WhatsApp group used during development) — triaged by Shubham as Lead.
- Every intake item classified: **Bug** (in scope, fix free), **Minor Adjustment** (in scope, free), **New Feature/Integration/Redesign** (out of scope of free support — logged as a Change Request or a future paid engagement item, per SOW 44's explicit exclusions).
- A lightweight weekly summary to the client during this window keeps expectations aligned on what's been fixed vs. what's been logged as future work.

---

## 12. Document Suite Maintenance

This documentation suite (`/Docs`) is a **living reference**, not a one-time deliverable frozen at kickoff:
- Any material design decision made during development that deviates from a document here must update that document in the same PR/work session — stale docs are actively harmful to a 3-person parallel team.
- Document 03 (Schema) and Document 04 (API) are the two most likely to need live updates as implementation reveals edge cases — treat schema/API changes as requiring a doc update as part of the Definition of Done (4 above), not a follow-up task that gets forgotten.
