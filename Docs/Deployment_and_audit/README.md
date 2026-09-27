# Deployment & Security Audit — Document Set

| # | Document | Read it when |
|---|---|---|
| 01 | [Security Audit Report](01-Security-Audit-Report.md) | You need the findings, severities, what was fixed, what is still recommended, and the post-deploy regression checklist |
| 02 | [Production Deployment Guide](02-Deployment-Guide.md) | You are deploying — Render, Docker + nginx (EC2/GCE/VPS), AWS ECS, or Google Cloud Run |
| 03 | [Architecture, Performance & Operations](03-Architecture-Performance-and-Operations.md) | You need the request flow, rate-limit table, backup/release process, and the list of every file changed |

**Quick start (single server):**
```bash
cp deploy/.env.example .env && cp deploy/env/backend.env.example deploy/env/backend.env   # then fill them in
docker compose -f docker-compose.prod.yml --profile tls up -d --build
```
Full steps, TLS issuance and verification commands are in the deployment guide (§4).

**Repository entry points:** `docker-compose.prod.yml` · `render.yaml` · `deploy/nginx/` · `backend|frontend|admin/Dockerfile` · `.github/workflows/ci.yml`
