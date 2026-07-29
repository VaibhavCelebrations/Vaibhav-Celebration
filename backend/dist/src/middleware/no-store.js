"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.noStore = noStore;
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
function noStore(_req, res, next) {
    res.set("Cache-Control", "no-store, private");
    next();
}
//# sourceMappingURL=no-store.js.map