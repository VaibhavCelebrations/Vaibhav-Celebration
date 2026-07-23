import { param } from "../../lib/params";
import { AdminRole, CapacityScope } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { NotFoundError } from "../../lib/errors";
import { created, ok } from "../../lib/response";
import { toDateOnly } from "../../lib/validators";
import { requireAdmin, requireRoles } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { invalidateSettingsCache } from "../../lib/settings";
import { delPattern, isRedisReady, getRedisClient } from "../../lib/redis";

export const adminCapacityRouter = Router();
adminCapacityRouter.use(requireAdmin, requireRoles(AdminRole.OPERATIONS, AdminRole.SUPER_ADMIN));

adminCapacityRouter.get("/", async (_req, res, next) => {
  try {
    const rules = await prisma.bookingCapacityRule.findMany({ orderBy: { updatedAt: "desc" } });
    return ok(res, rules);
  } catch (err) {
    return next(err);
  }
});

adminCapacityRouter.post(
  "/",
  validate(
    z.object({
      scope: z.nativeEnum(CapacityScope),
      specificDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
      maxBookingsPerDay: z.number().int().min(0),
      isBlocked: z.boolean().optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const body = req.body as {
        scope: CapacityScope;
        specificDate?: string | null;
        maxBookingsPerDay: number;
        isBlocked?: boolean;
      };
      if (body.scope === CapacityScope.SPECIFIC_DATE && !body.specificDate) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "specificDate required for SPECIFIC_DATE" },
        });
      }
      const rule = await prisma.bookingCapacityRule.create({
        data: {
          scope: body.scope,
          specificDate: body.specificDate ? toDateOnly(body.specificDate) : null,
          maxBookingsPerDay: body.maxBookingsPerDay,
          isBlocked: body.isBlocked ?? false,
        },
      });
      return created(res, rule);
    } catch (err) {
      return next(err);
    }
  },
);

adminCapacityRouter.put(
  "/:id",
  validate(z.object({ id: z.string().min(1) }), "params"),
  validate(
    z.object({
      maxBookingsPerDay: z.number().int().min(0).optional(),
      isBlocked: z.boolean().optional(),
      specificDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    }),
  ),
  async (req, res, next) => {
    try {
      const existing = await prisma.bookingCapacityRule.findUnique({ where: { id: param(req, "id") } });
      if (!existing) throw new NotFoundError("Capacity rule not found");
      const body = req.body as {
        maxBookingsPerDay?: number;
        isBlocked?: boolean;
        specificDate?: string | null;
      };
      const rule = await prisma.bookingCapacityRule.update({
        where: { id: param(req, "id") },
        data: {
          maxBookingsPerDay: body.maxBookingsPerDay,
          isBlocked: body.isBlocked,
          specificDate:
            body.specificDate === undefined
              ? undefined
              : body.specificDate
                ? toDateOnly(body.specificDate)
                : null,
        },
      });
      return ok(res, rule);
    } catch (err) {
      return next(err);
    }
  },
);

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
