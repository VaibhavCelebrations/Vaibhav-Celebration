# 14 — Secrets Rotation Policy

**Owner:** Shubham Deshmukh  
**Applies to:** `backend/.env`, Vercel/Render environment stores, Cloudflare/Razorpay/WhatsApp/SMTP credentials

## Rules

1. **Never commit** real `.env` / `.env.local` files. Only `.env.example` files are tracked.
2. **Local `.env` values** are for development only. Production secrets live exclusively in:
   - Render Environment Group (backend)
   - Vercel Project Settings (frontend + admin)
   - Client-owned third-party dashboards (Razorpay, WhatsApp, Cloudflare, SMTP)
3. **Rotate immediately** when:
   - A team member offboards
   - A secret is accidentally shared (chat, screenshot, PR)
   - A provider reports a compromise
4. **JWT secrets** (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`): minimum 32 characters; regenerate with `openssl rand -base64 48`.
5. **Razorpay / WhatsApp / SMTP / Cloudflare** tokens: rotate in the provider console first, then update Render/Vercel env vars, then redeploy.
6. **Seed admin password** must be changed before any production deployment.

## Rotation checklist

- [ ] Generate new secret
- [ ] Update provider console (if third-party)
- [ ] Update Render / Vercel env vars
- [ ] Redeploy affected services
- [ ] Invalidate old sessions if JWT secret changed (all admins re-login)
- [ ] Confirm health checks + one smoke login succeed
