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
const packageBuilderSchema = zod_1.z.object({
    eventDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    eventDetails: zod_1.z
        .object({
        childName: zod_1.z.string().optional(),
        childAge: zod_1.z.string().optional(),
        venue: zod_1.z.string().optional(),
        guestCount: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional(),
        notes: zod_1.z.string().optional(),
    })
        .optional(),
    builder: zod_1.z.object({
        packageSlug: zod_1.z.string().min(1),
        themeSlug: zod_1.z.string().min(1),
        guestCount: zod_1.z.number().int().min(5).max(200),
        location: zod_1.z.enum(["jaipur", "outside"]),
        selections: zod_1.z
            .object({
            welcomeItem: zod_1.z.string().min(1).optional().nullable(),
            activity1: zod_1.z.string().min(1).optional().nullable(),
            activity2: zod_1.z.string().min(1).optional().nullable(),
            returnGift: zod_1.z.string().min(1).optional().nullable(),
            familyActivity: zod_1.z.string().min(1).optional().nullable(),
            decor: zod_1.z.boolean().optional(),
            personalization: zod_1.z.record(zod_1.z.string(), zod_1.z.boolean()).optional(),
            giftRegistryCustomize: zod_1.z.boolean().optional(),
        })
            .default({}),
    }),
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
    packageData: packageBuilderSchema.optional(),
})), async (req, res, next) => {
    try {
        const result = await (0, orders_service_1.createOrderFromCart)(customerId(req), req.body);
        return res.status(201).json({ success: true, data: result });
    }
    catch (err) {
        return next(err);
    }
});
exports.ordersRouter.post("/direct", idempotency_1.idempotency, (0, validate_1.validate)(zod_1.z.object({
    productId: zod_1.z.string().min(1),
    quantity: zod_1.z.number().int().positive().max(999),
    shippingAddress: shippingAddressSchema,
    contactEmail: zod_1.z.string().email(),
    contactPhone: zod_1.z.string().min(6).max(20),
    personalizationValues: zod_1.z.unknown().optional(),
    personalizationSelected: zod_1.z.boolean().optional(),
    packageData: packageBuilderSchema.optional(),
})), async (req, res, next) => {
    try {
        const body = req.body;
        const result = await (0, orders_service_1.createDirectOrder)(customerId(req), {
            productId: body.productId,
            quantity: body.quantity,
            shippingAddress: body.shippingAddress,
            contactEmail: body.contactEmail,
            contactPhone: body.contactPhone,
            personalizationValues: body.personalizationValues,
            personalizationSelected: body.personalizationSelected,
            packageData: body.packageData,
        });
        return res.status(201).json({ success: true, data: result });
    }
    catch (err) {
        return next(err);
    }
});
exports.ordersRouter.post("/package", idempotency_1.idempotency, (0, validate_1.validate)(zod_1.z.object({
    eventDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    contactEmail: zod_1.z.string().email(),
    contactPhone: zod_1.z.string().min(6).max(20),
    shippingAddress: shippingAddressSchema.optional(),
    eventDetails: packageBuilderSchema.shape.eventDetails,
    builder: packageBuilderSchema.shape.builder,
})), async (req, res, next) => {
    try {
        const result = await (0, orders_service_1.createPackageOrder)(customerId(req), req.body);
        return res.status(201).json({ success: true, data: result });
    }
    catch (err) {
        return next(err);
    }
});
exports.ordersRouter.post("/verify-payment", idempotency_1.idempotency, (0, validate_1.validate)(zod_1.z.object({
    orderCode: zod_1.z.string().min(1),
    razorpayOrderId: zod_1.z.string().min(1),
    razorpayPaymentId: zod_1.z.string().min(1),
    razorpaySignature: zod_1.z.string().min(1),
})), async (req, res, next) => {
    try {
        const data = await (0, orders_service_1.verifyShopCheckoutPayment)({ userId: customerId(req), ...req.body });
        return (0, response_1.ok)(res, data);
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
exports.accountOrdersRouter.post("/:orderCode/retry-payment", (0, validate_1.validate)(zod_1.z.object({ orderCode: zod_1.z.string().min(1) }), "params"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, orders_service_1.retryShopPayment)(customerId(req), (0, params_1.param)(req, "orderCode")));
    }
    catch (err) {
        return next(err);
    }
});
exports.accountOrdersRouter.post("/:orderCode/cancel-payment", (0, validate_1.validate)(zod_1.z.object({ orderCode: zod_1.z.string().min(1) }), "params"), async (req, res, next) => {
    try {
        const order = await (0, orders_service_1.getOrderForUser)(customerId(req), (0, params_1.param)(req, "orderCode"));
        await (0, orders_service_1.markOrderPaymentCancelled)(order.id);
        return (0, response_1.ok)(res, await (0, orders_service_1.getOrderForUser)(customerId(req), (0, params_1.param)(req, "orderCode")));
    }
    catch (err) {
        return next(err);
    }
});
exports.accountOrdersRouter.post("/:orderCode/reorder", (0, validate_1.validate)(zod_1.z.object({ orderCode: zod_1.z.string().min(1) }), "params"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, orders_service_1.reorderFromOrder)(customerId(req), (0, params_1.param)(req, "orderCode")));
    }
    catch (err) {
        return next(err);
    }
});
exports.adminOrdersRouter = (0, express_1.Router)();
exports.adminOrdersRouter.use(require("../../middleware/auth").requireAdmin, require("../../middleware/auth").requireRoles("SUPER_ADMIN", "OPERATIONS"));
exports.adminOrdersRouter.get("/", (0, validate_1.validate)(validators_1.paginationQuerySchema.extend({
    search: zod_1.z.string().optional(),
    status: zod_1.z.enum(["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]).optional(),
    paymentStatus: zod_1.z.enum(["NOT_REQUIRED", "PENDING", "PAID", "FAILED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"]).optional(),
    followUp: zod_1.z.enum(["NOT_REQUIRED", "REQUIRED", "CONTACTED", "CONFIRMED", "COMPLETED", "REQUIRED_ANY"]).optional(),
    registryId: zod_1.z.string().optional(),
    registryOnly: zod_1.z.enum(["true", "false"]).optional(),
    shopOnly: zod_1.z.enum(["true", "false"]).optional(),
    packageOnly: zod_1.z.enum(["true", "false"]).optional(),
}), "query"), async (req, res, next) => {
    try {
        const { adminListOrders } = require("./orders.service");
        const q = req.query;
        const result = await adminListOrders({
            ...req.query,
            registryOnly: q.registryOnly === "true",
            shopOnly: q.shopOnly === "true",
            packageOnly: q.packageOnly === "true",
        });
        return (0, response_1.ok)(res, result);
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
exports.adminOrdersRouter.patch("/:id/status", (0, validate_1.validate)(zod_1.z.object({ id: zod_1.z.string() }), "params"), (0, validate_1.validate)(zod_1.z.object({ status: zod_1.z.enum(["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]) }), "body"), async (req, res, next) => {
    try {
        const { adminUpdateOrderStatus } = require("./orders.service");
        return (0, response_1.ok)(res, await adminUpdateOrderStatus((0, params_1.param)(req, "id"), req.body.status));
    }
    catch (err) {
        return next(err);
    }
});
exports.adminOrdersRouter.patch("/:id/ops", (0, validate_1.validate)(zod_1.z.object({ id: zod_1.z.string() }), "params"), (0, validate_1.validate)(zod_1.z.object({
    customizationFollowUpStatus: zod_1.z.enum(["NOT_REQUIRED", "REQUIRED", "CONTACTED", "CONFIRMED", "COMPLETED"]).optional(),
    adminNotes: zod_1.z.string().optional(),
})), async (req, res, next) => {
    try {
        const { adminUpdateOrderOps } = require("./orders.service");
        return (0, response_1.ok)(res, await adminUpdateOrderOps((0, params_1.param)(req, "id"), req.body));
    }
    catch (err) {
        return next(err);
    }
});
//# sourceMappingURL=orders.routes.js.map