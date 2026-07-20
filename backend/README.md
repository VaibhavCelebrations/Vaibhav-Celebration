# Vaibhav Celebrations — Backend API

Node.js + Express 5 + TypeScript + Prisma + PostgreSQL.

Phase 1 complete: CMS, booking engine, pricing, payments/webhooks, invoicing, CRM, guest OTP, chatbot, capacity settings.

## Quick start

```bash
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

API: `http://localhost:4000`  
Health: `GET /health`  
Prefix: `/api/v1`

### Seed admin
- Email: `admin@vaibhavcelebrations.in`
- Password: `ChangeMe_SuperAdmin_123!`

## Key public routes

| Area | Paths |
|------|--------|
| Auth | `POST /auth/admin/login`, `/refresh`, `/logout`, `GET /auth/admin/me` |
| Guest OTP | `POST /guest/lookup/request-otp`, `/verify-otp`, `GET /guest/booking/:code` |
| Themes | `GET /themes`, `GET /themes/:slug` |
| Packages | `GET /packages`, `/packages/compare?ids=`, `/packages/:slug` |
| Pricing | `POST /pricing/quote` |
| Gallery / content | `GET /gallery`, `/testimonials`, `/faqs`, `/popups/active`, `/legal/:type`, `/metadata/:pageKey` |
| Blog | `GET /blog`, `/blog/:slug` |
| Events | `GET /events/templates`, `/events`, `/events/:slug`, `POST /events/:slug/register` |
| Booking | `GET /availability`, `/availability/range`, `POST /bookings`, `POST /checkout/booking/:code/summary` |
| Payments | `POST /payments/razorpay/order`, `POST /payments/webhook` |
| Consultations / leads | `POST /consultations`, `POST /leads/contact-form` |
| Chatbot | `GET /chatbot/flow`, `POST /chatbot/session` |

## Event page templates (3 choices)

Admin picks one per event (`Event.pageTemplate`):

1. **CLASSIC_HERO** — warm traditional full-bleed hero
2. **EDITORIAL_SPLIT** — premium magazine split layout
3. **FESTIVE_IMMERSIVE** — bold campaign/ad landing layout

`GET /api/v1/events/templates` returns design metadata for the picker + frontend renderers.

## Admin routes

Mounted under `/api/v1/admin/*` (Bearer JWT): themes, packages, gallery, testimonials, faqs, popups, legal, metadata, blog, events (+ registrations), media, bookings (+ calendar), invoices (+ export/resend), consultations, leads, customers (+ notes), chatbot flow, capacity-rules, settings, audit-log.

## Environment

Copy `.env.example` → `.env`. Razorpay / SMTP / WhatsApp are optional in local — flows degrade gracefully (mock Razorpay orders, skipped email/WhatsApp with logs).
