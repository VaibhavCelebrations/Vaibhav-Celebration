# Admin Panel — Vercel Deployment Guide

> **Security notice**: The admin panel must **never** be indexed, linked from the public site, or exposed in sitemaps. It is accessed only via a direct URL shared internally.

---

## Overview

| Component | Host | URL |
|-----------|------|-----|
| Frontend (storefront) | Vercel | `https://www.vaibhavcelebrations.in` |
| Admin Panel | Vercel (separate project) | `https://vc-admin.vercel.app` or custom domain |
| Backend API | Render | `https://api.vaibhavcelebrations.in` |

---

## Pre-requisites

- Vercel account with access to the **Affor Technologies** team
- `admin/.env.production` filled out (see §3 below)
- Backend already deployed and reachable at `https://api.vaibhavcelebrations.in`

---

## 1. Create a New Vercel Project (admin only)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the **same** GitHub repository (`Vaibhav-Celebration`)
3. Set **Root Directory** → `admin`
4. Framework Preset → **Next.js** (auto-detected)
5. Build command → `npm run build` (default)
6. Output directory → `.next` (default)

> **Important**: Create this as a **separate** Vercel project from the frontend. Do **not** deploy both from the same project.

---

## 2. Security Settings (Vercel Dashboard)

### 2a. Password Protection (Recommended)
Go to **Project → Settings → Deployment Protection**
- Enable **Vercel Authentication** (SSO) or **Password Protection**
- This ensures only people with the password/SSO can access even the login page

### 2b. No Indexing (already enforced in code)
The admin already has two layers of no-index protection:
- `robots.ts` — returns `Disallow: /` blocking all crawlers at `/robots.txt`
- `layout.tsx` — injects `<meta name="robots" content="noindex,nofollow" />` on every page

No additional Vercel config needed for this.

### 2c. Custom Domain (optional)
If you want a custom domain like `admin.vaibhavcelebrations.in`:
1. Go to **Project → Settings → Domains**
2. Add `admin.vaibhavcelebrations.in`
3. Add a CNAME record in Cloudflare DNS:
   ```
   admin.vaibhavcelebrations.in  CNAME  cname.vercel-dns.com
   ```
4. Update `NEXT_PUBLIC_ADMIN_URL` in Vercel's environment variables to the new URL.

---

## 3. Environment Variables

Set these in **Vercel → Project → Settings → Environment Variables** for the **Production** environment:

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.vaibhavcelebrations.in/api/v1` | Live backend |
| `NEXT_PUBLIC_ADMIN_URL` | `https://vc-admin.vercel.app` | Or your custom domain |
| `NEXT_PUBLIC_SITE_URL` | `https://www.vaibhavcelebrations.in` | Public storefront |
| `NEXT_PUBLIC_USE_MOCK_DATA` | `false` | Always false in prod |

> **Do not commit `.env.production` to Git.** The `.gitignore` already excludes all `.env*` files. Set values directly in Vercel's dashboard.

The local `admin/.env.production` file is a **reference template** only — Vercel reads env vars from its dashboard, not from committed files.

---

## 4. Backend CORS — Update if admin URL changes

The backend's `backend/.env.production` `CORS_ORIGINS` currently includes:
```
CORS_ORIGINS=https://vaibhavcelebrations.in,https://www.vaibhavcelebrations.in,https://vaibhav-celebration-seven.vercel.app
```

If the admin Vercel URL is different (e.g., `vc-admin.vercel.app`), add it to CORS_ORIGINS and redeploy the backend on Render:
```
CORS_ORIGINS=https://vaibhavcelebrations.in,https://www.vaibhavcelebrations.in,https://vc-admin.vercel.app
```

---

## 5. Vercel Project Settings Checklist

| Setting | Value |
|---|---|
| Root Directory | `admin` |
| Framework | Next.js |
| Node.js Version | 20.x |
| Build Command | `npm run build` |
| Install Command | `npm ci` |
| Output Directory | `.next` |
| Deployment Protection | Enable password or Vercel Auth |

---

## 6. Deploy

```bash
# Option A — Push to the tracked branch (auto-deploy via GitHub integration)
git push origin main

# Option B — Manual deploy via Vercel CLI
npx vercel --prod --cwd admin
```

---

## 7. Post-Deploy Verification

After deployment, verify:

- [ ] `https://<admin-url>/robots.txt` returns `Disallow: /`
- [ ] Opening `https://<admin-url>` in incognito prompts for password (if Vercel Auth enabled) or shows login page
- [ ] View source contains `<meta name="robots" content="noindex,nofollow">`
- [ ] API calls from the admin panel reach `https://api.vaibhavcelebrations.in/api/v1`
- [ ] Admin login works with credentials from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
- [ ] The admin URL is **not** linked anywhere on `vaibhavcelebrations.in`

---

## 8. Access Control

Access is restricted by three layers:
1. **URL obscurity** — not published or linked anywhere public
2. **Admin credentials** — email + password login required
3. **Vercel Deployment Protection** *(optional but strongly recommended)* — extra auth gate before the login page

Share the admin URL only with authorised team members via a secure channel (WhatsApp / internal email — never in a public document or commit).
