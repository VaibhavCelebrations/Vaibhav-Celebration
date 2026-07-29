"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminCustomersRouter = exports.adminLeadsRouter = exports.leadsPublicRouter = void 0;
const params_1 = require("../../lib/params");
const client_1 = require("@prisma/client");
const express_1 = require("express");
const zod_1 = require("zod");
const response_1 = require("../../lib/response");
const validators_1 = require("../../lib/validators");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const crm_service_1 = require("./crm.service");
exports.leadsPublicRouter = (0, express_1.Router)();
exports.leadsPublicRouter.post("/contact-form", (0, validate_1.validate)(zod_1.z.object({
    name: zod_1.z.string().min(1),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    message: zod_1.z.string().optional(),
    interestArea: zod_1.z.string().optional(),
})), async (req, res, next) => {
    try {
        return (0, response_1.created)(res, await (0, crm_service_1.createContactLead)(req.body));
    }
    catch (err) {
        return next(err);
    }
});
const crmRoles = [auth_1.requireAdmin, (0, auth_1.requireRoles)(client_1.AdminRole.OPERATIONS, client_1.AdminRole.SUPER_ADMIN)];
exports.adminLeadsRouter = (0, express_1.Router)();
exports.adminLeadsRouter.use(...crmRoles);
exports.adminLeadsRouter.get("/", (0, validate_1.validate)(validators_1.paginationQuerySchema.extend({
    search: zod_1.z.string().optional(),
    status: zod_1.z.nativeEnum(client_1.LeadStatus).optional(),
    source: zod_1.z.nativeEnum(client_1.LeadSource).optional(),
}), "query"), async (req, res, next) => {
    try {
        const q = req.query;
        const { page, pageSize } = (0, response_1.parsePagination)(q);
        const { total, items } = await (0, crm_service_1.listLeads)({ ...q, page, pageSize });
        return (0, response_1.ok)(res, items, { pagination: (0, response_1.paginationMeta)(page, pageSize, total) });
    }
    catch (err) {
        return next(err);
    }
});
exports.adminLeadsRouter.put("/:id/status", (0, validate_1.validate)(zod_1.z.object({ id: zod_1.z.string().min(1) }), "params"), (0, validate_1.validate)(zod_1.z.object({ status: zod_1.z.nativeEnum(client_1.LeadStatus) })), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, crm_service_1.updateLeadStatus)((0, params_1.param)(req, "id"), req.body.status));
    }
    catch (err) {
        return next(err);
    }
});
exports.adminCustomersRouter = (0, express_1.Router)();
exports.adminCustomersRouter.use(...crmRoles);
exports.adminCustomersRouter.get("/", (0, validate_1.validate)(validators_1.paginationQuerySchema.extend({ search: zod_1.z.string().optional() }), "query"), async (req, res, next) => {
    try {
        const q = req.query;
        const { page, pageSize } = (0, response_1.parsePagination)(q);
        const { total, items } = await (0, crm_service_1.listCustomers)({ search: q.search, page, pageSize });
        return (0, response_1.ok)(res, items, { pagination: (0, response_1.paginationMeta)(page, pageSize, total) });
    }
    catch (err) {
        return next(err);
    }
});
exports.adminCustomersRouter.get("/:id", async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, crm_service_1.getCustomer360)((0, params_1.param)(req, "id")));
    }
    catch (err) {
        return next(err);
    }
});
exports.adminCustomersRouter.post("/:id/notes", (0, validate_1.validate)(zod_1.z.object({ id: zod_1.z.string().min(1) }), "params"), (0, validate_1.validate)(zod_1.z.object({ note: zod_1.z.string().min(1) })), async (req, res, next) => {
    try {
        const note = await (0, crm_service_1.addCustomerNote)({
            customerId: (0, params_1.param)(req, "id"),
            authorAdminUserId: req.admin.sub,
            note: req.body.note,
        });
        return (0, response_1.created)(res, note);
    }
    catch (err) {
        return next(err);
    }
});
//# sourceMappingURL=crm.routes.js.map