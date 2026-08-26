"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recycleBinRouter = void 0;
const client_1 = require("@prisma/client");
const express_1 = require("express");
const zod_1 = require("zod");
const response_1 = require("../../lib/response");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const params_1 = require("../../lib/params");
const recycle_bin_service_1 = require("./recycle-bin.service");
exports.recycleBinRouter = (0, express_1.Router)();
// All recycle bin routes are SUPER_ADMIN only
exports.recycleBinRouter.use(auth_1.requireAdmin, (0, auth_1.requireRoles)(client_1.AdminRole.SUPER_ADMIN));
const entityTypeSchema = zod_1.z.enum(recycle_bin_service_1.RECYCLE_BIN_ENTITY_TYPES);
// ── GET /admin/recycle-bin — list deleted items ──────────────────────────────
exports.recycleBinRouter.get("/", (0, validate_1.validate)(zod_1.z.object({
    entityType: entityTypeSchema.optional(),
    page: zod_1.z.coerce.number().optional(),
    pageSize: zod_1.z.coerce.number().optional(),
}), "query"), async (req, res, next) => {
    try {
        const entityType = (0, params_1.queryString)(req, "entityType");
        const page = req.query.page ? Number(req.query.page) : undefined;
        const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
        const result = await (0, recycle_bin_service_1.listDeletedItems)({ entityType, page, pageSize });
        return (0, response_1.ok)(res, result.items, { pagination: result.meta });
    }
    catch (err) {
        return next(err);
    }
});
// ── GET /admin/recycle-bin/count — total deleted items count ─────────────────
exports.recycleBinRouter.get("/count", async (_req, res, next) => {
    try {
        const count = await (0, recycle_bin_service_1.getRecycleBinCount)();
        return (0, response_1.ok)(res, { count });
    }
    catch (err) {
        return next(err);
    }
});
// ── POST /admin/recycle-bin/:type/:id/restore ────────────────────────────────
exports.recycleBinRouter.post("/:type/:id/restore", (0, validate_1.validate)(zod_1.z.object({
    type: entityTypeSchema,
    id: zod_1.z.string().min(1),
}), "params"), (0, validate_1.validate)(zod_1.z.object({
    password: zod_1.z.string().min(1, "Password is required"),
})), async (req, res, next) => {
    try {
        const entityType = (0, params_1.param)(req, "type");
        const id = (0, params_1.param)(req, "id");
        const { password } = req.body;
        const result = await (0, recycle_bin_service_1.restoreItem)({
            entityType,
            id,
            adminId: req.admin.sub,
            adminPassword: password,
        });
        return (0, response_1.ok)(res, result);
    }
    catch (err) {
        return next(err);
    }
});
// ── DELETE /admin/recycle-bin/:type/:id — hard delete ────────────────────────
exports.recycleBinRouter.delete("/:type/:id", (0, validate_1.validate)(zod_1.z.object({
    type: entityTypeSchema,
    id: zod_1.z.string().min(1),
}), "params"), (0, validate_1.validate)(zod_1.z.object({
    password: zod_1.z.string().min(1, "Password is required"),
})), async (req, res, next) => {
    try {
        const entityType = (0, params_1.param)(req, "type");
        const id = (0, params_1.param)(req, "id");
        const { password } = req.body;
        const result = await (0, recycle_bin_service_1.hardDeleteItem)({
            entityType,
            id,
            adminId: req.admin.sub,
            adminPassword: password,
        });
        return (0, response_1.ok)(res, result);
    }
    catch (err) {
        return next(err);
    }
});
// ── POST /admin/recycle-bin/bulk/restore ────────────────────────────────────
exports.recycleBinRouter.post("/bulk/restore", (0, validate_1.validate)(zod_1.z.object({
    items: zod_1.z.array(zod_1.z.object({
        entityType: entityTypeSchema,
        id: zod_1.z.string().min(1),
    })).min(1),
    password: zod_1.z.string().min(1, "Password is required"),
})), async (req, res, next) => {
    try {
        const { items, password } = req.body;
        const result = await (0, recycle_bin_service_1.restoreItemsBulk)({
            items,
            adminId: req.admin.sub,
            adminPassword: password,
        });
        return (0, response_1.ok)(res, result);
    }
    catch (err) {
        return next(err);
    }
});
// ── POST /admin/recycle-bin/bulk/delete ─────────────────────────────────────
exports.recycleBinRouter.post("/bulk/delete", (0, validate_1.validate)(zod_1.z.object({
    items: zod_1.z.array(zod_1.z.object({
        entityType: entityTypeSchema,
        id: zod_1.z.string().min(1),
    })).min(1),
    password: zod_1.z.string().min(1, "Password is required"),
})), async (req, res, next) => {
    try {
        const { items, password } = req.body;
        const result = await (0, recycle_bin_service_1.hardDeleteItemsBulk)({
            items,
            adminId: req.admin.sub,
            adminPassword: password,
        });
        return (0, response_1.ok)(res, result);
    }
    catch (err) {
        return next(err);
    }
});
//# sourceMappingURL=recycle-bin.routes.js.map