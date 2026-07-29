"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisClient = getRedisClient;
exports.isRedisReady = isRedisReady;
exports.disconnectRedis = disconnectRedis;
exports.getCache = getCache;
exports.setCache = setCache;
exports.delCache = delCache;
exports.delPattern = delPattern;
exports.cacheKey = cacheKey;
exports.cached = cached;
const ioredis_1 = __importDefault(require("ioredis"));
const crypto_1 = require("crypto");
const env_1 = require("../config/env");
const logger_1 = require("./logger");
// ─── Singleton Redis Client ───────────────────────────────────────────────────
let _redis = null;
let _isReady = false;
function getRedisClient() {
    if (!env_1.env.REDIS_CACHE_ENABLED)
        return null;
    if (_redis)
        return _redis;
    try {
        const client = new ioredis_1.default(env_1.env.REDIS_URL, {
            lazyConnect: true,
            maxRetriesPerRequest: 2,
            connectTimeout: 3000,
            retryStrategy(times) {
                if (times > 5) {
                    logger_1.logger.warn({ times }, "Redis: max retries reached — cache disabled");
                    return null; // stop retrying
                }
                return Math.min(times * 200, 2000);
            },
            reconnectOnError(err) {
                logger_1.logger.warn({ err: err.message }, "Redis: reconnecting after error");
                return true;
            },
        });
        client.on("connect", () => {
            _isReady = true;
            logger_1.logger.info("Redis: connected");
        });
        client.on("ready", () => {
            _isReady = true;
        });
        client.on("error", (err) => {
            _isReady = false;
            logger_1.logger.warn({ err: err.message }, "Redis: connection error — running without cache");
        });
        client.on("close", () => {
            _isReady = false;
        });
        // Initiate connection (non-blocking)
        client.connect().catch(() => {
            logger_1.logger.warn("Redis: initial connect failed — cache disabled, falling back to DB");
        });
        _redis = client;
        return client;
    }
    catch (err) {
        logger_1.logger.warn({ err }, "Redis: failed to initialise client");
        return null;
    }
}
function isRedisReady() {
    return _isReady;
}
async function disconnectRedis() {
    if (_redis) {
        try {
            await _redis.quit();
        }
        catch {
            _redis.disconnect();
        }
        _redis = null;
        _isReady = false;
    }
}
// ─── Cache Helpers ────────────────────────────────────────────────────────────
/**
 * Read a JSON-serialised value from Redis.
 * Returns null on any error (including Redis being unavailable).
 */
async function getCache(key) {
    if (!env_1.env.REDIS_CACHE_ENABLED)
        return null;
    const client = getRedisClient();
    if (!client || !_isReady)
        return null;
    try {
        const raw = await client.get(key);
        if (raw == null)
            return null;
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
/**
 * Write a JSON-serialised value to Redis with a TTL in seconds.
 * Silently no-ops on any error.
 */
async function setCache(key, value, ttlSeconds) {
    if (!env_1.env.REDIS_CACHE_ENABLED)
        return;
    const client = getRedisClient();
    if (!client || !_isReady)
        return;
    try {
        await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
    }
    catch {
        // silent degradation
    }
}
/**
 * Delete one or more exact cache keys.
 */
async function delCache(...keys) {
    if (!keys.length)
        return;
    const client = getRedisClient();
    if (!client || !_isReady)
        return;
    try {
        await client.del(...keys);
    }
    catch {
        // silent degradation
    }
}
/**
 * Delete all keys matching a Redis glob pattern using SCAN (non-blocking).
 * Example pattern: "pub:themes:*"
 */
async function delPattern(pattern) {
    const client = getRedisClient();
    if (!client || !_isReady)
        return;
    try {
        const stream = client.scanStream({ match: pattern, count: 100 });
        const pipeline = client.pipeline();
        let queued = 0;
        for await (const keys of stream) {
            for (const key of keys) {
                pipeline.del(key);
                queued++;
            }
        }
        if (queued > 0)
            await pipeline.exec();
    }
    catch {
        // silent degradation
    }
}
/**
 * Hash an arbitrary object to a short hex string for use in cache keys.
 * Stable across calls for the same logical value.
 */
function cacheKey(obj) {
    return (0, crypto_1.createHash)("sha1").update(JSON.stringify(obj)).digest("hex").slice(0, 12);
}
/**
 * Convenience: read-through cache helper.
 * If the key is cached, returns it. Otherwise runs `fn`, caches the result, and returns it.
 */
async function cached(key, ttlSeconds, fn) {
    const hit = await getCache(key);
    if (hit !== null)
        return hit;
    const value = await fn();
    await setCache(key, value, ttlSeconds);
    return value;
}
//# sourceMappingURL=redis.js.map