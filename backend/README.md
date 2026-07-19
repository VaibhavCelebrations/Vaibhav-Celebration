# Vaibhav Celebrations — Backend API

Node.js + Express 5 + TypeScript + Prisma + PostgreSQL.

## Quick start

```bash
# From repo root — start Postgres
docker compose up -d

# In backend/
npm install
npx prisma migrate dev --name phase1_foundation
npm run db:seed
npm run dev
```

API listens on `http://localhost:4000`  
Health: `GET /health`  
Auth: `POST /api/v1/auth/admin/login`

Default seed admin (change immediately in production):

- Email: `admin@vaibhavcelebrations.in`
- Password: `ChangeMe_SuperAdmin_123!`

## Environment

Copy `.env.example` → `.env`. See Document 09 for secrets rotation policy.
