# 02 — Production Deployment Guide

How to deploy the whole platform (API, website, admin, Redis, database) with Docker — on **Render**, on **any Docker host behind nginx** (AWS EC2, Google Compute Engine, DigitalOcean, bare metal), on **AWS ECS/Fargate**, or on **Google Cloud Run**.

> Read `01-Security-Audit-Report.md` first for *why* the settings below exist. **Verification status:** Path B (Docker + nginx) was executed end-to-end locally — all three images build, the stack starts healthy behind nginx, applies every migration to an empty database, and the security behaviour was probed with curl. Paths A, C and D use those same, verified images but were **not** run against Render/AWS/GCP accounts, so treat their provider-specific steps as a checklist to confirm during your first staging deploy.

---

## 1. Pick a deployment path

| Path | Best for | Reverse proxy | TLS | Effort | Notes |
|---|---|---|---|---|---|
| **A. Render Blueprint** | Fastest, lowest ops. Recommended to launch. | Render's built-in LB | Automatic | ★ | `render.yaml` in the repo root |
| **B. Docker host + nginx** (EC2 / GCE / VPS) | Full control, one predictable monthly bill | **nginx (this repo)** | Let's Encrypt (auto-renew) | ★★ | `docker-compose.prod.yml` |
| **C. AWS ECS Fargate** | Scale, AWS-native, WAF, managed DB/Redis | ALB (+ optional WAF) | ACM | ★★★ | Same images, no nginx needed |
| **D. Google Cloud Run** | Scale-to-zero costs, managed | Google front end | Automatic | ★★ | Same images, no nginx needed |

All four use the **same three images**: `backend/Dockerfile`, `frontend/Dockerfile`, `admin/Dockerfile`.
You can mix: e.g. keep website + admin on Vercel and run only the API with Docker (add the Vercel domains to `CORS_ORIGINS`).

### Target architecture

```
                         ┌──────────────── nginx / LB ────────────────┐
 internet ──HTTPS──►     │  rate limits · TLS · security headers      │
                         └───────┬───────────────┬───────────────┬────┘
                          www.…  │        api.…  │       admin.… │
                                 ▼               ▼               ▼
                          frontend (Next)   backend (Express)   admin (Next)
                                 │               │  │
                                 └── SSR ───────►┘  ├──► Redis  (cache + shared rate limits)
                                                    ├──► PostgreSQL (Neon / RDS / Cloud SQL)
                                                    ├──► Razorpay · SMTP · Meta WhatsApp
                                                    └──► Cloudflare R2 (media)
```

---

## 2. Prerequisites (all paths)

1. **Domain + DNS access.** You need three hostnames, e.g.
   `www.example.com` (site), `api.example.com` (API), `admin.example.com` (admin). Apex `example.com` should redirect to `www` at your DNS/CDN.
2. **PostgreSQL 16** — managed is strongly recommended (Neon, RDS, Cloud SQL, Render Postgres). Use the **pooled** connection string. Enable automated backups / point-in-time recovery.
3. **Cloudflare R2 bucket + public CDN domain** for media (the local `/uploads` fallback is not persistent in containers).
4. **Accounts/keys:** Razorpay (live keys + webhook secret), SMTP mailbox, Meta WhatsApp Cloud API (token, phone number ID, app secret, verify token).
5. **Generate secrets** (run locally; never reuse between environments):

```bash
openssl rand -base64 48   # JWT_ACCESS_SECRET
openssl rand -base64 48   # JWT_REFRESH_SECRET   (must differ)
openssl rand -base64 48   # JWT_CUSTOMER_ACCESS_SECRET (must differ)
openssl rand -hex 32      # REVALIDATE_SECRET, REDIS_PASSWORD, POSTGRES_PASSWORD
```

6. **Docker** 24+ and Docker Compose v2 on any machine that will build images (`docker --version`, `docker compose version`).

---

## 3. Environment variables

The API validates its environment at boot and **refuses to start** in an unsafe production configuration when `ENFORCE_PRODUCTION_CHECKS=true` (set for you by the compose/Render files).

### 3.1 Backend (runtime secrets — never in git)

Template: `deploy/env/backend.env.example` (copy to `deploy/env/backend.env`). Key points:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✔ | Postgres URL (pooled). |
| `CORS_ORIGINS` | ✔ | Comma-separated **exact `https://` origins**: site + admin. No localhost, no trailing slash. |
| `FRONTEND_URL` | ✔ | `https://www.example.com` — used in emails and as a trusted origin. |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_CUSTOMER_ACCESS_SECRET` | ✔ | ≥ 32 chars, **three different values**. |
| `COOKIE_SECURE` | ✔ | `true` in production. |
| `RAZORPAY_MODE`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | ✔ | `live` + `rzp_live_…` keys in production. A key without a webhook secret is rejected at boot. |
| `SMTP_*`, `EMAIL_FROM_ADDRESS` | ✔ | Order confirmations, OTPs, invoices. |
| `WHATSAPP_PROVIDER=meta` + `WHATSAPP_META_*`, `WHATSAPP_APP_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | if WhatsApp on | App secret + verify token required with `meta`. |
| `CLOUDFLARE_R2_*`, `CLOUDFLARE_R2_PUBLIC_BASE_URL` | ✔ | Media storage/CDN. |
| `REVALIDATE_SECRET`, `FRONTEND_REVALIDATE_URL` | ✔ | Lets the admin panel refresh cached website pages. Secret must match the website's. |
| `TRUST_PROXY` | ✔ | Number of proxy hops in front of the API. **`1`** with the bundled nginx, or with ALB/Render. See §9.2. |
| `REDIS_URL` | ✔ | Set by compose/Render. Use `rediss://` (TLS) for managed Redis. |
| `RUN_MIGRATIONS` | – | `true` makes the container run `prisma migrate deploy` on start. |
| `RATE_LIMIT_CHATBOT_SESSIONS_PER_HOUR` / `_FLOW_PER_MINUTE` | – | Chatbot limits per IP (defaults 10 / 60). |
| `MEDIA_MAX_UPLOAD_MB` | – | Default 50. |
| `ALLOW_VERCEL_PREVIEWS` | – | Must stay `false` in production. |

### 3.2 Website & admin (build-time values)

`NEXT_PUBLIC_*` values are **compiled into the browser bundle**, so changing one requires a **rebuild**. They are Docker build args (compose maps them for you from `.env`):

| Variable | App | Example |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | both | `https://www.example.com` (also drives sitemap/canonical/JSON-LD) |
| `NEXT_PUBLIC_API_BASE_URL` | both | `https://api.example.com/api/v1` |
| `NEXT_PUBLIC_CDN_HOST` | website | `cdn.example.com` (image allow-list) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | website | public key only |
| `NEXT_PUBLIC_WHATSAPP_NUMBER`, `…_PREFILL_MESSAGE` | website | click-to-chat |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID`, `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_META_PIXEL_ID` | website | leave empty until the client provides IDs |
| `NEXT_PUBLIC_ADMIN_URL` | admin | `https://admin.example.com` |

Runtime (not baked): `INTERNAL_API_URL` (server-side calls to the API), `REVALIDATE_SECRET`, `BACKEND_ORIGIN` (rewrite target, baked at build).

---

## 4. Path B — Docker host + nginx (AWS EC2 / GCE / any VPS)

Files: `docker-compose.prod.yml`, `deploy/nginx/**`, `deploy/.env.example`, `deploy/env/backend.env.example`.

### 4.1 Server

- Ubuntu 22.04/24.04, **2 vCPU / 4 GB RAM** minimum (builds need memory; add 2 GB swap on smaller boxes).
- Open inbound **80** and **443** only (SSH restricted to your IP). Do **not** expose 4000/3000/3001/6379/5432 — compose does not publish them.
- Install Docker: `curl -fsSL https://get.docker.com | sh` then add your user to the `docker` group.
- Point the three DNS `A` records at the server's public IP and wait for propagation.

### 4.2 Configure

```bash
git clone <repo-url> vaibhav && cd vaibhav

cp deploy/.env.example .env                                  # compose-level settings
cp deploy/env/backend.env.example deploy/env/backend.env     # API secrets
nano .env deploy/env/backend.env                             # fill in every value
```

Fill `.env`: `SITE_HOST`, `API_HOST`, `ADMIN_HOST`, `REDIS_PASSWORD`, `REVALIDATE_SECRET`, the public build values, and `RUN_MIGRATIONS=true` for the first run.
`REVALIDATE_SECRET` must be identical in `.env` and `deploy/env/backend.env`.

Using a managed database? Put its URL in `DATABASE_URL` and skip the `local-db` profile. To run Postgres on the same box instead, set `POSTGRES_PASSWORD` in `.env`, use `DATABASE_URL=postgresql://vbc:<pw>@postgres:5432/vaibhav_celebrations` and add `--profile local-db` to every compose command below (then schedule `pg_dump` backups — §8).

### 4.3 Get a TLS certificate (one time)

nginx will not start without certificates, so issue them first while port 80 is free:

```bash
docker run --rm -p 80:80 \
  -v vaibhav-celebrations_letsencrypt:/etc/letsencrypt \
  certbot/certbot certonly --standalone \
  -d www.example.com -d api.example.com -d admin.example.com \
  --email you@example.com --agree-tos --no-eff-email
```

The **first** `-d` name becomes the certificate name; it must equal `SITE_HOST` (or set `CERT_NAME` in `.env`).

*Behind a cloud load balancer that terminates TLS instead?* Set `NGINX_TEMPLATES=./deploy/nginx/templates-http` in `.env` and skip this step.

### 4.4 Build and start

```bash
docker compose -f docker-compose.prod.yml --profile tls up -d --build
docker compose -f docker-compose.prod.yml ps        # every service should become "healthy"
```

`--profile tls` also starts the certbot renewal loop (renews every 12 h; nginx picks up the new certificate on its next reload — run `docker compose -f docker-compose.prod.yml exec nginx nginx -s reload` monthly, or add it to cron).

On first start with `RUN_MIGRATIONS=true` the API applies all database migrations. After the first successful start, set `RUN_MIGRATIONS=false` (or keep it — `migrate deploy` is idempotent).

### 4.5 Create the first admin user

The production image contains only runtime dependencies, so run the seed from a machine that has the repo:

```bash
cd backend && npm ci
DATABASE_URL="<production url>" SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD='<strong password>' SEED_ADMIN_NAME='Owner' npm run db:seed
```

> ⚠ `prisma/seed.ts` **deletes every table** before inserting demo content, so it refuses to run unless `SEED_CONFIRM_WIPE=yes` is set. Only ever use it on an empty or disposable database (prefix the command above with `SEED_CONFIRM_WIPE=yes`). On a database that already holds real content, never run it — create admin users through the admin panel (Settings) instead.
>
> To bring an **existing** database up to date with the official business details and site content (settings, contact page, policies, festive collections, seasonal pop-up, category stages), run the non-destructive, re-runnable sync instead:
>
> ```bash
> cd backend
> npm run db:sync-business -- --dry-run   # preview
> npm run db:sync-business                # apply
> ```

### 4.6 Verify

```bash
curl -s https://api.example.com/health                  # {"success":true,"data":{"status":"ok","database":"connected",…}}
curl -sI https://www.example.com | grep -i -E "strict-transport|content-security|x-frame"
curl -s https://www.example.com/robots.txt | head
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Origin: https://evil.example" \
     -H "Content-Type: application/json" -d '{}' https://api.example.com/api/v1/chatbot/session   # 403
```

### 4.7 Update / roll back

```bash
git pull
docker compose -f docker-compose.prod.yml --profile tls up -d --build     # rebuilds changed images, rolling restart per service
# roll back: git checkout <previous-tag>  → same command. Tag images with IMAGE_TAG=v1.2.3 in .env for instant rollback.
```

Database migrations are forward-only. Take a backup **before** any release that contains a new migration.

### 4.8 What nginx is doing for you

- TLS 1.2/1.3, HTTP→HTTPS redirect, HSTS, OCSP stapling; unknown `Host` headers get **no response** (444).
- **Edge rate limits:** website 30 req/s, API 20 req/s, and a much tighter zone (≈ 6 req/min, burst 10) on login, OTP, guest checkout, consultations, leads and **chatbot session saves**; per-IP connection caps.
- Passes exactly **one** trustworthy `X-Forwarded-For` hop to the apps (clients cannot spoof it) — this is why `TRUST_PROXY=1`.
- Larger body only for admin media upload (55 MB); dotfiles blocked; `server_tokens off`; gzip; keep-alive tuned below Node's.
- Optional admin IP allow-list: edit `deploy/nginx/admin-access.conf`.

---

## 5. Path A — Render (recommended for the first launch)

1. Push the repo to GitHub. In `render.yaml`, replace every `example.com` with your real domain (website build args are baked at build).
2. Render Dashboard → **New → Blueprint** → select the repo. Render creates `vc-api`, `vc-website`, `vc-admin` and the `vc-redis` Key Value store.
3. When prompted, fill each `sync: false` secret: `DATABASE_URL`, `REVALIDATE_SECRET` (same value on API **and** website), Razorpay, SMTP, WhatsApp, R2, public keys. `JWT_*` secrets are generated for you.
4. **Custom domains:** add `www` → `vc-website`, `api` → `vc-api`, `admin` → `vc-admin`. Render issues TLS automatically.
5. First deploy applies migrations (`RUN_MIGRATIONS=true`). Then create the admin user (§4.5).
6. Set `TRUST_PROXY` correctly (§9.2). Render's plan must allow the memory the API needs (Starter 512 MB is enough; the Node heap is capped at 384 MB).
7. Render already provides the reverse proxy, TLS and DDoS layer, so **nginx is not used**. Application-level rate limiting (Redis-backed) still applies. Put **Cloudflare** in front (§9.3) for edge rate limiting and bot protection.

---

## 6. Path C — AWS (ECS Fargate + ALB)

Managed pieces: **ECR** (images), **ECS Fargate** (3 services), **ALB** (host-based routing + ACM certificate), **RDS PostgreSQL**, **ElastiCache Redis** (in-transit encryption → `rediss://`), **Secrets Manager**, **CloudWatch Logs**, optional **WAF**.

```bash
# 1) Build & push (repeat for frontend / admin with their build args)
aws ecr create-repository --repository-name vc-backend
aws ecr get-login-password | docker login --username AWS --password-stdin <acct>.dkr.ecr.<region>.amazonaws.com
docker build -t <acct>.dkr.ecr.<region>.amazonaws.com/vc-backend:1.0.0 ./backend
docker push  <acct>.dkr.ecr.<region>.amazonaws.com/vc-backend:1.0.0
docker build -t <acct>.dkr.ecr.<region>.amazonaws.com/vc-frontend:1.0.0 \
  --build-arg NEXT_PUBLIC_SITE_URL=https://www.example.com \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1 \
  --build-arg BACKEND_ORIGIN=https://api.example.com ./frontend
```

Setup checklist:
1. **Network:** VPC with public subnets (ALB) and private subnets (tasks, RDS, Redis). Security groups: ALB ← 443 from the internet; tasks ← from ALB only; RDS/Redis ← from tasks only.
2. **RDS PostgreSQL 16** (Multi-AZ, automated backups 7–35 days, deletion protection). **ElastiCache Redis** with auth token + TLS; `REDIS_URL=rediss://:<token>@<endpoint>:6379`.
3. **Secrets:** store `backend.env` values in Secrets Manager / SSM Parameter Store and reference them in the task definition (`secrets:`), not `environment:`.
4. **Task definitions:** one per app. Backend: `cpu 512 / memory 1024`, port 4000, env `NODE_ENV=production`, `ENFORCE_PRODUCTION_CHECKS=true`, **`TRUST_PROXY=1`** (the ALB is one hop; no nginx), container health check `CMD-SHELL node -e "fetch('http://127.0.0.1:4000/health')…"` (already baked into the image), `readonlyRootFilesystem: true` with a `/tmp` volume, `stopTimeout: 30` (matches the API's graceful-shutdown window).
5. **Services & ALB:** three target groups (health checks: API `/health`, site/admin `/robots.txt`). HTTPS listener with an **ACM** certificate for all three hostnames; **host-header rules**: `www.*` → website, `api.*` → API, `admin.*` → admin; HTTP :80 → redirect to HTTPS. Set ALB idle timeout to 60 s (the API keep-alive is 65 s).
6. **Migrations:** run once as a one-off task before shifting traffic:
   `aws ecs run-task --cluster vc --task-definition vc-backend --overrides '{"containerOverrides":[{"name":"backend","environment":[{"name":"RUN_MIGRATIONS","value":"true"}],"command":["node","-e","process.exit(0)"]}]}'`
   (the entrypoint runs `prisma migrate deploy`, then the overridden command exits).
7. **WAF (recommended):** attach AWS WAF to the ALB with the AWS managed *Common* and *Known Bad Inputs* rule groups plus a **rate-based rule** (e.g. 2 000 requests / 5 min per IP) — this replaces nginx's edge limits on this path.
8. **Scaling:** ECS target-tracking on CPU 60 %; min 2 API tasks across AZs. Rate limits and cache are in Redis so replicas behave consistently.

---

## 7. Path D — Google Cloud Run

```bash
gcloud services enable run.googleapis.com artifactregistry.googleapis.com sqladmin.googleapis.com secretmanager.googleapis.com
gcloud artifacts repositories create vc --repository-format=docker --location=asia-south1

# Build & deploy the API
gcloud builds submit ./backend --tag asia-south1-docker.pkg.dev/$PROJECT/vc/backend:1.0.0
gcloud run deploy vc-api \
  --image asia-south1-docker.pkg.dev/$PROJECT/vc/backend:1.0.0 \
  --region asia-south1 --port 4000 --min-instances 1 --max-instances 10 \
  --cpu 1 --memory 512Mi --concurrency 80 --timeout 60 \
  --add-cloudsql-instances $PROJECT:asia-south1:vc-db \
  --set-env-vars NODE_ENV=production,ENFORCE_PRODUCTION_CHECKS=true,TRUST_PROXY=1,COOKIE_SECURE=true,RUN_MIGRATIONS=true \
  --set-secrets DATABASE_URL=db-url:latest,JWT_ACCESS_SECRET=jwt-access:latest,JWT_REFRESH_SECRET=jwt-refresh:latest,JWT_CUSTOMER_ACCESS_SECRET=jwt-customer:latest,RAZORPAY_KEY_SECRET=rzp-secret:latest \
  --allow-unauthenticated
```

- **Database:** Cloud SQL for PostgreSQL 16 (HA + automated backups). Use the Cloud SQL connector: `DATABASE_URL=postgresql://USER:PASS@localhost/DB?host=/cloudsql/PROJECT:REGION:INSTANCE`.
- **Redis:** Memorystore (needs a Serverless VPC connector: `--vpc-connector`) **or** a managed Redis such as Upstash with `rediss://`.
- **Website/admin:** `gcloud builds submit ./frontend --tag …` with `--build-arg`s (use a `cloudbuild.yaml` or build locally and push), then `gcloud run deploy vc-website --port 3000 --min-instances 1` and `vc-admin --port 3001`.
- **Domains + TLS:** `gcloud beta run domain-mappings create --service vc-api --domain api.example.com` (or a global HTTPS Load Balancer with Cloud Armor, recommended for WAF/rate limiting).
- Keep **min-instances ≥ 1** on the API so payment webhooks never hit a cold start.
- Run migrations once with a Cloud Run **Job** using the same image and `RUN_MIGRATIONS=true`.

---

## 8. After the first deploy (all paths)

1. **Razorpay:** Dashboard → Webhooks → `https://API_HOST/api/v1/payments/webhook`, events `payment.captured` and `payment.failed` (the only events the API acts on); paste the secret into `RAZORPAY_WEBHOOK_SECRET`. Make a live ₹1 test payment.
2. **Meta WhatsApp:** Webhook callback `https://API_HOST/api/v1/whatsapp/webhook`, verify token = `WHATSAPP_WEBHOOK_VERIFY_TOKEN`; subscribe to `messages`.
3. **Media CORS:** allow `https://SITE_HOST` and `https://ADMIN_HOST` on the R2 bucket (`backend/set-r2-cors.mjs` shows the shape).
4. **Search Console:** add the site, submit `https://SITE_HOST/sitemap.xml`. Add GA4/GTM/Pixel IDs to `.env` and redeploy the website when the client provides them.
5. **Backups:** confirm managed-DB backups are on and **perform one restore test**. With a self-hosted Postgres: nightly `docker compose exec -T postgres pg_dump -U vbc vaibhav_celebrations | gzip > /backups/vbc-$(date +%F).sql.gz`, copy off-server, keep 14+ days.
6. **Monitoring:** uptime check on `https://API_HOST/health` and `https://SITE_HOST/robots.txt` (UptimeRobot/BetterStack). Ship container logs (`json-file` rotation is already configured) to CloudWatch/Cloud Logging/Grafana Loki. Alert on 5xx rate and payment-webhook failures.
7. **Rotate secrets** that were ever used on a developer machine or pasted into chat/tickets (database password, R2 keys, SMTP, Razorpay test keys).
8. Run the regression checklist in `01-Security-Audit-Report.md` §6.

---

## 9. Operations notes

### 9.1 Scaling and resources
Defaults: API 1 vCPU/512 MB (Node heap capped at 384 MB), website 1 vCPU/512 MB, admin 0.5 vCPU/384 MB, Redis 256 MB (LRU). The API is stateless — cache, idempotency keys and rate-limit counters live in Redis — so you can run several replicas behind the load balancer. Scale the API first (payments, search); the website is CDN-cacheable.

### 9.2 Getting `TRUST_PROXY` right (affects every rate limit)
It is the number of proxies between the client and the API. **Too low** → every visitor appears to come from your proxy (one shared bucket: legitimate users get blocked). **Too high** → clients can forge `X-Forwarded-For` to dodge limits.
- Bundled nginx → `1`. ALB / Render / Cloud Run alone → `1`.
- Cloudflare → then nginx/LB → `2`.
- **Check it:** after a few requests, list the counters — `redis-cli -a $REDIS_PASSWORD keys 'rl:public:*'`. The suffix must be *your* public IP. If you only see private/provider IPs, raise `TRUST_PROXY`.

### 9.3 Cloudflare in front (recommended on every path)
Proxy the three hostnames through Cloudflare (orange cloud), SSL mode **Full (strict)**, enable *Bot Fight Mode* and a WAF rate-limiting rule on `/api/v1/*`. To trust Cloudflare's client IP in the bundled nginx, add Cloudflare's published ranges as `set_real_ip_from` lines in `deploy/nginx/nginx.conf` and use `real_ip_header CF-Connecting-IP;`.

### 9.4 Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| API exits immediately: "Refusing to start. Unsafe production configuration" | Read the listed problems — placeholder/duplicate JWT secrets, non-https `CORS_ORIGINS`, `rzp_test_` key with `RAZORPAY_MODE=live`, missing webhook secret. |
| Browser: CORS error / logged out on refresh | `CORS_ORIGINS` missing the exact site/admin origin; `COOKIE_SECURE` not `true`; site not served over HTTPS. |
| `403 FORBIDDEN_ORIGIN` on every POST | The origin the browser sends is not in `CORS_ORIGINS`/`FRONTEND_URL`. |
| Everyone gets `429` | `TRUST_PROXY` too low (all traffic looks like one IP) — see §9.2. |
| Sporadic `502` from nginx/ALB | Proxy idle timeout longer than the API keep-alive (65 s) — keep LB idle ≤ 60 s. |
| Website shows old content after an admin edit | `REVALIDATE_SECRET` differs between API and website, or `FRONTEND_REVALIDATE_URL` unreachable. |
| Images blocked on the site | `NEXT_PUBLIC_CDN_HOST` wrong at build time (rebuild the website image). |
| `prisma migrate deploy` fails | Database unreachable from the container, or a manual schema change conflicts — restore from backup and re-run. |
| nginx won't start (TLS) | Certificate not issued yet (§4.3) or `CERT_NAME` ≠ certificate lineage name. |
| Port 80/443 already in use on a dev machine | Set `HTTP_PORT` / `HTTPS_PORT` in `.env` (e.g. 8080 / 8443). |

### 9.5 Local rehearsal (no domain needed)
```bash
# .env: SITE_HOST=www.localtest.me API_HOST=api.localtest.me ADMIN_HOST=admin.localtest.me
#       NGINX_TEMPLATES=./deploy/nginx/templates-http  HTTP_PORT=8080  + secrets, POSTGRES_PASSWORD
docker compose -f docker-compose.prod.yml --profile local-db up -d --build
curl -H "Host: api.localtest.me" -H "X-Forwarded-Proto: https" http://localhost:8080/health
```
(`*.localtest.me` resolves to 127.0.0.1. The `X-Forwarded-Proto` header stands in for the load balancer that would terminate TLS.)
