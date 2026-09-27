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
  const redis = getRedisClient();
  if (redis && isRedisReady()) {
    try {
      await redis.ping();
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
      redis: { status: redisStatus },
      timestamp: new Date().toISOString(),
    },
  });
});
