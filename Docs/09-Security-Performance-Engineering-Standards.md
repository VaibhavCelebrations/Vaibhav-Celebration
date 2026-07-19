# 09 — Security, Performance & Engineering Standards

**Owner:** Shubham Deshmukh (enforced across all three repos)
**Applies to:** `frontend/`, `admin/`, `backend/`, `cdn/`
**Governs:** SOW 35–37 ("reasonable industry-standard security practices"), Meeting 1's explicit security requirements

---

## 1. Security Philosophy

The client asked, unprompted, in Meeting 1 whether the admin panel would be publicly accessible and was visibly relieved to hear it would not be. Security here is not a checkbox exercise — it is a **stated client concern** and a genuine business risk (payment data, customer PII, GST-relevant invoices). This document codifies "enterprise-grade, cost-aware" security: every control below is either free or a marginal cost, and none requires an enterprise security-vendor contract — the goal is disciplined engineering, not budget expansion.

---

## 2. OWASP-Aligned Controls Checklist

| # | Control | Where Enforced |
|---|---|---|
| 1 | **Injection prevention** — parameterized queries only, via Prisma; never raw string-concatenated SQL | `backend/` |
| 2 | **Broken auth prevention** — short-lived JWT (~15 min), httpOnly rotating refresh cookie, bcrypt/argon2 password hashing (cost factor ≥ 12), account lockout/backoff after repeated failed logins | `backend/` |
| 3 | **Sensitive data exposure** — no card data ever touches our servers (Razorpay Checkout handles PCI scope), DB connection strings/API secrets never in client bundles, HTTPS enforced everywhere (HSTS header) | `backend/`, `cdn/`, Vercel/Render config |
| 4 | **XML/XXE** — not applicable (no XML parsing in this stack); confirmed absent as a category | n/a |
| 5 | **Broken access control** — every admin route re-checks role server-side; guest tokens are scoped to a single `referenceCode`, never a blanket "any booking" token; ownership checks on every guest-mutating endpoint (an owner token for Booking A can never mutate Booking B) | `backend/` middleware |
| 6 | **Security misconfiguration** — `helmet` defaults reviewed and tightened (CSP, `X-Frame-Options: DENY` on admin, `Referrer-Policy`), verbose error stack traces never returned to clients in production, dependency versions kept current | `backend/`, `frontend/`, `admin/` |
| 7 | **XSS** — React's default escaping relied upon; any `dangerouslySetInnerHTML` use (rich-text blog/legal content) passes through a sanitizer (e.g., `sanitize-html`/`DOMPurify` server-side before storage or client-side before render) before rendering | `frontend/`, `admin/`, `backend/` |
| 8 | **Insecure deserialization** — all input parsed as JSON via Express's built-in parser with size limits; no custom deserialization of untrusted class instances | `backend/` |
| 9 | **Using components with known vulnerabilities** — `npm audit`/`pnpm audit` run in CI on every PR; Dependabot (or equivalent) enabled on all three repos (GitHub-native, free) | CI/CD |
| 10 | **Insufficient logging & monitoring** — structured logs, audit log table (Document 03 3.1), error tracker (Document 02 11), failed-login and failed-OTP attempts specifically logged and rate-limited | `backend/` |

---

## 3. Application-Layer Controls (Beyond the OWASP List)

### 3.1 CORS Policy
- `backend/` CORS allowlist contains **exactly**: production frontend domain, production admin domain, their Vercel preview-deployment patterns (scoped, not `*`), and `localhost` ports for local dev only in non-production environments.
- Never `Access-Control-Allow-Origin: *` on any authenticated route.

### 3.2 Rate Limiting (concrete thresholds, extending Document 04 11)
- Implemented via an in-memory or Redis-backed limiter (in-memory is acceptable at MVP scale given a single backend instance; revisit if horizontally scaled).
- Applied at the Express middleware layer **and** reinforced at Cloudflare's edge (free-tier rate-limiting rules) for defense-in-depth against volumetric abuse before it even reaches the Node process.

### 3.3 Input Validation
- Every route handler's `body`/`query`/`params` is validated by a Zod schema **before** any business logic executes. Reject-early, fail-loud-in-logs, fail-clean-to-client (`400` with field errors, never a stack trace).
- File uploads: strict MIME-type allowlist (`image/webp`, `image/jpeg`, `image/png`, `video/mp4`, `application/pdf` as applicable per module), size caps, and — since these files are user/admin-supplied — treated as untrusted until validated, never executed/interpreted server-side.

### 3.4 Secrets Management
- All secrets live in platform-native environment variable stores (Vercel Project Settings, Render Environment Group) — **never** committed to git, **never** placed in a `NEXT_PUBLIC_*` variable unless it is genuinely safe to expose (e.g., a public GA4 measurement ID).
- `.env.example` in every repo documents required variable **names** only, never real values.
- A pre-commit hook (or CI step) scans staged diffs for common secret patterns (API key shapes, `BEGIN PRIVATE KEY`, etc.) as a low-cost safety net.
- Secret rotation policy: Razorpay/WhatsApp/SMTP/Cloudflare tokens rotated immediately if any team member offboards or if a leak is suspected; JWT signing secret rotation supported via a short grace-period dual-secret validation window if ever needed.

### 3.5 Payment & Webhook Integrity (recap from Document 04 6, elevated here as a security-critical control)
- Razorpay webhook signature verification is **mandatory** on every incoming webhook call; unsigned/invalid requests are rejected and logged as a potential attack signal, not silently ignored.
- Payment status is **never** written based on a client-side redirect/callback alone.

### 3.6 Guest Token Scope Discipline
- Every `guestAccessToken` issued by the Guest Verification Service (Document 04 2) encodes exactly one `referenceCode` + `referenceType` and a short expiry (e.g., 20–30 minutes) — long enough for a legitimate self-service session, short enough to limit exposure if leaked (e.g., via a shared screenshot).
- OTP attempts are capped (Document 03 3.1 `attemptCount`) and the token invalidated after repeated failures, forcing a fresh OTP request rather than allowing unlimited guesses.

### 3.7 Admin Panel Hardening (recap from Document 08 8)
- Separate subdomain, `noindex`, never linked publicly.
- Optional IP allowlist on login.
- Session invalidation on logout (refresh cookie actively revoked server-side, not just cleared client-side).

---

## 4. Data Access Layer Conventions

- **Soft-delete middleware** (Document 03 6.1) is applied globally at the Prisma client level so no individual query can "forget" to filter deleted rows — a systemic guarantee, not a per-query discipline.
- **Money as integer paise everywhere**, with a single shared formatting utility per app (duplicated as tiny pure functions across `frontend`/`admin`/`backend` rather than a shared package, since the function is ~5 lines and a shared internal package adds more build complexity than it saves at this project size).
- **Transactions for anything involving inventory or capacity** (Document 04 4.1, 8.1) — no "read then write" pattern without a lock/transaction wrapping both steps.
- **Price snapshotting** — every `BookingCustomization`/`OrderItem` stores the price *at the time of purchase*, never a live join to the current `PackageCustomizationOption`/`Product` price, so historical invoices remain accurate even after the admin changes prices later.

---

## 5. Performance Budget & Standards

| Metric | Target | Applies To |
|---|---|---|
| Lighthouse Performance (mobile) | ≥ 85 | Homepage, Theme detail, Package listing, Event landing page |
| Lighthouse SEO | ≥ 95 | All public pages |
| Lighthouse Accessibility | ≥ 90 | All public pages |
| Largest Contentful Paint | < 2.5s (mobile, simulated 4G) | Public pages |
| Cumulative Layout Shift | < 0.1 | Public pages |
| API p95 response time | < 400ms | Read endpoints under normal load |
| API p95 response time (booking/checkout writes) | < 800ms | Write endpoints, accounting for Razorpay round-trip excluded |

### 5.1 How These Targets Are Achieved
- **Image discipline:** all uploaded media served via Cloudflare with automatic WebP conversion + responsive `srcset` sizing (Next.js `<Image>` component wired to the Cloudflare loader) — no unoptimized full-resolution images ever shipped to a mobile viewport.
- **Rendering strategy discipline:** ISR for content pages, dynamic only where live data (availability/inventory/pricing) genuinely requires it (Document 02 3.1) — the temptation to make everything SSR "to be safe" is explicitly rejected as an anti-pattern here.
- **Bundle hygiene:** avoid pulling heavy client-side libraries for admin-only concerns into the public `frontend` bundle; keep the rich-text editor, charting, etc. scoped to `admin/` only.
- **Database indexing:** every foreign key and every field used in a `WHERE`/`ORDER BY` on a list screen is indexed (Document 03 6.4); query plans (`EXPLAIN ANALYZE`) spot-checked on the booking-availability and product-listing queries specifically, since those are the highest-traffic, most latency-sensitive reads.
- **CDN cache headers:** long `max-age` + `stale-while-revalidate` on immutable media; short/no-cache on live-availability and live-inventory API responses.

---

## 6. Coding Standards

- **TypeScript strict mode** enabled in all three repos (`"strict": true` in `tsconfig.json`) — non-negotiable for a 3-person team shipping across three codebases in parallel.
- **Shared lint/format config** (ESLint + Prettier, or Biome as a lighter-weight alternative) consistent across `frontend`/`admin`/`backend` so code review isn't spent on style bikeshedding.
- **No `any` without a documented reason** — a lint rule (`@typescript-eslint/no-explicit-any` set to `warn` minimum, `error` recommended for new code) keeps the type-safety benefit real rather than nominal.
- **Zod schemas as the single source of truth for both validation and TypeScript types** on the backend (`z.infer<typeof schema>`) — avoids maintaining a parallel hand-written interface that silently drifts from the actual validated shape.
- **Consistent API client pattern** on `frontend`/`admin` (a single typed fetch wrapper per app, Document 02 3.1/3.2) — no ad hoc `fetch()` calls scattered through components.
- **Component naming & folder conventions** aligned with Next.js App Router idioms (`page.tsx`, `layout.tsx`, colocated `_components/` where a component is truly page-local, shared components promoted to `src/components/`).
- **No secrets, no business-critical constants hardcoded** — GST%, capacity defaults, validity windows, etc. are `OperationalSetting` reads, not literals (Document 03 3.9) — enforced by code review discipline since this can't be fully lint-enforced.

---

## 7. Testing Strategy (Right-Sized for a 3-Person Team, 3-Phase Timeline)

Full enterprise test pyramids are not proportionate to this budget/timeline — the goal is **targeted, high-value automated coverage** on the modules where a bug is expensive, plus disciplined manual QA everywhere else:

| Priority | Module | Test Approach |
|---|---|---|
| **Critical — automated** | Pricing engine (`/pricing/quote`) | Unit tests covering base price, single option, multiple options, zero-quantity edge cases, theme price override |
| **Critical — automated** | Booking capacity/locking | Concurrency test simulating simultaneous requests for the last slot on a date |
| **Critical — automated** | Inventory-safe checkout | Concurrency test simulating simultaneous checkout for the last unit of stock |
| **Critical — automated** | Payment webhook signature verification | Unit test rejecting an unsigned/tampered payload |
| **High — automated** | Guest Verification (OTP) flow | Unit + integration test for happy path, expired OTP, attempt-cap lockout |
| **High — manual, scripted** | Full booking journey, e-commerce checkout, gift registry journey | Documented manual test scripts run before each phase go-live (Documents 05/06/07 "QA" sections) |
| **Medium — manual** | CMS/CRM CRUD screens | Smoke-tested per module on completion; not unit-tested individually given the repetitive, low-logic-density nature of CRUD forms |
| **Low — spot-checked** | SEO/schema output | Validated via Google's Rich Results Test + Lighthouse before go-live, not continuously automated |

---

## 8. Environments & Secrets — Practical Checklist

- [ ] `.env.example` present and current in all three repos.
- [ ] Local dev uses a dedicated dev database (never a shared prod-adjacent DB for local experimentation).
- [ ] Staging environment variables are genuinely separate values from production (especially Razorpay test vs. live keys — a "test key in production" or vice-versa is a classic, avoidable incident).
- [ ] All three developers have least-privilege access to production secrets (only Shubham as Lead needs full production secret access day-to-day; Vishal/Chaitanya work against staging).

---

## 9. Pre-Go-Live Checklist (Referenced by Documents 05/06/07)

- [ ] `helmet` CSP reviewed and tightened for production domains (not left on permissive defaults).
- [ ] CORS allowlist contains only real production/preview origins.
- [ ] `npm audit`/`pnpm audit` clean (or documented accepted-risk exceptions) on all three repos.
- [ ] Rate limits verified live (not just present in code) via a quick manual burst test.
- [ ] Admin panel confirmed unreachable from any public-site link, confirmed `noindex`.
- [ ] Secret scan run on the full repo history before making any repo public (if ever relevant) — not applicable if repos stay private, but worth a one-time check.
- [ ] Backup restore drill completed and documented (Document 02 10).
- [ ] Error tracker and uptime monitor confirmed receiving events from production.
- [ ] Razorpay webhook confirmed reachable and signature-verified against a real test transaction in live mode before full go-live.
- [ ] Load/traffic smoke test appropriate to the client's stated ~50 users/month expectation (Meeting 1) — not an enterprise load test, but enough to catch obvious regressions under light concurrent load.

---

## 10. Ongoing Engineering Hygiene (Post-Launch)

- Dependency updates reviewed monthly (not left to accumulate — reduces the "known vulnerable component" risk category continuously rather than in a single pre-launch sweep).
- Quarterly security/config audit suggested to the client during the free-support window and beyond (Meeting 1: *"I suggest to do the audit each three or four months"*) — not a mandatory paid AMC feature, but a recommended cadence documented here so it isn't forgotten.
- Audit log retention reviewed periodically to ensure it remains useful (not excessively pruned) without becoming an unbounded storage cost.
