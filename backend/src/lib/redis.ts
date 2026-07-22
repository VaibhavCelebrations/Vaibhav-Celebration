import Redis from "ioredis";
import { createHash } from "crypto";
import { env } from "../config/env";
import { logger } from "./logger";

// ─── Singleton Redis Client ───────────────────────────────────────────────────

let _redis: Redis | null = null;
let _isReady = false;

export function getRedisClient(): Redis | null {
  if (!env.REDIS_CACHE_ENABLED) return null;
  if (_redis) return _redis;

  try {
    const client = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      connectTimeout: 3000,
      retryStrategy(times) {
        if (times > 5) {
          logger.warn({ times }, "Redis: max retries reached — cache disabled");
          return null; // stop retrying
        }
        return Math.min(times * 200, 2000);
      },
      reconnectOnError(err) {
        logger.warn({ err: err.message }, "Redis: reconnecting after error");
        return true;
      },
    });

    client.on("connect", () => {
      _isReady = true;
      logger.info("Redis: connected");
    });
    client.on("ready", () => {
      _isReady = true;
    });
    client.on("error", (err) => {
      _isReady = false;
      logger.warn({ err: err.message }, "Redis: connection error — running without cache");
    });
    client.on("close", () => {
      _isReady = false;
    });

    // Initiate connection (non-blocking)
    client.connect().catch(() => {
      logger.warn("Redis: initial connect failed — cache disabled, falling back to DB");
    });

    _redis = client;
    return client;
  } catch (err) {
    logger.warn({ err }, "Redis: failed to initialise client");
    return null;
  }
}

export function isRedisReady(): boolean {
  return _isReady;
}

export async function disconnectRedis(): Promise<void> {
  if (_redis) {
    try {
      await _redis.quit();
    } catch {
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
export async function getCache<T>(key: string): Promise<T | null> {
  if (!env.REDIS_CACHE_ENABLED) return null;
  const client = getRedisClient();
  if (!client || !_isReady) return null;
  try {
    const raw = await client.get(key);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Write a JSON-serialised value to Redis with a TTL in seconds.
 * Silently no-ops on any error.
 */
export async function setCache(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!env.REDIS_CACHE_ENABLED) return;
  const client = getRedisClient();
  if (!client || !_isReady) return;
  try {
    await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // silent degradation
  }
}

/**
 * Delete one or more exact cache keys.
 */
export async function delCache(...keys: string[]): Promise<void> {
  if (!keys.length) return;
  const client = getRedisClient();
  if (!client || !_isReady) return;
  try {
    await client.del(...keys);
  } catch {
    // silent degradation
  }
}

/**
 * Delete all keys matching a Redis glob pattern using SCAN (non-blocking).
 * Example pattern: "pub:themes:*"
 */
export async function delPattern(pattern: string): Promise<void> {
  const client = getRedisClient();
  if (!client || !_isReady) return;
  try {
    const stream = client.scanStream({ match: pattern, count: 100 });
    const pipeline = client.pipeline();
    let queued = 0;
    for await (const keys of stream) {
      for (const key of keys as string[]) {
        pipeline.del(key);
        queued++;
      }
    }
    if (queued > 0) await pipeline.exec();
  } catch {
    // silent degradation
  }
}

/**
 * Hash an arbitrary object to a short hex string for use in cache keys.
 * Stable across calls for the same logical value.
 */
export function cacheKey(obj: unknown): string {
  return createHash("sha1").update(JSON.stringify(obj)).digest("hex").slice(0, 12);
}

/**
 * Convenience: read-through cache helper.
 * If the key is cached, returns it. Otherwise runs `fn`, caches the result, and returns it.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  const hit = await getCache<T>(key);
  if (hit !== null) return hit;
  const value = await fn();
  await setCache(key, value, ttlSeconds);
  return value;
}
