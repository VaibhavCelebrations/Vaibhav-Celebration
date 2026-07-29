"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.idempotency = idempotency;
exports.newIdempotencyKey = newIdempotencyKey;
const crypto_1 = require("crypto");
const redis_1 = require("../lib/redis");
const TTL_SECONDS = 24 * 60 * 60; // 24 hours
// ─── In-memory fallback (used when Redis is unavailable) ──────────────────────
const _memStore = new Map();
const TTL_MS = TTL_SECONDS * 1000;
setInterval(() => {
    const now = Date.now();
    for (const [k, v] of _memStore) {
        if (v.expiresAt < now)
            _memStore.delete(k);
    }
}, 60_000).unref?.();
function idempotency(req, res, next) {
    const key = req.header("Idempotency-Key");
    if (!key)
        return next();
    const redis = (0, redis_1.getRedisClient)();
    if (redis && (0, redis_1.isRedisReady)()) {
        // Redis path: SET NX EX for true distributed idempotency
        const redisKey = `idempotency:${key}`;
        redis
            .get(redisKey)
            .then((raw) => {
            if (raw) {
                try {
                    const cached = JSON.parse(raw);
                    return res.status(cached.status).json(cached.body);
                }
                catch {
                    // corrupted — fall through and re-run
                }
            }
            // Intercept the response
            const originalJson = res.json.bind(res);
            res.json = ((body) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    const payload = JSON.stringify({ status: res.statusCode, body });
                    void redis.set(redisKey, payload, "EX", TTL_SECONDS);
                }
                return originalJson(body);
            });
            next();
        })
            .catch(() => {
            // Redis error — fall back to in-memory
            _runMemIdempotency(key, res, next);
        });
    }
    else {
        _runMemIdempotency(key, res, next);
    }
    // Return void explicitly so TypeScript is happy
    return;
}
function _runMemIdempotency(key, res, next) {
    const cached = _memStore.get(key);
    if (cached && cached.expiresAt > Date.now()) {
        return res.status(cached.status).json(cached.body);
    }
    const originalJson = res.json.bind(res);
    res.json = ((body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            _memStore.set(key, {
                status: res.statusCode,
                body,
                expiresAt: Date.now() + TTL_MS,
            });
        }
        return originalJson(body);
    });
    return next();
}
function newIdempotencyKey() {
    return (0, crypto_1.randomUUID)();
}
//# sourceMappingURL=idempotency.js.map