import { Router } from "express";
import { prisma } from "../../db/prisma";
import { getRedisClient, isRedisReady } from "../../lib/redis";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  // ── Database ────────────────────────────────────────────────────────────────
  let dbStatus: "connected" | "unavailable" = "unavailable";
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch {
    // ignore
  }

  // ── Redis ───────────────────────────────────────────────────────────────────
  let redisStatus: "ok" | "degraded" = "degraded";
  let redisLatencyMs: number | null = null;
  const redis = getRedisClient();
  if (redis && isRedisReady()) {
    try {
      const t0 = Date.now();
      await redis.ping();
      redisLatencyMs = Date.now() - t0;
      redisStatus = "ok";
    } catch {
      // ignore
    }
  }

  const healthy = dbStatus === "connected";

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    data: {
      status: healthy ? "ok" : "degraded",
      service: "vaibhav-celebrations-api",
      database: dbStatus,
      redis: { status: redisStatus, latency_ms: redisLatencyMs },
      timestamp: new Date().toISOString(),
    },
  });
});
