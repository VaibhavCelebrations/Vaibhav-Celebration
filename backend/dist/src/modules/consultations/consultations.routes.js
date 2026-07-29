"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminConsultationsRouter = exports.consultationsRouter = void 0;
const params_1 = require("../../lib/params");
const client_1 = require("@prisma/client");
const express_1 = require("express");
const zod_1 = require("zod");
const response_1 = require("../../lib/response");
const validators_1 = require("../../lib/validators");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const consultations_service_1 = require("./consultations.service");
exports.consultationsRouter = (0, express_1.Router)();
exports.consultationsRouter.post("/", (0, validate_1.validate)(zod_1.z.object({
    name: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    phone: zod_1.z.string().min(8),
    eventDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    childOrEventDetails: zod_1.z.string().optional(),
    customRequirements: zod_1.z.string().optional(),
})), async (req, res, next) => {
    try {
        return (0, response_1.created)(res, await (0, consultations_service_1.createConsultation)(req.body));
    }
    catch (err) {
        return next(err);
    }
});
exports.adminConsultationsRouter = (0, express_1.Router)();
exports.adminConsultationsRouter.use(auth_1.requireAdmin, (0, auth_1.requireRoles)(client_1.AdminRole.OPERATIONS, client_1.AdminRole.SUPER_ADMIN));
exports.adminConsultationsRouter.get("/", (0, validate_1.validate)(validators_1.paginationQuerySchema.extend({
    search: zod_1.z.string().optional(),
    status: zod_1.z.nativeEnum(client_1.ConsultationStatus).optional(),
}), "query"), async (req, res, next) => {
    try {
        const q = req.query;
        const { page, pageSize } = (0, response_1.parsePagination)(q);
        const { total, items } = await (0, consultations_service_1.listConsultations)({ search: q.search, status: q.status, page, pageSize });
        return (0, response_1.ok)(res, items, { pagination: (0, response_1.paginationMeta)(page, pageSize, total) });
    }
    catch (err) {
        return next(err);
    }
});
exports.adminConsultationsRouter.put("/:id/status", (0, validate_1.validate)(zod_1.z.object({ id: zod_1.z.string().min(1) }), "params"), (0, validate_1.validate)(zod_1.z.object({ status: zod_1.z.nativeEnum(client_1.ConsultationStatus) })), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, consultations_service_1.updateConsultationStatus)((0, params_1.param)(req, "id"), req.body.status));
    }
    catch (err) {
        return next(err);
    }
});
//# sourceMappingURL=consultations.routes.js.map