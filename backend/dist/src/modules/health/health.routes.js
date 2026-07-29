"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../../db/prisma");
const redis_1 = require("../../lib/redis");
exports.healthRouter = (0, express_1.Router)();
exports.healthRouter.get("/health", async (_req, res) => {
    // ── Database ────────────────────────────────────────────────────────────────
    let dbStatus = "unavailable";
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        dbStatus = "connected";
    }
    catch {
        // ignore
    }
    // ── Redis ───────────────────────────────────────────────────────────────────
    let redisStatus = "degraded";
    let redisLatencyMs = null;
    const redis = (0, redis_1.getRedisClient)();
    if (redis && (0, redis_1.isRedisReady)()) {
        try {
            const t0 = Date.now();
            await redis.ping();
            redisLatencyMs = Date.now() - t0;
            redisStatus = "ok";
        }
        catch {
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
//# sourceMappingURL=health.routes.js.map