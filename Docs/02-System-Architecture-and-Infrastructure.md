# 02 — System Architecture & Infrastructure Blueprint

**Owner:** Shubham Deshmukh (Lead / Backend)
**Consumers:** Vishal (Frontend), Chaitanya (Admin)
**Depends on:** Document 01 (SOW Alignment)

---

## 1. Design Principles

1. **No component ever talks directly to the database except the backend.** Frontend and Admin are pure HTTP clients of the backend API. This is the literal engineering translation of the client's own words in Meeting 1: _"there is no direct connection between the backend and the database... it helps us to keep the website, data and whole thing secure properly."_
2. **Three independently deployable services**, matching the three existing folders: `frontend`, `admin`, `backend` (+ `cdn` as configuration/scripts, not a running service).
3. **Admin Panel is never linked from, or discoverable via, the public site.** It is not in any sitemap, carries `noindex, nofollow`, and lives on its own subdomain.
4. **Guest-first, stateless-where-possible.** No mandatory session for the public site; short-lived JWTs only where a guest is actively verified (Order-ID + OTP flow) or where an admin is authenticated.
5. **Everything expensive is CDN-cached; everything sensitive never leaves the backend's private network.**
6. **Cost-aware by design.** Every infra choice defaults to the lowest tier that still satisfies the enterprise security bar, because all recurring costs are client-borne (SOW 40) and the client explicitly asked for a lean monthly number (~₹1,300–4,000/month, Meeting 1).
7. **Build once for Phase 1, extend — never rebuild — for Phase 2/3.** Data model and service boundaries are designed up front (see Document 03) so Phase 2 (E-Commerce) and Phase 3 (Gift Registry) are additive modules inside the same backend, not new systems.

---

## 2. High-Level Architecture Diagram

```
                                   ┌───────────────────────────┐
                                   │        Cloudflare          │
                                   │  CDN + WAF + Image Resize  │
                                   │  (public assets, media)    │
                                   └─────────────┬──────────────┘
                                                 │
        ┌────────────────────────────────────────┼──────────────────────────────────────────┐
        │                                        │                                          │
        ▼                                        ▼                                          ▼
┌───────────────────┐                  ┌───────────────────┐                     ┌────────────────────┐
│   frontend (Next)  │                  │  admin (Next)      │                     │   Static Assets /   │
│   Vercel            │                  │  Vercel (separate  │                     │   Media (R2/Images) │
│   vaibhavcelebrations│                 │  project + subdom.)│                     │   via Cloudflare     │
│   .com              │                  │  admin.<domain>.com│                     │                      │
└──────────┬──────────┘                  └──────────┬──────────┘                    └──────────────────────┘
           │  HTTPS (public, cached)                │ HTTPS (auth-gated, private)
           │  fetch() / server actions              │ fetch() with admin JWT
           ▼                                        ▼
        ┌─────────────────────────────────────────────────────┐
        │                Backend API (Node + Express 5)        │
        │                Render (private network)               │
        │  ─ Public routes (rate-limited, CORS-locked)          │
        │  ─ Guest-verification routes (Order-ID + OTP)         │
        │  ─ Admin routes (JWT + RBAC, IP-optional allowlist)   │
        │  ─ Integration adapters: Razorpay, WhatsApp, SMTP,    │
        │    Cloudflare Images, Metadata-scraper                │
        │  ─ Background jobs: backups, registry-expiry,         │
        │    stock-alert, invoice PDF/queue, out-of-stock sweep │
        └───────────────────────┬───────────────────────────────┘
                                 │ Private network / VPC only — never public
                                 ▼
                    ┌─────────────────────────┐
                    │   PostgreSQL (managed)   │
                    │   Render / equivalent    │
                    │   Daily automated backup │
                    └─────────────────────────┘

        External services reached only from backend, never from browser:
        Razorpay API/Webhooks · WhatsApp Cloud/Business API · SMTP (Node Mailer)
        Google Search Console/Analytics (server-verified) · Cloudflare API (media upload)
```

**Why this shape satisfies the client's stated security requirement:** an attacker hitting the public website or even the admin UI never obtains a database connection string, a direct DB network path, or unrestricted API surface — everything is mediated by the backend's own authentication/authorization/validation layer, which is the _only_ system holding DB credentials and third-party API secrets.

---

## 3. Repository / Folder Responsibilities

The existing scaffolding is confirmed correct; no restructuring is required. Target internal structure for each:

### 3.1 `frontend/` (Next.js 16, App Router, Tailwind v4)

```
frontend/
  src/
    app/
      (marketing)/            → homepage, about, contact, FAQs
      themes/[slug]/          → theme listing + theme detail pages
      packages/                → package listing + comparison
      gallery/                 → tag-filterable gallery
      events/[slug]/           → event/campaign landing pages (template-based)
      blog/[slug]/              → blog listing + post template
      booking/                  → booking journey (date → theme → package → customize → checkout)
      order/lookup/              → Order-ID + Email-OTP guest access flow
      shop/                     → Phase 2: e-commerce storefront
      registry/[registryId]/    → Phase 3: guest-facing gift registry view
      api/revalidate/           → on-demand ISR revalidation webhook receiver (from Admin publish actions)
    components/                → design-system components (shared across route groups)
    lib/
      api-client.ts             → typed fetch wrapper to backend, server-only
      seo/                      → metadata + JSON-LD builders (see Doc 10)
      analytics/                → GA4/Meta Pixel/GTM loaders
    styles/
  public/
```

Rendering strategy: **ISR (Incremental Static Regeneration)** for Themes/Packages/Gallery/Blog/Events (content changes via Admin, revalidated on publish via a signed webhook to `/api/revalidate`), **SSR/dynamic** for booking/checkout/order-lookup (must always reflect live availability/inventory), **static** for legal/about pages.

### 3.2 `admin/` (Next.js 16, App Router, Tailwind v4)

```
admin/
  src/
    app/
      login/
      (dashboard)/
        cms/                    → themes, packages, gallery, testimonials, FAQs, events, popups, blog, legal pages, metadata
        crm/                    → customers, leads, consultations, bookings, calendar, invoices
        ecommerce/               → products, categories, inventory (Phase 2)
        registry/                 → gift registry oversight (Phase 3)
        settings/                 → capacity rules, GST rate, package tiers, integrations, users/roles, audit log
    components/
    lib/
      admin-api-client.ts        → typed fetch wrapper with JWT attach + refresh
```

Rendering strategy: everything **dynamic/CSR-behind-auth**; no ISR; `robots.txt` disallow-all + `<meta name="robots" content="noindex,nofollow">` on every route; not linked from `frontend`.

### 3.3 `backend/` (Node.js + Express 5 + TypeScript)

```
backend/
  src/
    config/                     → env loader, constants (GST default, capacity default, etc. — DB-overridable)
    modules/
      auth/                      → admin auth (JWT), guest-verification (Order-ID+OTP)
      themes/ packages/ gallery/ testimonials/ faqs/ events/ blog/ popups/ metadata/   (CMS-backed)
      bookings/ availability/ consultations/                                          (booking engine)
      checkout/ payments/ invoices/                                                    (commerce engine)
      customers/ leads/ crm/                                                           (CRM)
      products/ inventory/ cart/ ecommerce-checkout/                                   (Phase 2)
      registry/                                                                        (Phase 3)
      chatbot/                                                                         (static flow engine)
      media/                                                                           (Cloudflare upload adapter)
      notifications/                                                                   (email + WhatsApp senders)
      admin-users/ roles/ audit-log/
    jobs/                       → cron-style workers: backups trigger, registry-expiry sweep, stock alerts, out-of-stock auto-flag
    middleware/                 → auth guard, RBAC guard, rate-limit, validation (zod), error handler, request logger
    db/                         → Prisma (or Knex) schema + migrations + seed
    server.ts
  prisma/schema.prisma (recommended ORM — see 7)
```

### 3.4 `cdn/`

Configuration-only (no runtime service): Cloudflare zone settings, cache rules, image transformation presets, upload scripts, and documentation for rotating API tokens. Already scaffolded with `config/`, `docs/`, `scripts/`.

---

## 4. Technology Stack (Confirmed & Locked)

| Layer                     | Choice                                                       | Version (as scaffolded)                   | Rationale                                                                                                            |
| ------------------------- | ------------------------------------------------------------ | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Frontend framework        | Next.js (App Router)                                         | 16.2.10                                   | SEO-friendly SSR/ISR, matches client requirement                                                                     |
| Admin framework           | Next.js (App Router)                                         | 16.2.10                                   | Consistency with frontend, shared component patterns possible                                                        |
| UI runtime                | React                                                        | 19.2.4                                    | Ships with Next 16                                                                                                   |
| Styling                   | Tailwind CSS                                                 | v4                                        | Fast, consistent design tokens across frontend + admin                                                               |
| Backend runtime           | Node.js + Express                                            | Express 5.2.1                             | Client's stated stack; mature middleware ecosystem                                                                   |
| Backend language          | TypeScript                                                   | via `tsx` (dev) + `typescript`            | Type safety across a 3-person team is non-negotiable at enterprise quality bar                                       |
| Security middleware       | `helmet`, `cors`                                             | already installed                         | Baseline HTTP header hardening + strict CORS                                                                         |
| Config                    | `dotenv`                                                     | already installed                         | Env var loading; secrets never committed                                                                             |
| ORM                       | **Prisma** (recommended addition)                            | latest stable                             | Type-safe schema-as-code, first-class PostgreSQL migrations, works cleanly with a 3-phase additive schema            |
| Database                  | PostgreSQL                                                   | managed (Render/Neon/Supabase-compatible) | Matches SOW 34 explicitly                                                                                            |
| Validation                | **Zod** (recommended addition)                               | latest stable                             | Already a transitive dependency in both Next apps; reuse the same schema library backend-side for request validation |
| Auth (Admin)              | JWT (short-lived access + rotating refresh, httpOnly cookie) | —                                         | Stateless, horizontally scalable, no server session store required                                                   |
| Auth (Guest)              | One-time Order-ID + Email OTP, short-lived signed token      | —                                         | Matches SOW 4 exactly                                                                                                |
| Email                     | Nodemailer (SMTP)                                            | —                                         | Explicitly named in Meeting 1                                                                                        |
| WhatsApp                  | Meta Cloud API (default) or Twilio WhatsApp API (fallback)   | —                                         | See 6 below                                                                                                          |
| Payments                  | Razorpay Node SDK + webhooks                                 | —                                         | Explicitly named in SOW/meetings                                                                                     |
| Media/CDN                 | Cloudflare (CDN, Images or R2)                               | —                                         | Explicitly named in Meeting 1                                                                                        |
| Process manager (backend) | PM2 or platform-native (Render)                              | —                                         | Zero-downtime restarts                                                                                               |
| CI/CD                     | GitHub Actions → Vercel (auto) + Render (auto/deploy hook)   | —                                         | See 9                                                                                                                |

---

## 5. Hosting & Environments

| Environment    | Frontend                                      | Admin                                                                              | Backend                          | Database                                                                                  |
| -------------- | --------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------- |
| **Local Dev**  | `next dev` (localhost:3000)                   | `next dev` (localhost:3001)                                                        | `tsx watch` (localhost:4000)     | Local Postgres via Docker Compose (recommended) or shared dev DB (branch/schema-isolated) |
| **Staging**    | Vercel Preview (per-PR)                       | Vercel Preview (per-PR)                                                            | Render Preview / staging service | Staging Postgres instance (separate from prod)                                            |
| **Production** | Vercel Production — `vaibhavcelebrations.in` | Vercel Production — `admin.vaibhavcelebrations.in` (or a non-guessable subdomain) | Render Production service        | Render/managed Postgres Production instance                                               |

**Domain & DNS:** All DNS managed through Cloudflare (proxied, orange-clouded) for the apex + `www` (→ Vercel) and for the API subdomain, e.g. `api.vaibhavcelebrations.in` (→ Render), which additionally gives us Cloudflare's WAF/DDoS protection in front of the backend even though the backend itself is hosted on Render. The admin subdomain should **not** be a predictable name like `admin.` if the client agrees — a non-guessable subdomain (e.g., a project-specific slug) reduces automated scanning exposure as a defense-in-depth measure, at zero extra cost.

**Uptime rationale (Meeting 1):** Vercel is chosen for both Next apps specifically because Render's own hosting historically imposes maintenance windows that would hurt frontend SEO/uptime; Render is acceptable for the backend because API downtime is short-tolerable and recoverable, whereas homepage downtime directly harms SEO crawl consistency and paid-ad landing-page reliability.

---

## 6. Third-Party Integration Decisions

### 6.1 Payments — Razorpay

- Client owns the Razorpay account; provides live + test keys and configures a webhook URL pointing at `POST /api/v1/payments/webhook`.
- Backend verifies Razorpay webhook signatures (`X-Razorpay-Signature`) before trusting any payment-status update — **never trust the client-side "payment succeeded" callback alone**; the webhook is the source of truth for marking a booking/order `paid`.
- Order creation flow: `POST /orders` (pending) → Razorpay Order created server-side → client completes payment via Razorpay Checkout → webhook confirms → booking/order transitions to `confirmed` → invoice job triggers.

### 6.2 WhatsApp Provider Decision (Open Item — Track to Closure Early in Phase 1)

Meeting 1 references Twilio; Meeting 2 references a provider colloquially transcribed as "pillow" (most plausibly a WhatsApp BSP such as **Interakt, AiSensy, Gupshup, or Wati**, or a mis-transcription of "Meta Cloud API," referred to generically). Because the exact vendor was not conclusively settled on record, this document fixes the **decision process**, not a name:

| Option                                             | Pros                                                                                    | Cons                                                                            |
| -------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Meta Cloud API (direct)** — recommended default  | Lowest per-conversation cost (no BSP markup), official, most control                    | More setup steps (Meta Business verification), less turnkey template management |
| **Twilio WhatsApp API**                            | Fast to provision, excellent docs, mature Node SDK                                      | Per-message markup on top of Meta's conversation pricing                        |
| **BSP aggregator (Interakt/AiSensy/Gupshup/Wati)** | Turnkey template approval UI, easier for non-technical client to manage templates later | Additional monthly subscription fee on top of conversation cost                 |

**Recommendation:** Build the `notifications/whatsapp` adapter behind a single internal interface (`sendWhatsAppInvoice(to, payload)`), so switching providers later is a one-file change. Default the initial implementation to **Meta Cloud API direct** for lowest recurring cost, matching the client's cost-sensitivity expressed in Meeting 2. Finalize the concrete provider with the client within the first two weeks of Phase 1 (see Doc 05 "Foundation Services") since Meta Business verification has lead time (Meeting 1: "10 to 15 days").

### 6.3 Email — Nodemailer

- SMTP relay via a transactional email provider (recommend a reputable low-cost/free-tier transactional SMTP such as Brevo, Resend, or Zoho — final choice left to whichever the client can provision fastest; Nodemailer is provider-agnostic by design).
- All transactional email templates (OTP, invoice, booking confirmation, consultation ack, lead ack) live server-side as versioned templates, not hardcoded strings, so Chaitanya's Admin CMS work later can optionally expose subject-line/branding tweaks without a redeploy (Phase 1.x nice-to-have, not MVP-blocking).

### 6.4 Media/CDN — Cloudflare

- All user-facing images (gallery, theme, package, product, blog) are uploaded via the backend to Cloudflare (Images or R2 + Workers resizing), never uploaded directly from the browser to third-party storage without passing through backend validation (file-type, size, malware-scan hook point).
- Signed, time-limited upload URLs may be used to avoid routing large binary payloads through the Node process, but the backend still issues/validates every signed URL and records the resulting asset in the database (never trust an unregistered CDN URL).

### 6.5 Analytics/SEO — Google Search Console, GA4, Meta Pixel, GTM

See Document 10 for full implementation detail. Infra note: these are all client-side + one-time server verification (DNS/HTML file), no backend service dependency.

---

## 7. Data Layer

- **PostgreSQL**, chosen per SOW 34, is a strong fit given the genuinely relational nature of this domain (bookings ↔ packages ↔ customers ↔ invoices; products ↔ inventory ↔ orders; registries ↔ gift-links ↔ reservations).
- **Prisma** is the recommended ORM (new dependency, not yet installed) because:
  - Schema-as-code in `schema.prisma` gives all three developers a single readable source of truth for the data model (referenced heavily in Document 03).
  - Migrations are versioned and reviewable in PRs.
  - Generates fully-typed query client, reducing runtime bugs across a 3-person team working in parallel modules.
- **Connection pooling:** use PgBouncer or the managed provider's built-in pooler in production to avoid connection exhaustion under ad-driven traffic spikes.
- **Soft delete convention:** every business-critical table carries `deletedAt TIMESTAMP NULL`; all default Prisma queries go through a shared "active only" query helper/middleware so engineers cannot accidentally leak soft-deleted rows.

---

## 8. Security Architecture Summary

(Full detail in Document 09 — this section covers the _infrastructure-level_ controls only.)

1. **Network isolation:** Database has no public IP / is firewalled to accept connections only from the backend's egress IP range or private network peering, per provider capability.
2. **Reverse-proxy posture:** Cloudflare sits in front of both the apex domain and the API subdomain, providing WAF rules, rate limiting at the edge, and DDoS absorption before traffic ever reaches Vercel/Render.
3. **Backend-only secrets:** Razorpay keys, WhatsApp tokens, SMTP credentials, JWT signing secret, Cloudflare API token, and the DB connection string exist **only** as backend environment variables — never shipped to frontend/admin bundles (enforced by never prefixing them `NEXT_PUBLIC_` and by a pre-deploy secret-scan step, see Doc 09).
4. **Admin isolation:** Separate Vercel project + separate domain + `noindex` + JWT-guarded API routes + (optional, cost-free) IP allowlist for the admin's login endpoint if the client's office/team IPs are static enough to make this practical.
5. **Rate limiting:** applied at both Cloudflare (edge) and Express middleware (application) layers, especially on `POST /auth/*`, `POST /orders`, `POST /bookings`, `POST /order/lookup/otp` to prevent brute-force and booking-spam abuse.
6. **Input validation everywhere:** Zod schemas at every Express route boundary; no raw `req.body` passed into a query.
7. **Webhook authenticity:** Razorpay webhook signature verification is mandatory; WhatsApp/Meta webhook (for delivery status, if used) verified via its own signing secret.

---

## 9. CI/CD

- **Frontend & Admin:** connected directly to Vercel via GitHub integration — every PR gets a Preview Deployment; merge to `main` auto-deploys to Production. Environment variables managed per-environment in the Vercel dashboard (never committed).
- **Backend:** GitHub Actions workflow runs typecheck + lint + (Phase-1.x) automated tests on every PR; merge to `main` triggers a Render deploy hook. Database migrations run as an explicit, reviewed step (`prisma migrate deploy`) in the deploy pipeline — never auto-applied silently in a way that could destroy data.
- **Branching model & PR conventions:** see Document 11 "Git Workflow" (kept there since it's a _team process_ document, not infra).

---

## 10. Backup Strategy (SOW 36, Meeting 1)

- **Database:** Daily automated snapshot via the managed Postgres provider, retention per plan tier (documented once provider is finalized). Enabled from day one of production data existing (Meeting 1 — cost of enabling early is negligible vs. risk of pre-launch/ad-driven data loss).
- **Media:** Cloudflare-stored assets are durable by default (R2/Images); no additional backup job required beyond what Cloudflare provides, but the backend's `media` table (source of truth for which assets are "live"/referenced) is covered by the same DB backup.
- **Recovery drill:** a documented, tested restore procedure must exist before go-live (task tracked in Doc 05 "Go-Live Readiness Checklist") — an untested backup is not a backup.

---

## 11. Monitoring, Logging & Alerting

- **Application logs:** structured JSON logging (e.g., `pino`) on the backend, shipped to the hosting provider's log viewer at minimum; a low-cost log drain (e.g., Logtail/Axiom free tier) is a recommended cost-free upgrade once volume justifies it.
- **Error tracking:** a free-tier error tracker (e.g., Sentry free tier) wired into both `frontend`/`admin` (client-side) and `backend` (server-side) — catches payment/webhook failures, OTP failures, and booking race conditions early. This is a zero-recurring-cost enterprise-grade addition at MVP scale and directly supports the client's "quality over timeline" priority stated in Meeting 2.
- **Uptime monitoring:** a free-tier uptime checker (e.g., UptimeRobot/BetterStack free tier) pinging the public site, admin login page, and backend health-check endpoint (`GET /health`), alerting the team (not the client) on downtime.
- **Business metrics dashboard (Phase 1.x, admin-facing):** booking count/day, revenue/day, lead count/day, top themes — powered by existing CRM/booking tables, no separate analytics infra required.

---

## 12. Scaling Path (Beyond MVP Traffic)

Client's own estimate (Meeting 1) is intentionally conservative (~50 users/month at first), so Phase 1 infra defaults to the smallest viable tier. The documented upgrade path, so nobody re-architects later:

1. **Backend RAM/CPU tier bump** on Render as concurrent booking/checkout traffic grows (first and cheapest lever).
2. **Read replica / connection pooling tuning** on Postgres before considering a bigger instance.
3. **Cloudflare cache-everything rules** tightened further for static theme/gallery/blog pages to offload origin requests.
4. **Queue-based background jobs** (invoice generation, WhatsApp sending, metadata scraping for Gift Registry) — already designed as async jobs from Phase 1 (see "jobs/" in backend structure) so they can be moved to a dedicated worker/queue (e.g., BullMQ + Redis) without an API contract change, if volume ever requires it.
5. **CDN for admin static assets** only if admin traffic ever grows beyond internal-team scale (unlikely, but cheap to add).

---

## 13. Cost Summary (Client-Borne, Informative)

| Item                               | Estimated Monthly Cost                                    | Notes                                                                                                 |
| ---------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Vercel (frontend + admin)          | ₹0 (Hobby) → paid tier if commercial-use terms require it | Confirm Vercel's commercial-use policy for the client's paid product; budget for Pro tier if required |
| Render backend (starter tier)      | ~$7–9 (≈₹600–750)                                         | Per Meeting 1 estimate                                                                                |
| Render/managed Postgres            | Included in above or small add-on                         | 512MB RAM class at MVP scale                                                                          |
| Cloudflare CDN                     | ₹0 (Free plan)                                            | Images/R2 storage cost TBD at scale, to be confirmed before Phase 2 product-image volume grows        |
| Domain                             | Annual, client-borne, outside monthly figure              |                                                                                                       |
| Razorpay                           | Per-transaction (~2% + applicable fees)                   | Client-borne, not a fixed monthly cost                                                                |
| WhatsApp Business messaging        | Per-conversation (~₹1–2/session per Meeting 1 estimate)   | Client-borne                                                                                          |
| SMTP/email                         | ₹0 at MVP volume (free tier of chosen provider)           |                                                                                                       |
| Error tracking / uptime monitoring | ₹0 (free tiers)                                           |                                                                                                       |
| **Total fixed infra estimate**     | **≈₹1,300–4,000/month**                                   | Matches Meeting 1 client-communicated estimate                                                        |

This table should be revisited and reconfirmed against live provider pricing before the client is asked to provision any paid account, since pricing pages change over time and this document must not be treated as a live pricing source of truth.
