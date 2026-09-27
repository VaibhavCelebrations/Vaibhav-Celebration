# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────────────────────
# Vaibhav Celebrations API — production image
#   • multi-stage: build tooling never ships
#   • non-root user, tini as PID 1 (correct signal handling → graceful shutdown)
#   • prisma migrations run on demand (RUN_MIGRATIONS=true), never implicitly
# Build:  docker build -t vc-backend ./backend
# ─────────────────────────────────────────────────────────────────────────────
ARG NODE_VERSION=22

# ── 1. deps: full dev dependency set for compiling ───────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS deps
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
# postinstall runs `prisma generate`, which needs the schema present
COPY prisma ./prisma
RUN npm ci

# ── 2. build: TypeScript → dist ──────────────────────────────────────────────
FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── 3. prod-deps: runtime dependencies only ──────────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS prod-deps
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npm cache clean --force

# ── 4. runtime ───────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates tini \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    PORT=4000 \
    NODE_OPTIONS="--max-old-space-size=384"
WORKDIR /app

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json prisma.config.ts ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node assets ./assets
COPY --chown=node:node docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
    && mkdir -p /app/uploads && chown node:node /app/uploads

USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--", "docker-entrypoint.sh"]
CMD ["node", "dist/src/server.js"]
