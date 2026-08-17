import { AdminRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { ok } from "../../lib/response";
import { requireAdmin, requireRoles } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { invalidateSettingsCache } from "../../lib/settings";
import { delPattern, isRedisReady, getRedisClient } from "../../lib/redis";
import { getAdminCalendar } from "./calendar.service";

export const adminSettingsRouter = Router();
adminSettingsRouter.use(requireAdmin, requireRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS));

adminSettingsRouter.get("/", async (_req, res, next) => {
  try {
    const settings = await prisma.operationalSetting.findMany({ orderBy: { key: "asc" } });
    return ok(res, settings);
  } catch (err) {
    return next(err);
  }
});

adminSettingsRouter.put(
  "/",
  validate(z.object({ settings: z.array(z.object({ key: z.string().min(1), value: z.string() })).min(1) })),
  async (req, res, next) => {
    try {
      const updates = [];
      for (const s of req.body.settings as Array<{ key: string; value: string }>) {
        updates.push(
          await prisma.operationalSetting.upsert({
            where: { key: s.key },
            create: { key: s.key, value: s.value },
            update: { value: s.value },
          }),
        );
      }
      invalidateSettingsCache();
      return ok(res, updates);
    } catch (err) {
      return next(err);
    }
  },
);

export const adminAuditRouter = Router();
adminAuditRouter.use(requireAdmin, requireRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS));

adminAuditRouter.get(
  "/",
  validate(
    z.object({
      page: z.coerce.number().optional(),
      pageSize: z.coerce.number().optional(),
      entityType: z.string().optional(),
      action: z.string().optional(),
    }),
    "query",
  ),
  async (req, res, next) => {
    try {
      const page = Math.max(1, Number(req.query.page ?? 1));
      const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
      const where: { entityType?: string; action?: string } = {};
      if (typeof req.query.entityType === "string") where.entityType = req.query.entityType;
      if (typeof req.query.action === "string") where.action = req.query.action;

      const [total, items] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          include: { adminUser: { select: { name: true, email: true, role: true } } },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);
      return ok(res, items, {
        pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
      });
    } catch (err) {
      return next(err);
    }
  },
);

export const adminCalendarRouter = Router();
adminCalendarRouter.use(requireAdmin, requireRoles(AdminRole.OPERATIONS, AdminRole.SUPER_ADMIN));

adminCalendarRouter.get(
  "/",
  validate(
    z.object({
      view: z.enum(["day", "week", "month"]).default("month"),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
    "query",
  ),
  async (req, res, next) => {
    try {
      const { view, date } = req.query as unknown as { view: "day" | "week" | "month"; date: string };
      return ok(res, await getAdminCalendar(view, date));
    } catch (err) {
      return next(err);
    }
  },
);

// ── Cache Purge ──────────────────────────────────────────────────────────────
export const adminCacheRouter = Router();
adminCacheRouter.use(requireAdmin, requireRoles(AdminRole.SUPER_ADMIN));

/**
 * POST /admin/cache/purge
 * Flushes all pub:*, adm:*, settings:*, avail:* keys from Redis.
 * Use after bulk imports, emergency fixes, or schema changes.
 */
adminCacheRouter.post("/purge", async (_req, res, next) => {
  try {
    const redis = getRedisClient();
    if (!redis || !isRedisReady()) {
      return ok(res, { purged: false, reason: "Redis unavailable" });
    }
    await Promise.all([
      delPattern("pub:*"),
      delPattern("adm:*"),
      delPattern("settings:*"),
      delPattern("avail:*"),
    ]);
    invalidateSettingsCache();
    return ok(res, { purged: true, timestamp: new Date().toISOString() });
  } catch (err) {
    return next(err);
  }
});
