# 01 — Security Audit Report

**Project:** Vaibhav Celebrations — public website, admin panel, API
**Scope:** `backend/` (Express 5 API), `frontend/` (Next.js website), `admin/` (Next.js admin panel), deployment configuration, dependencies
**Audit date:** 27 September 2026
**Method:** manual code review of every request path (middleware → routes → services), dependency audit (`npm audit`), configuration review, and runtime verification of the fixes (unit tests, Docker builds, and a full docker-compose stack behind nginx).
**Out of scope:** penetration testing of production infrastructure, third-party platforms (Razorpay, Meta, Cloudflare, Neon), and social-engineering.

> The website's look, pages, URLs and behaviour were **not** changed by this work. Every change below is either invisible to visitors (headers, limits, validation) or additive (SEO files, Docker files).

---

## 1. Executive summary

The platform already had a solid foundation: validated environment, Zod input validation on routes, bcrypt (cost 12) password hashing, httpOnly cookies, account lockout, signature-verified payment/WhatsApp webhooks using constant-time comparison, log redaction, audit logging, soft deletes, DOMPurify sanitisation on blog/legal HTML, and an SSRF guard on the registry URL importer.

The audit found **21 issues**: **1 critical, 5 high, 9 medium, 6 low/informational**. **All 21 are fixed in this change set.** A small number of *recommendations* that need a business decision or would change behaviour are listed in §4 and are deliberately **not** applied.

| Severity | Found | Fixed |
|---|---|---|
| Critical | 1 | 1 |
| High | 5 | 5 |
| Medium | 9 | 9 |
| Low / Info | 6 | 6 |

**Verification performed**
- `tsc` clean in backend, frontend and admin (the frontend previously hid type errors — see SEC-12).
- 88 backend unit tests pass with **no** `.env` present (the same way CI runs them), including new tests for the CSRF origin guard and the upload allow-list.
- All three Docker images build; the full production stack (`docker-compose.prod.yml` + nginx + Redis + Postgres) starts healthy, applies every Prisma migration from an empty database, and was probed with `curl` (headers, CSRF block, rate limits, unknown host, dotfiles).
- `npm audit --omit=dev`: **frontend 0**, **admin 0**, **backend 3 (Prisma CLI tooling only — accepted, see SEC-06)**. Before: frontend 6 (1 critical), admin 37 (1 critical), backend 7.

---

## 2. Findings and fixes

Severity uses the usual likelihood × impact reading for *this* system (payments, customer PII, admin CMS).

### Critical

**SEC-01 — Critical vulnerability in Next.js (website + admin)**
Both apps ran Next.js 16.2.10, which carries a critical advisory (plus high-severity `postcss` and `sharp` transitive advisories).
*Fix:* upgraded to Next.js **16.3.6** (+ `eslint-config-next`), then `npm audit fix`. Admin's Tiptap editor packages (high ReDoS + prototype-pollution class issues) upgraded to 3.31.3. Frontend and admin now report **0** vulnerabilities.

### High

**SEC-02 — CORS trusted attacker-registerable origins with credentials**
`app.ts` accepted any origin matching `https://vaibhav-celebration*.vercel.app`. Anyone can create a Vercel project with a matching name, and because the API sends `Access-Control-Allow-Credentials: true`, that site could read authenticated API responses of a logged-in customer or admin.
*Fix:* the pattern is now **opt-in** via `ALLOW_VERCEL_PREVIEWS=true` (dev/staging only). Production start-up refuses to run if it is enabled. One shared function (`config/origins.ts`) drives both CORS and the CSRF guard so they cannot drift apart.

**SEC-03 — No CSRF protection while cookies are `SameSite=None`**
Customer and admin session cookies are `SameSite=None` (required for a separate-domain frontend). Browsers therefore attach them to cross-site requests, and `express.urlencoded` was enabled, so a hostile page could submit a plain HTML form (no CORS pre-flight) to state-changing endpoints.
*Fix:* new `originGuard` middleware rejects every `POST/PUT/PATCH/DELETE` whose `Origin` (or `Referer`) is not on the allow-list with `403 FORBIDDEN_ORIGIN`. Server-to-server calls with neither header (Next.js SSR, Razorpay/Meta webhooks) are unaffected — they are not browser-initiated and authenticate by other means. `urlencoded` was also tightened (`extended:false`, 100 kb).
*Verified:* a request with `Origin: https://evil.com` returns 403; the site's own origin passes.

**SEC-04 — SSRF via HTTP redirect in the registry image importer**
`rehostProductImage` validated the first URL against the private-network blocklist but then fetched with `redirect: "follow"`. A public URL could 302 to `169.254.169.254` (cloud metadata) or an internal service, and the response was stored as media.
*Fix:* redirects are followed manually (max 5) and **every hop** is re-validated with `assertSafePublicUrl`.

**SEC-05 — Stored XSS / memory exhaustion through media upload**
Uploads were accepted if the MIME type merely *started with* `image/` — which includes `image/svg+xml`, an image format that can contain `<script>` and executes when opened directly from the media origin. Files were also buffered in memory up to 100 MB (a 512 MB container can be exhausted by a handful of requests).
*Fix:* explicit allow-list (JPEG, PNG, WebP, GIF, AVIF, MP4, WebM, PDF) enforced on the multipart, presigned, `complete` and binary-upload paths; default cap lowered to 50 MB (`MEDIA_MAX_UPLOAD_MB`); locally served `/uploads` now carry `Content-Security-Policy: sandbox` + `nosniff`.

**SEC-06 — Vulnerable backend dependencies**
`nodemailer` (4 high: recipient-domain validation bypasses, DoS), `multer` (high), `qs`, `ip-address`.
*Fix:* `npm audit fix` within semver ranges. **Accepted residual risk:** `prisma` → `@prisma/config` → `deepmerge-ts` (3 "high", stack exhaustion when merging recursive objects). This is build/migration-time CLI tooling that only ever processes our own `prisma.config.ts`; it is not reachable from any HTTP request. The suggested "fix" is a downgrade to an old Prisma major and is not appropriate. Track upstream and bump Prisma when patched.

### Medium

**SEC-07 — Rate-limit bucket chosen by an unverified token**
The admin limiters keyed on the `sub` claim of a JWT decoded **without verifying its signature**. An attacker could send a fresh forged token per request and receive a fresh, empty bucket every time — effectively no rate limit on the admin surface.
*Fix:* the key generator now verifies the token (HS256 + secret); anything invalid falls back to the client IP.

**SEC-08 — Rate limits lived in process memory**
With more than one API instance (or after any restart) counters were not shared, so the real limit was `N × configured`.
*Fix:* all limiters use a Redis store (`rate-limit-redis`, per-limiter key prefix) via `lib/rate-limit.ts`; with Redis disabled they use memory. If Redis is temporarily unreachable they fail **open** (logged) rather than take the API down; nginx's edge limits remain as a second layer. *Verified in the running stack:* keys `rl:chatbot-session:*`, `rl:public:*` appear in Redis and the 11th request is rejected.

**SEC-09 — Chatbot endpoint: no dedicated abuse controls**
`POST /chatbot/session` is public and **creates CRM leads**, but shared the generic 100 requests/10 min limit, accepted an unbounded `path` object (up to the 2 MB body cap, stored in the DB), and had loose field validation.
*Fix (three layers):*
1. **API limiters:** session saves **10 per IP per hour**, flow reads **60 per IP per minute** (`RATE_LIMIT_CHATBOT_*`).
2. **Validation:** `path` required and ≤ 8 KB; name/email/phone length- and format-checked; a hidden **honeypot** field (`website`) — bots that fill it get a fake success and nothing is stored.
3. **nginx edge:** `/api/v1/chatbot/session` (with auth, guest OTP, consultations and leads) sits in the strict `sensitive` zone (≈ 6 req/min + burst 10).
Also fixed a latent bug found while testing: a body without `path` caused a 500 instead of a 400.

**SEC-10 — Stored XSS in event descriptions**
`event.shortDescription` was rendered with `dangerouslySetInnerHTML` unsanitised in three places, while blog/legal HTML was sanitised. A compromised or careless admin account could inject script into the public site.
*Fix:* new `sanitizeInlineHtml` (DOMPurify allow-list: basic text formatting and links) applied to all three renders.

**SEC-11 — No browser security headers on website / admin**
*Fix:* both Next.js apps now send `Content-Security-Policy` (default-src self; `frame-ancestors 'none'`; `object-src 'none'`; `form-action 'self'`; third parties limited to Razorpay, GA4/GTM, Meta Pixel, YouTube/Instagram embeds), `X-Frame-Options: DENY`, `Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy` (`same-origin-allow-popups` on the website so Razorpay's popup keeps working), and `poweredByHeader: false`. The admin additionally sends `X-Robots-Tag: noindex` and `Cache-Control: no-store`. The API sends a deny-all CSP and HSTS. See §4-R5 for the one CSP compromise.

**SEC-12 — Type errors hidden from the production build**
`frontend/next.config.ts` had `typescript.ignoreBuildErrors: true`, so a broken build could ship. *Fix:* removed. (It immediately caught a real error in this change set during the Docker build — proof it is doing its job.)

**SEC-13 — Malformed or oversized request bodies returned HTTP 500**
Invalid JSON or oversized payloads hit the generic error path. *Fix:* now `400 BAD_REQUEST` / `413 PAYLOAD_TOO_LARGE`. JSON body limit lowered 2 MB → 1 MB; webhook raw-body limit 1 MB.

**SEC-14 — Unsafe production configuration could boot silently**
Nothing stopped the API from starting in production with a placeholder JWT secret, identical secrets for admin and customer tokens, `localhost`/`http` CORS origins, a `rzp_test_` key while `RAZORPAY_MODE=live`, a Razorpay key without a webhook secret, or Meta WhatsApp without app secret.
*Fix:* `findProductionConfigProblems()` runs at boot. With `ENFORCE_PRODUCTION_CHECKS=true` (set by the Docker/Render configs) the process **exits with a clear message**; otherwise it prints a loud warning (so a developer running with `NODE_ENV=production` on a laptop is not blocked). *Verified in Docker:* an unsafe env refuses to start.

**SEC-15 — Deployments could drop payments or cause 502s**
No `keepAliveTimeout` tuning behind a proxy (proxy reuses a socket Node just closed → sporadic 502), shutdown did not close the database or force-exit on a hang, and stray promise rejections were unhandled.
*Fix:* keep-alive 65 s / headers 66 s / request timeout 60 s; graceful shutdown stops new connections, lets in-flight requests (including payment verification) finish, disconnects Prisma + Redis, with a 25 s hard-exit timer; `unhandledRejection` is logged, `uncaughtException` triggers a clean restart. *Verified:* `docker stop` exits with code 0.

### Low / Informational

| ID | Issue | Fix |
|---|---|---|
| SEC-16 | `Idempotency-Key` cache was global — a key reused on a different endpoint would replay another request's response | Key is now scoped to `METHOD + path + key` |
| SEC-17 | JWT verification did not pin the algorithm | `algorithms: ["HS256"]` on every `verify` |
| SEC-18 | `/health` (public) exposed Redis latency | Removed; returns status only |
| SEC-19 | Developer scripts committed to the repo: `delete.js` (deletes a production setting), `check.js`, `test_api.js` (hard-coded IDs/token), `test_inv.ts`, `dump_products.js` + `products_dump.json`, `patch.py`, `ChatbotWidget.tsx.bak` | Removed from git and excluded from Docker images |
| SEC-20 | Content router and `/payments/*` (non-webhook) had no rate limit; webhooks had none at all | Public limiter added; separate looser limiter for signed webhooks |
| SEC-21 | No SEO infrastructure: no `sitemap.xml`, `robots.txt`, canonical URLs, structured data, analytics loader; `/api/revalidate` compared its secret with `!==` (timing side-channel) | Added — see §3 and the architecture doc. Revalidate now uses `timingSafeEqual` |

---

## 3. SEO improvements delivered

| Item | Detail |
|---|---|
| `robots.txt` | Public pages crawlable; `/account`, `/checkout`, `/order`, verification/reset pages and the builder flows disallowed; sitemap URL declared |
| `sitemap.xml` | Auto-generated hourly from live data: themes, products, collections, blog posts, events + static pages; each source degrades independently |
| Canonical URLs | `metadataBase` + `alternates.canonical` on every page — no duplicate-URL dilution |
| Structured data | JSON-LD `Organization`, `LocalBusiness` (Jaipur, India) and `WebSite` on every page |
| Analytics | GA4 / GTM / Meta Pixel loader, inert until the client provides IDs, loaded after interaction (no Core-Web-Vitals cost), IDs validated before being written into inline scripts |
| Admin isolation | `robots.ts` disallow-all + `X-Robots-Tag: noindex` + `no-store` |
| Performance headers | Immutable 1-year cache on fingerprinted `/_next/static`, gzip at nginx, AVIF/WebP image formats |

---

## 4. Recommendations not applied (need a decision or would change behaviour)

| ID | Recommendation | Why it was left |
|---|---|---|
| R1 | **Guest checkout vs. login-only.** Doc 16 (CR-24) says purchase requires login; the code still implements OTP guest checkout. | Business/contract decision — needs Charu's written approval (Doc 16 §CR-24). |
| R2 | **Two-factor authentication for admin accounts** (TOTP). The admin panel controls prices, orders and customer PII. | New feature, not a defect; recommended next security milestone. |
| R3 | **Remove `POST /payments/razorpay/order`.** It is unauthenticated, unused by the website/admin, and duplicates the checkout flow. It is now rate-limited but should be deleted once confirmed unused by any external client. | Removing an endpoint could break an unknown consumer. |
| R4 | **Sentry / error tracking.** `SENTRY_DSN` is defined but not wired. | Needs a client-owned Sentry project. |
| R5 | **Nonce-based CSP.** `script-src` keeps `'unsafe-inline'` because Next.js emits inline bootstrap scripts; a nonce would force every page to be dynamically rendered and lose ISR caching (worse SEO performance). All other CSP directives are strict. | Trade-off; revisit if pages become static. |
| R6 | **Make public CMS fetches cookie-free so pages can be statically generated / ISR-cached.** Today `apiFetch` reads `cookies()` on every server render, which makes every route dynamic (visible in the build output as `ƒ`). Fixing this would improve TTFB and SEO, but pages would then be pre-rendered at build time and need the API reachable during the Docker build. | Architectural change — should be done and load-tested deliberately. |
| R7 | **Redis outage behaviour.** Limiters fail open by design. If stricter behaviour is required, set `passOnStoreError:false` (and accept 500s during a Redis outage). | Availability chosen over strictness. |
| R8 | **Seed / placeholder content** (Faridabad farmhouse, dummy phone numbers, wedding/bridal copy) still exists in `prisma/seed.ts` and a few fallbacks. | Content task tracked as CR-26 in Doc 16. |
| R9 | **Secrets hygiene.** No `.env` file was ever committed (verified against git history), but the developer machines hold real Neon and Razorpay-test credentials in local `.env` files. Rotate DB and API secrets before go-live and whenever a laptop or chat log may have exposed them. | Operational. |
| R10 | **Prisma CLI advisory** (see SEC-06). | Waiting for upstream fix. |

---

## 5. Controls confirmed as already good (no change needed)

- Passwords: bcrypt cost 12; account lockout after 5 failures; OTP hashed and attempt-limited.
- Cookies: `httpOnly`, `Secure` forced on in production, matching attributes on clear.
- Webhooks: Razorpay HMAC and Meta `X-Hub-Signature-256` verified with `crypto.timingSafeEqual`; Razorpay verification hard-fails in production if no secret is configured.
- Input validation: Zod schemas on routes; Prisma parameterised queries (the only raw SQL is `SELECT 1`); no string-built SQL.
- Logging: pino with redaction of `Authorization`, cookies, passwords, OTPs and tokens; audit log for admin actions; soft-delete for business records.
- Authorisation: admin routes gated by `requireAdmin` + role checks; customer orders/registries filtered by owner; invoices require a guest token bound to the order or email.
- HTML from the CMS: DOMPurify allow-lists on blog and legal pages.
- Registry importer: private-IP/metadata blocklist, size and time limits (now redirect-safe).

---

## 6. Regression checklist (run after every deployment)

1. `GET https://API_HOST/health` → 200, `database: "connected"`, `redis.status: "ok"`.
2. Response headers on the website: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options: DENY`.
3. `curl -X POST -H "Origin: https://evil.example" https://API_HOST/api/v1/chatbot/session` → `403`.
4. Send 12 chatbot session requests from one IP → the 11th returns `429`.
5. `https://SITE_HOST/robots.txt` and `/sitemap.xml` load; sitemap lists themes/products/blog.
6. Admin host returns `X-Robots-Tag: noindex` and is absent from Google (`site:ADMIN_HOST`).
7. Place a Razorpay **test** order end to end; confirm webhook processed, invoice emailed, WhatsApp received.
8. `docker compose ps` — every service `healthy`.
