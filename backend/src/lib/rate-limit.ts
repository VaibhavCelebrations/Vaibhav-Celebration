import type { Request } from "express";
import { rateLimit, ipKeyGenerator, type Options } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { getRedisClient } from "./redis";
import { logger } from "./logger";

type LimiterOptions = Partial<Options> & {
  /** Unique per limiter — becomes the Redis key prefix so counters never collide. */
  name: string;
  windowMs: number;
  max: number;
  message: string;
  code?: string;
};

/**
 * Rate limiter backed by Redis when available (counters are shared across every API instance,
 * survive restarts, and cannot be dodged by hitting a different replica). With Redis disabled
 * (REDIS_CACHE_ENABLED=false) it uses a per-process memory store. If Redis is configured but
 * unreachable, requests are let through (`passOnStoreError`, fail-open): an infrastructure blip
 * degrades rate-limit protection rather than taking the whole API down. Failures are logged by
 * the Redis client, and nginx applies its own edge rate limits as a second layer.
 */
export function createLimiter({ name, windowMs, max, message, code = "RATE_LIMITED", ...rest }: LimiterOptions) {
  const redis = getRedisClient();
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true,
    ...(redis
      ? {
          store: new RedisStore({
            prefix: `rl:${name}:`,
            sendCommand: (command: string, ...args: string[]) =>
              redis.call(command, ...args) as Promise<number | string | Array<number | string>>,
          }),
        }
      : {}),
    handler: (req, res, _next, options) => {
      logger.warn({ limiter: name, ip: req.ip, path: req.originalUrl }, "Rate limit exceeded");
      res.status(options.statusCode).json({ success: false, error: { code, message } });
    },
    ...rest,
  });
}

/** Key by the client IP (IPv6-safe). Behind a proxy, `req.ip` is correct only when TRUST_PROXY matches the real hop count. */
export const ipKey = (req: Request) => `ip:${ipKeyGenerator(req.ip ?? "unknown")}`;
