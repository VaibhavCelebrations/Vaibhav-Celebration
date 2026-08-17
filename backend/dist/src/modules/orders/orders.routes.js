"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminOrdersRouter = exports.accountOrdersRouter = exports.ordersRouter = exports.shopCheckoutRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const params_1 = require("../../lib/params");
const response_1 = require("../../lib/response");
const customer_auth_1 = require("../../middleware/customer-auth");
const idempotency_1 = require("../../middleware/idempotency");
const validate_1 = require("../../middleware/validate");
const validators_1 = require("../../lib/validators");
const orders_service_1 = require("./orders.service");
function customerId(req) {
    return req.customer.sub;
}
const shippingAddressSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(1),
    line1: zod_1.z.string().min(1),
    line2: zod_1.z.string().optional(),
    city: zod_1.z.string().min(1),
    state: zod_1.z.string().min(1),
    pincode: zod_1.z.string().min(4).max(10),
    country: zod_1.z.string().min(1).default("India"),
});
exports.shopCheckoutRouter = (0, express_1.Router)();
exports.shopCheckoutRouter.use(customer_auth_1.requireCustomer);
exports.shopCheckoutRouter.get("/quote", async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, orders_service_1.getCheckoutQuote)(customerId(req)));
    }
    catch (err) {
        return next(err);
    }
});
exports.ordersRouter = (0, express_1.Router)();
exports.ordersRouter.use(customer_auth_1.requireCustomer);
exports.ordersRouter.post("/", idempotency_1.idempotency, (0, validate_1.validate)(zod_1.z.object({
    shippingAddress: shippingAddressSchema,
    contactEmail: zod_1.z.string().email(),
    contactPhone: zod_1.z.string().min(6).max(20),
})), async (req, res, next) => {
    try {
        const result = await (0, orders_service_1.createOrderFromCart)(customerId(req), req.body);
        return res.status(201).json({ success: true, data: result });
    }
    catch (err) {
        return next(err);
    }
});
exports.accountOrdersRouter = (0, express_1.Router)();
exports.accountOrdersRouter.use(customer_auth_1.requireCustomer);
exports.accountOrdersRouter.get("/", (0, validate_1.validate)(validators_1.paginationQuerySchema, "query"), async (req, res, next) => {
    try {
        const result = await (0, orders_service_1.listOrdersForUser)(customerId(req), req.query);
        return (0, response_1.ok)(res, result);
    }
    catch (err) {
        return next(err);
    }
});
exports.accountOrdersRouter.get("/:orderCode", (0, validate_1.validate)(zod_1.z.object({ orderCode: zod_1.z.string().min(1) }), "params"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, orders_service_1.getOrderForUser)(customerId(req), (0, params_1.param)(req, "orderCode")));
    }
    catch (err) {
        return next(err);
    }
});
exports.adminOrdersRouter = (0, express_1.Router)();
exports.adminOrdersRouter.use(require("../../middleware/auth").requireAdmin, require("../../middleware/auth").requireRoles("SUPER_ADMIN", "OPERATIONS"));
exports.adminOrdersRouter.get("/", (0, validate_1.validate)(validators_1.paginationQuerySchema.extend({
    search: zod_1.z.string().optional(),
    status: zod_1.z.enum(["PENDING_PAYMENT", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED", "FAILED"]).optional(),
}), "query"), async (req, res, next) => {
    try {
        const { adminListOrders } = require("./orders.service");
        return (0, response_1.ok)(res, await adminListOrders(req.query));
    }
    catch (err) {
        return next(err);
    }
});
exports.adminOrdersRouter.get("/:id", (0, validate_1.validate)(zod_1.z.object({ id: zod_1.z.string() }), "params"), async (req, res, next) => {
    try {
        const { adminGetOrder } = require("./orders.service");
        return (0, response_1.ok)(res, await adminGetOrder((0, params_1.param)(req, "id")));
    }
    catch (err) {
        return next(err);
    }
});
exports.adminOrdersRouter.patch("/:id/items/:itemId/fulfillment", (0, validate_1.validate)(zod_1.z.object({ id: zod_1.z.string(), itemId: zod_1.z.string() }), "params"), (0, validate_1.validate)(zod_1.z.object({ status: zod_1.z.string().nullable() }), "body"), async (req, res, next) => {
    try {
        const { adminUpdateOrderItemFulfillment } = require("./orders.service");
        return (0, response_1.ok)(res, await adminUpdateOrderItemFulfillment((0, params_1.param)(req, "id"), (0, params_1.param)(req, "itemId"), req.body.status));
    }
    catch (err) {
        return next(err);
    }
});
//# sourceMappingURL=orders.routes.js.map