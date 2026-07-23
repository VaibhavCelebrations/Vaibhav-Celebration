import type { NextFunction, Request, Response } from "express";

/**
 * P3 — Admin response caching prevention.
 *
 * Adds `Cache-Control: no-store, private` to every response on admin routes.
 * This prevents browsers and intermediate proxies (CDN, shared caches) from
 * storing sensitive admin data, PII, or operational intelligence — even when
 * ETags / 304 responses are generated.
 *
 * Apply ONLY to admin routes:
 *   api.use("/admin/...", noStore, router);
 */
export function noStore(_req: Request, res: Response, next: NextFunction): void {
  res.set("Cache-Control", "no-store, private");
  next();
}
