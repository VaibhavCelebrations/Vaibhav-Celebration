"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminPaymentsRouter = exports.adminInvoicesRouter = exports.invoicesRouter = exports.paymentsRouter = void 0;
const params_1 = require("../../lib/params");
const client_1 = require("@prisma/client");
const express_1 = require("express");
const zod_1 = require("zod");
const audit_1 = require("../../lib/audit");
const errors_1 = require("../../lib/errors");
const response_1 = require("../../lib/response");
const validators_1 = require("../../lib/validators");
const auth_1 = require("../../middleware/auth");
const guest_auth_1 = require("../../middleware/guest-auth");
const idempotency_1 = require("../../middleware/idempotency");
const validate_1 = require("../../middleware/validate");
const payments_service_1 = require("./payments.service");
exports.paymentsRouter = (0, express_1.Router)();
exports.paymentsRouter.post("/razorpay/order", idempotency_1.idempotency, (0, validate_1.validate)(zod_1.z.object({ orderCode: zod_1.z.string().min(1) })), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, payments_service_1.createPaymentOrder)(req.body));
    }
    catch (err) {
        return next(err);
    }
});
/** Raw body preserved via app.ts express.raw + rawBody attachment */
exports.paymentsRouter.post("/webhook", async (req, res, next) => {
    try {
        const rawBody = req.rawBody;
        const raw = rawBody ??
            (typeof req.body === "string"
                ? req.body
                : Buffer.isBuffer(req.body)
                    ? req.body.toString("utf8")
                    : JSON.stringify(req.body));
        const signature = req.header("x-razorpay-signature") ?? undefined;
        const result = await (0, payments_service_1.handleRazorpayWebhook)(raw, signature);
        return (0, response_1.ok)(res, result);
    }
    catch (err) {
        return next(err);
    }
});
exports.invoicesRouter = (0, express_1.Router)();
exports.invoicesRouter.get("/:invoiceNumber/download", guest_auth_1.requireGuest, async (req, res, next) => {
    try {
        const invoice = await (0, payments_service_1.getInvoiceByNumber)((0, params_1.param)(req, "invoiceNumber"));
        const guest = req.guest;
        const orderCode = invoice.order?.orderCode;
        if (guest.sub !== orderCode) {
            if (guest.email.toLowerCase() !== invoice.customer.email.toLowerCase()) {
                throw new errors_1.ForbiddenError();
            }
        }
        if (invoice.pdfUrl) {
            return res.redirect(invoice.pdfUrl);
        }
        return (0, response_1.ok)(res, invoice);
    }
    catch (err) {
        return next(err);
    }
});
exports.adminInvoicesRouter = (0, express_1.Router)();
exports.adminInvoicesRouter.use(auth_1.requireAdmin, (0, auth_1.requireRoles)(client_1.AdminRole.OPERATIONS, client_1.AdminRole.SUPER_ADMIN));
exports.adminInvoicesRouter.get("/", (0, validate_1.validate)(validators_1.paginationQuerySchema.extend({
    search: zod_1.z.string().optional(),
    from: zod_1.z.string().optional(),
    to: zod_1.z.string().optional(),
    customerId: zod_1.z.string().optional(),
}), "query"), async (req, res, next) => {
    try {
        const q = req.query;
        const { page, pageSize } = (0, response_1.parsePagination)(q);
        const { total, items } = await (0, payments_service_1.listInvoices)({ ...q, page, pageSize });
        return (0, response_1.ok)(res, items, { pagination: (0, response_1.paginationMeta)(page, pageSize, total) });
    }
    catch (err) {
        return next(err);
    }
});
exports.adminInvoicesRouter.get("/export", (0, validate_1.validate)(zod_1.z.object({
    from: zod_1.z.string().optional(),
    to: zod_1.z.string().optional(),
    format: zod_1.z.enum(["csv", "zip"]).default("csv"),
}), "query"), async (req, res, next) => {
    try {
        const q = req.query;
        const csv = await (0, payments_service_1.exportInvoicesCsv)(q.from, q.to);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", 'attachment; filename="invoices.csv"');
        return res.send(csv);
    }
    catch (err) {
        return next(err);
    }
});
exports.adminInvoicesRouter.post("/:id/resend", async (req, res, next) => {
    try {
        const invoice = await (0, payments_service_1.deliverInvoice)((0, params_1.param)(req, "id"));
        await (0, audit_1.writeAuditLog)({
            adminUserId: req.admin.sub,
            action: "INVOICE_RESEND",
            entityType: "Invoice",
            entityId: invoice.id,
            ipAddress: (0, audit_1.clientIp)(req),
        });
        return (0, response_1.ok)(res, invoice);
    }
    catch (err) {
        return next(err);
    }
});
exports.adminPaymentsRouter = (0, express_1.Router)();
exports.adminPaymentsRouter.use(auth_1.requireAdmin, (0, auth_1.requireRoles)(client_1.AdminRole.OPERATIONS, client_1.AdminRole.SUPER_ADMIN));
exports.adminPaymentsRouter.get("/", (0, validate_1.validate)(validators_1.paginationQuerySchema.extend({
    search: zod_1.z.string().optional(),
}), "query"), async (req, res, next) => {
    try {
        const q = req.query;
        const { page, pageSize } = (0, response_1.parsePagination)(q);
        const { total, items } = await (0, payments_service_1.listPaymentEvents)({ search: q.search, page, pageSize });
        return (0, response_1.ok)(res, items, { pagination: (0, response_1.paginationMeta)(page, pageSize, total) });
    }
    catch (err) {
        return next(err);
    }
});
//# sourceMappingURL=payments.routes.js.map