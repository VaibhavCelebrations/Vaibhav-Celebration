# Vaibhav Celebrations

Enterprise-grade celebration booking platform — public website, Admin CMS/CRM, and Booking & Commerce Engine.

| App | Stack | Local URL |
|---|---|---|
| `frontend/` | Next.js 16 | http://localhost:3000 |
| `admin/` | Next.js 16 | http://localhost:3001 |
| `backend/` | Node + Express + Prisma | http://localhost:4000 |
| `cdn/` | Cloudflare config | — |

## Documentation

See [`Docs/00-Master-Index.md`](./Docs/00-Master-Index.md) for the full engineering suite.

## Local setup (Phase 1.0)

```bash
# 1) Database (Postgres on localhost:5433 — avoids conflict with local Postgres on 5432)
docker compose up -d

# 2) Backend
cd backend
npm install
npx prisma migrate dev --name phase1_foundation
npm run db:seed
npm run dev

# 3) Frontend (new terminal) → http://localhost:3000
cd frontend
npm install
npm run dev

# 4) Admin (new terminal) → http://localhost:3001
cd admin
npm install
npm run dev
```

### Default admin (seed)

- URL: http://localhost:3001/login  
- Email: `admin@vaibhavcelebrations.com`  
- Password: `ChangeMe_SuperAdmin_123!`

Copy `.env.example` → `.env` / `.env.local` in each app before changing credentials for staging/production.
