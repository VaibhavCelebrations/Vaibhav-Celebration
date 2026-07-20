import { Router } from "express";
import { prisma } from "../../db/prisma";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      data: {
        status: "ok",
        service: "vaibhav-celebrations-api",
        database: "connected",
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    res.status(503).json({
      success: false,
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "Database unavailable",
      },
    });
  }
});
