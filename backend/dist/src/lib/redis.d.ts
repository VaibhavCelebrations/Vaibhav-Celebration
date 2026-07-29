import Redis from "ioredis";
export declare function getRedisClient(): Redis | null;
export declare function isRedisReady(): boolean;
export declare function disconnectRedis(): Promise<void>;
/**
 * Read a JSON-serialised value from Redis.
 * Returns null on any error (including Redis being unavailable).
 */
export declare function getCache<T>(key: string): Promise<T | null>;
/**
 * Write a JSON-serialised value to Redis with a TTL in seconds.
 * Silently no-ops on any error.
 */
export declare function setCache(key: string, value: unknown, ttlSeconds: number): Promise<void>;
/**
 * Delete one or more exact cache keys.
 */
export declare function delCache(...keys: string[]): Promise<void>;
/**
 * Delete all keys matching a Redis glob pattern using SCAN (non-blocking).
 * Example pattern: "pub:themes:*"
 */
export declare function delPattern(pattern: string): Promise<void>;
/**
 * Hash an arbitrary object to a short hex string for use in cache keys.
 * Stable across calls for the same logical value.
 */
export declare function cacheKey(obj: unknown): string;
/**
 * Convenience: read-through cache helper.
 * If the key is cached, returns it. Otherwise runs `fn`, caches the result, and returns it.
 */
export declare function cached<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T>;
