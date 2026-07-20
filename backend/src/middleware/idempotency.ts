import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";

/**
 * Lightweight in-memory idempotency for payment-adjacent POSTs.
 * Production can swap for Redis; sufficient for single-instance Phase 1.
 */
const store = new Map<string, { status: number; body: unknown; expiresAt: number }>();
const TTL_MS = 24 * 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store) {
    if (v.expiresAt < now) store.delete(k);
  }
}, 60_000).unref?.();

export function idempotency(req: Request, res: Response, next: NextFunction) {
  const key = req.header("Idempotency-Key");
  if (!key) {
    return next();
  }

  const cached = store.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return res.status(cached.status).json(cached.body);
  }

  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      store.set(key, {
        status: res.statusCode,
        body,
        expiresAt: Date.now() + TTL_MS,
      });
    }
    return originalJson(body);
  }) as typeof res.json;

  return next();
}

export function newIdempotencyKey() {
  return randomUUID();
}
