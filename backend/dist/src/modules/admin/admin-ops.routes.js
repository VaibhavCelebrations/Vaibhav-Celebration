"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminCacheRouter = exports.adminAuditRouter = exports.adminSettingsRouter = exports.adminCapacityRouter = void 0;
const params_1 = require("../../lib/params");
const client_1 = require("@prisma/client");
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../../db/prisma");
const errors_1 = require("../../lib/errors");
const response_1 = require("../../lib/response");
const validators_1 = require("../../lib/validators");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const settings_1 = require("../../lib/settings");
const redis_1 = require("../../lib/redis");
exports.adminCapacityRouter = (0, express_1.Router)();
exports.adminCapacityRouter.use(auth_1.requireAdmin, (0, auth_1.requireRoles)(client_1.AdminRole.OPERATIONS, client_1.AdminRole.SUPER_ADMIN));
exports.adminCapacityRouter.get("/", async (_req, res, next) => {
    try {
        const rules = await prisma_1.prisma.bookingCapacityRule.findMany({ orderBy: { updatedAt: "desc" } });
        return (0, response_1.ok)(res, rules);
    }
    catch (err) {
        return next(err);
    }
});
exports.adminCapacityRouter.post("/", (0, validate_1.validate)(zod_1.z.object({
    scope: zod_1.z.nativeEnum(client_1.CapacityScope),
    specificDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    maxBookingsPerDay: zod_1.z.number().int().min(0),
    isBlocked: zod_1.z.boolean().optional(),
})), async (req, res, next) => {
    try {
        const body = req.body;
        if (body.scope === client_1.CapacityScope.SPECIFIC_DATE && !body.specificDate) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "specificDate required for SPECIFIC_DATE" },
            });
        }
        const rule = await prisma_1.prisma.bookingCapacityRule.create({
            data: {
                scope: body.scope,
                specificDate: body.specificDate ? (0, validators_1.toDateOnly)(body.specificDate) : null,
                maxBookingsPerDay: body.maxBookingsPerDay,
                isBlocked: body.isBlocked ?? false,
            },
        });
        return (0, response_1.created)(res, rule);
    }
    catch (err) {
        return next(err);
    }
});
exports.adminCapacityRouter.put("/:id", (0, validate_1.validate)(zod_1.z.object({ id: zod_1.z.string().min(1) }), "params"), (0, validate_1.validate)(zod_1.z.object({
    maxBookingsPerDay: zod_1.z.number().int().min(0).optional(),
    isBlocked: zod_1.z.boolean().optional(),
    specificDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
})), async (req, res, next) => {
    try {
        const existing = await prisma_1.prisma.bookingCapacityRule.findUnique({ where: { id: (0, params_1.param)(req, "id") } });
        if (!existing)
            throw new errors_1.NotFoundError("Capacity rule not found");
        const body = req.body;
        const rule = await prisma_1.prisma.bookingCapacityRule.update({
            where: { id: (0, params_1.param)(req, "id") },
            data: {
                maxBookingsPerDay: body.maxBookingsPerDay,
                isBlocked: body.isBlocked,
                specificDate: body.specificDate === undefined
                    ? undefined
                    : body.specificDate
                        ? (0, validators_1.toDateOnly)(body.specificDate)
                        : null,
            },
        });
        return (0, response_1.ok)(res, rule);
    }
    catch (err) {
        return next(err);
    }
});
exports.adminSettingsRouter = (0, express_1.Router)();
exports.adminSettingsRouter.use(auth_1.requireAdmin, (0, auth_1.requireRoles)(client_1.AdminRole.SUPER_ADMIN, client_1.AdminRole.OPERATIONS));
exports.adminSettingsRouter.get("/", async (_req, res, next) => {
    try {
        const settings = await prisma_1.prisma.operationalSetting.findMany({ orderBy: { key: "asc" } });
        return (0, response_1.ok)(res, settings);
    }
    catch (err) {
        return next(err);
    }
});
exports.adminSettingsRouter.put("/", (0, validate_1.validate)(zod_1.z.object({ settings: zod_1.z.array(zod_1.z.object({ key: zod_1.z.string().min(1), value: zod_1.z.string() })).min(1) })), async (req, res, next) => {
    try {
        const updates = [];
        for (const s of req.body.settings) {
            updates.push(await prisma_1.prisma.operationalSetting.upsert({
                where: { key: s.key },
                create: { key: s.key, value: s.value },
                update: { value: s.value },
            }));
        }
        (0, settings_1.invalidateSettingsCache)();
        return (0, response_1.ok)(res, updates);
    }
    catch (err) {
        return next(err);
    }
});
exports.adminAuditRouter = (0, express_1.Router)();
exports.adminAuditRouter.use(auth_1.requireAdmin, (0, auth_1.requireRoles)(client_1.AdminRole.SUPER_ADMIN, client_1.AdminRole.OPERATIONS));
exports.adminAuditRouter.get("/", (0, validate_1.validate)(zod_1.z.object({
    page: zod_1.z.coerce.number().optional(),
    pageSize: zod_1.z.coerce.number().optional(),
    entityType: zod_1.z.string().optional(),
    action: zod_1.z.string().optional(),
}), "query"), async (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.query.page ?? 1));
        const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
        const where = {};
        if (typeof req.query.entityType === "string")
            where.entityType = req.query.entityType;
        if (typeof req.query.action === "string")
            where.action = req.query.action;
        const [total, items] = await Promise.all([
            prisma_1.prisma.auditLog.count({ where }),
            prisma_1.prisma.auditLog.findMany({
                where,
                include: { adminUser: { select: { name: true, email: true, role: true } } },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
        ]);
        return (0, response_1.ok)(res, items, {
            pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
        });
    }
    catch (err) {
        return next(err);
    }
});
// ── Cache Purge ──────────────────────────────────────────────────────────────
exports.adminCacheRouter = (0, express_1.Router)();
exports.adminCacheRouter.use(auth_1.requireAdmin, (0, auth_1.requireRoles)(client_1.AdminRole.SUPER_ADMIN));
/**
 * POST /admin/cache/purge
 * Flushes all pub:*, adm:*, settings:*, avail:* keys from Redis.
 * Use after bulk imports, emergency fixes, or schema changes.
 */
exports.adminCacheRouter.post("/purge", async (_req, res, next) => {
    try {
        const redis = (0, redis_1.getRedisClient)();
        if (!redis || !(0, redis_1.isRedisReady)()) {
            return (0, response_1.ok)(res, { purged: false, reason: "Redis unavailable" });
        }
        await Promise.all([
            (0, redis_1.delPattern)("pub:*"),
            (0, redis_1.delPattern)("adm:*"),
            (0, redis_1.delPattern)("settings:*"),
            (0, redis_1.delPattern)("avail:*"),
        ]);
        (0, settings_1.invalidateSettingsCache)();
        return (0, response_1.ok)(res, { purged: true, timestamp: new Date().toISOString() });
    }
    catch (err) {
        return next(err);
    }
});
//# sourceMappingURL=admin-ops.routes.js.map