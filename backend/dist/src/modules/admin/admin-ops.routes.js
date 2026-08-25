"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminCacheRouter = exports.adminCalendarRouter = exports.adminAuditRouter = exports.adminSettingsRouter = void 0;
const client_1 = require("@prisma/client");
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../../db/prisma");
const response_1 = require("../../lib/response");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const settings_1 = require("../../lib/settings");
const redis_1 = require("../../lib/redis");
const calendar_service_1 = require("./calendar.service");
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
exports.adminCalendarRouter = (0, express_1.Router)();
exports.adminCalendarRouter.use(auth_1.requireAdmin, (0, auth_1.requireRoles)(client_1.AdminRole.OPERATIONS, client_1.AdminRole.SUPER_ADMIN));
exports.adminCalendarRouter.get("/", (0, validate_1.validate)(zod_1.z.object({
    view: zod_1.z.enum(["day", "week", "month"]).default("month"),
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}), "query"), async (req, res, next) => {
    try {
        const { view, date } = req.query;
        return (0, response_1.ok)(res, await (0, calendar_service_1.getAdminCalendar)(view, date));
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