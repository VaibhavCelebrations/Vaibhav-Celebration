"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminExtraServicesRouter = void 0;
const client_1 = require("@prisma/client");
const express_1 = require("express");
const zod_1 = require("zod");
const audit_1 = require("../../lib/audit");
const response_1 = require("../../lib/response");
const params_1 = require("../../lib/params");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const extra_services_service_1 = require("./extra-services.service");
const roles = [
    auth_1.requireAdmin,
    (0, auth_1.requireRoles)(client_1.AdminRole.CONTENT_EDITOR, client_1.AdminRole.OPERATIONS, client_1.AdminRole.SUPER_ADMIN),
];
const id = zod_1.z.object({ id: zod_1.z.string().min(1) });
const schema = zod_1.z.object({
    label: zod_1.z.string().min(1),
    description: zod_1.z.string().optional().nullable(),
    requirements: zod_1.z.string().optional().nullable(),
    customizationPriceInPaise: zod_1.z.number().int().min(0).optional(),
    displayOrder: zod_1.z.number().int().optional(),
    isActive: zod_1.z.boolean().optional(),
});
async function audit(req, action, entityId) {
    await (0, audit_1.writeAuditLog)({
        adminUserId: req.admin.sub,
        action,
        entityType: "ExtraService",
        entityId,
        ipAddress: (0, audit_1.clientIp)(req),
    });
}
exports.adminExtraServicesRouter = (0, express_1.Router)();
exports.adminExtraServicesRouter.use(...roles);
exports.adminExtraServicesRouter.get("/", async (req, res, next) => {
    try {
        const includeInactive = req.query.includeInactive === "true";
        return (0, response_1.ok)(res, await (0, extra_services_service_1.listExtraServices)(includeInactive));
    }
    catch (err) {
        return next(err);
    }
});
exports.adminExtraServicesRouter.get("/:id", (0, validate_1.validate)(id, "params"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, extra_services_service_1.getExtraService)((0, params_1.param)(req, "id")));
    }
    catch (err) {
        return next(err);
    }
});
exports.adminExtraServicesRouter.post("/", (0, validate_1.validate)(schema), async (req, res, next) => {
    try {
        const item = await (0, extra_services_service_1.createExtraService)(req.body);
        await audit(req, "CREATE", item.id);
        return (0, response_1.created)(res, item);
    }
    catch (err) {
        return next(err);
    }
});
exports.adminExtraServicesRouter.patch("/:id", (0, validate_1.validate)(id, "params"), (0, validate_1.validate)(schema.partial()), async (req, res, next) => {
    try {
        const item = await (0, extra_services_service_1.updateExtraService)((0, params_1.param)(req, "id"), req.body);
        await audit(req, "UPDATE", item.id);
        return (0, response_1.ok)(res, item);
    }
    catch (err) {
        return next(err);
    }
});
exports.adminExtraServicesRouter.delete("/:id", (0, validate_1.validate)(id, "params"), async (req, res, next) => {
    try {
        await (0, extra_services_service_1.deleteExtraService)((0, params_1.param)(req, "id"));
        await audit(req, "DELETE", (0, params_1.param)(req, "id"));
        return (0, response_1.ok)(res, { deleted: true });
    }
    catch (err) {
        return next(err);
    }
});
//# sourceMappingURL=extra-services.routes.js.map