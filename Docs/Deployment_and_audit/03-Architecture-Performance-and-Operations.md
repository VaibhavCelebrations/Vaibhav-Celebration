# 03 — Architecture, Performance & Operations Reference

Companion to the security audit and deployment guide. It documents *what was built into the platform* for speed, reliability and safe operation, and where each piece lives in the repository.

---

## 1. What changed in the architecture

| Concern | Before | Now | Where |
|---|---|---|---|
| Packaging | No Dockerfiles for the apps; dev-only Postgres/Redis compose | Multi-stage, non-root, health-checked images for API, website and admin; production compose stack | `backend/Dockerfile`, `frontend/Dockerfile`, `admin/Dockerfile`, `docker-compose.prod.yml` |
| Reverse proxy | None (each app exposed directly) | nginx: TLS, HSTS, edge rate limits, real-IP handling, host allow-list, gzip, tuned keep-alive | `deploy/nginx/**` |
| Rate limiting | Per-process memory (multiplied by replica count) | Redis-backed, shared across replicas; chatbot-specific limits; nginx edge zones on top | `backend/src/lib/rate-limit.ts`, `app.ts`, `deploy/nginx/nginx.conf` |
| CSRF / CORS | Wildcard-style preview origin trusted; no CSRF control | Single origin allow-list used by CORS **and** an origin guard on state-changing requests | `backend/src/config/origins.ts`, `middleware/origin-guard.ts` |
| Config safety | Any values accepted | Production guard rails abort boot on unsafe settings | `backend/src/config/env.ts` |
| Process lifecycle | Basic SIGTERM handler | Timeouts tuned for proxies, graceful drain, DB/Redis close, force-exit timer, crash handling | `backend/src/server.ts` |
| Browser security | None on website/admin | CSP, HSTS, framing/permissions policies, no `X-Powered-By` | `frontend/next.config.ts`, `admin/next.config.ts` |
| SEO | None | `sitemap.xml`, `robots.txt`, canonicals, JSON-LD, analytics loader | `frontend/src/app/{sitemap,robots}.ts`, `layout.tsx`, `components/layout/Analytics.tsx` |
| CI | Typecheck only | Typecheck + unit tests + dependency audit + Docker build/compose validation | `.github/workflows/ci.yml` |

---

## 2. Request flow (production)

```
Browser ─HTTPS─► nginx :443
   │  1. TLS terminate, HSTS
   │  2. Host allow-list (unknown Host → connection dropped)
   │  3. limit_req / limit_conn per real client IP
   │  4. one clean X-Forwarded-For hop  ───────────────┐
   ▼                                                   │
 www.*  → frontend :3000 ─SSR/API calls (no Origin)──► backend :4000
 api.*  → backend  :4000  ◄────────────────────────────┘
 admin.*→ admin    :3001

backend request pipeline (order matters):
  helmet → CORS (allow-list) → raw-body webhooks → JSON(1 MB) → cookies →
  CSRF origin guard → pino logging → [per-route rate limiter (Redis)] →
  auth (JWT HS256, role checks) → Zod validation → service → Prisma → error handler
```

Design rules the code follows:
1. **Every browser-originated mutation is origin-checked**; server-to-server calls (SSR, webhooks) are authenticated by their own means (signatures, bearer tokens).
2. **Limits are layered**: nginx (cheap, protects Node), API + Redis (accurate, shared, per-route, per-admin), and provider-level (Cloudflare/WAF) if you add it.
3. **Fail safe at boot, fail open at runtime**: unsafe configuration stops the deploy; a Redis blip degrades rate limiting/caching but never takes the API down.
4. **Nothing user-supplied is trusted for identity in limits** (tokens verified before bucketing).

---

## 3. Performance and reliability features

| Area | Detail |
|---|---|
| Caching | Redis response cache for public catalogue/CMS/builder reads with tag invalidation on admin changes (existing); Next.js data cache with 5-minute ISR-style revalidation and on-demand revalidation endpoint (constant-time secret check) |
| Static assets | Fingerprinted assets served `immutable, max-age=1y`; gzip at nginx; AVIF/WebP image negotiation |
| Node tuning | Heap capped (`--max-old-space-size=384`) to stay inside a 512 MB container; keep-alive 65 s > proxy 60 s; request timeout 60 s |
| Connection hygiene | nginx upstream keep-alive pools; `proxy_next_upstream` retry on 502/503 |
| Graceful deploys | SIGTERM → stop accepting → drain in-flight (payments finish) → close Prisma/Redis → exit; 25 s ceiling; `tini` as PID 1 so signals reach Node |
| Health | API `/health` (DB + Redis, minimal JSON), site/admin `/robots.txt`, nginx `/nginx-health`; Docker `HEALTHCHECK` on every image; compose `depends_on: service_healthy` orders startup |
| Isolation | Containers run as non-root, read-only root filesystem, `no-new-privileges`, all Linux capabilities dropped (nginx keeps only what it needs to bind and drop privileges), Redis/Postgres on an **internal** network with no internet route |
| Logging | JSON logs with credential redaction; `json-file` rotation (10 MB × 5) per container |

**Known performance opportunity (R6 in the audit):** every website route is server-rendered dynamically because the API client reads `cookies()` on each render. Making *public CMS* fetches cookie-free would let Next.js serve most pages as static/ISR HTML (better TTFB and SEO). It is not enabled because those pages would then be pre-rendered at build time and the build needs the API reachable; do this as a deliberate, load-tested change.

---

## 4. Rate-limit reference

| Scope | Limit | Layer |
|---|---|---|
| Public catalogue/CMS/builder | 100 requests / 10 min / IP (`RATE_LIMIT_MAX_PUBLIC`) | API (Redis) |
| Login / auth (admin) | 20 / 15 min / IP | API |
| Customer signup / login / reset | 20 / 15 min / IP | API |
| Guest OTP | 5 / 15 min / IP | API |
| Orders, consultations, leads, guest verify-payment | 10 / 10 min / IP | API |
| **Chatbot session save (creates a lead)** | **10 / hour / IP** (`RATE_LIMIT_CHATBOT_SESSIONS_PER_HOUR`) | API |
| **Chatbot flow read** | **60 / min / IP** (`RATE_LIMIT_CHATBOT_FLOW_PER_MINUTE`) | API |
| Webhooks (Razorpay, Meta) | 300 / min / IP (signature is the real gate) | API |
| Admin panel | 1 000 / 10 min / **verified admin id** | API |
| Admin media upload | 100 / 10 min / verified admin id | API |
| Website | 30 req/s + burst 60 / IP | nginx |
| API general | 20 req/s + burst 40 / IP | nginx |
| Login, OTP, guest, chatbot session, consultations, leads | ≈ 6 req/min + burst 10 / IP | nginx |
| Concurrent connections | 60 (API) / 40 (site) / 30 (admin) per IP | nginx |

All values are configurable (environment variables for the API, `deploy/nginx/nginx.conf` for nginx).

---

## 5. Backup, recovery and change management

- **Database:** managed automated backups + PITR; **test a restore before launch and quarterly**. Migrations are forward-only — back up before releases that add one.
- **Media:** R2 is the source of truth (enable bucket versioning; lifecycle-delete old versions after N days).
- **Configuration:** the `.env` files are the only state outside the DB/R2 — store them in a password manager or a secrets service, not on the server alone.
- **Release process:** PR → CI (typecheck, tests, audit, Docker build) → tag `vX.Y.Z` → deploy with `IMAGE_TAG=vX.Y.Z` → run the regression checklist (`01-Security-Audit-Report.md` §6) → keep the previous tag for rollback.
- **Dependencies:** run `npm audit --omit=dev` monthly (CI already fails the build on critical/high in the website and admin, and on critical in the API). Patch Next.js and Prisma promptly.
- **Secrets rotation:** see `Docs/14-Secrets-Rotation-Policy.md`; rotate immediately after any suspected exposure. Rotating JWT secrets logs everyone out (expected).

---

## 6. Files added or changed (index)

**Added:** `backend/{Dockerfile,docker-entrypoint.sh,.dockerignore}`, `frontend/{Dockerfile,.dockerignore}`, `admin/{Dockerfile,.dockerignore}`, `docker-compose.prod.yml`, `render.yaml`, `deploy/**`, `.gitattributes`, `backend/src/{config/origins.ts, lib/rate-limit.ts, middleware/origin-guard.ts, middleware/security.test.ts, modules/media/media-policy.ts}`, `frontend/src/{app/robots.ts, app/sitemap.ts, components/layout/Analytics.tsx, lib/site.ts}`, `Docs/Deployment_and_audit/**`.

**Changed:** `backend/src/{app.ts, server.ts, config/env.ts, middleware/{auth,customer-auth,guest-auth,error-handler,idempotency}.ts, modules/{auth/auth.service.ts, chatbot/chatbot.routes.ts, health/health.routes.ts, media/media.routes.ts, registry/extract.service.ts}}`, `frontend/{next.config.ts, package.json, src/app/{layout.tsx, events/**, api/revalidate/route.ts}, src/components/events/FeaturedEventCard.tsx, src/lib/{api-client.ts, cms/sanitize-html.ts}}`, `admin/{next.config.ts, package.json, 5 files with API-base fallbacks}`, `.github/workflows/ci.yml`, `.gitignore`, `backend/.env.example`, lockfiles (dependency security updates).

**Removed:** committed developer scripts and dumps (`backend/{check,delete,test_api,dump_products}.js`, `test_inv.ts`, `products_dump.json`, `patch.py`, `ChatbotWidget.tsx.bak`).

**Behavioural notes for developers**
- New env vars (all optional, safe defaults): `TRUST_PROXY`, `ENFORCE_PRODUCTION_CHECKS`, `ALLOW_VERCEL_PREVIEWS`, `RATE_LIMIT_CHATBOT_*`, `MEDIA_MAX_UPLOAD_MB`.
- **Vercel preview deployments no longer work against a staging API unless `ALLOW_VERCEL_PREVIEWS=true`** on that (non-production) API.
- A local `.env` with `NODE_ENV=production` and `localhost` origins now prints a `[security]` warning at startup (it does not stop the server unless `ENFORCE_PRODUCTION_CHECKS=true`).
- SVG uploads are no longer accepted in the admin media library — export as PNG/WebP.
- The website build now type-checks (previously errors were ignored): fix type errors instead of suppressing them.
