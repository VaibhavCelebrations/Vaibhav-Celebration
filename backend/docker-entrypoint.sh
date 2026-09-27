#!/bin/sh
# Optionally apply pending Prisma migrations, then start the API.
# `migrate deploy` is safe to run repeatedly and from several replicas (Prisma takes an advisory lock).
# Leave RUN_MIGRATIONS unset on all but one instance / your release step if you prefer explicit control.
set -e

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "[entrypoint] Applying database migrations…"
  npx prisma migrate deploy
fi

exec "$@"
