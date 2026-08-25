"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRegistryRouter = exports.registryRouter = exports.accountRegistryRouter = void 0;
const client_1 = require("@prisma/client");
const express_1 = require("express");
const zod_1 = require("zod");
const params_1 = require("../../lib/params");
const response_1 = require("../../lib/response");
const validators_1 = require("../../lib/validators");
const auth_1 = require("../../middleware/auth");
const customer_auth_1 = require("../../middleware/customer-auth");
const idempotency_1 = require("../../middleware/idempotency");
const validate_1 = require("../../middleware/validate");
const registry_service_1 = require("./registry.service");
const upgrades_service_1 = require("../upgrades/upgrades.service");
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
exports.accountRegistryRouter = (0, express_1.Router)();
exports.accountRegistryRouter.use(customer_auth_1.requireCustomer);
exports.accountRegistryRouter.get("/", async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, registry_service_1.listRegistriesForOwner)(customerId(req)));
    }
    catch (err) {
        return next(err);
    }
});
exports.accountRegistryRouter.get("/access", async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, upgrades_service_1.getRegistryAccess)(customerId(req)));
    }
    catch (err) {
        return next(err);
    }
});
exports.accountRegistryRouter.post("/", (0, validate_1.validate)(zod_1.z.object({
    sourceOrderCode: zod_1.z.string().min(1),
    password: zod_1.z.string().min(4).max(64).optional(),
    title: zod_1.z.string().max(160).optional(),
    occasion: zod_1.z.string().max(120).optional(),
    eventDate: zod_1.z.string().optional(),
    ownerDisplayName: zod_1.z.string().max(120).optional(),
    contactEmail: zod_1.z.string().email().optional(),
    contactPhone: zod_1.z.string().min(6).max(20).optional(),
    childOrPersonName: zod_1.z.string().max(120).optional(),
    celebrationDetails: zod_1.z.string().max(4000).optional(),
    giftPreferences: zod_1.z.string().max(2000).optional(),
    photoMediaId: zod_1.z.string().optional(),
    coverImageUrl: zod_1.z.string().url().optional(),
    shippingAddress: shippingAddressSchema.optional(),
    visibility: zod_1.z.nativeEnum(client_1.RegistryVisibility).optional(),
})), async (req, res, next) => {
    try {
        const item = await (0, registry_service_1.createRegistry)(customerId(req), req.body);
        return res.status(201).json({ success: true, data: item });
    }
    catch (err) {
        return next(err);
    }
});
exports.accountRegistryRouter.post("/extract", (0, validate_1.validate)(zod_1.z.object({ url: zod_1.z.string().url(), force: zod_1.z.boolean().optional() })), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, registry_service_1.previewExternalProduct)(customerId(req), req.body.url, req.body.force));
    }
    catch (err) {
        return next(err);
    }
});
exports.accountRegistryRouter.get("/:id", (0, validate_1.validate)(zod_1.z.object({ id: zod_1.z.string().min(1) }), "params"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, registry_service_1.getRegistryForOwner)(customerId(req), (0, params_1.param)(req, "id")));
    }
    catch (err) {
        return next(err);
    }
});
exports.accountRegistryRouter.put("/:id", (0, validate_1.validate)(zod_1.z.object({ id: zod_1.z.string().min(1) }), "params"), (0, validate_1.validate)(zod_1.z.object({
    title: zod_1.z.string().max(160).optional(),
    occasion: zod_1.z.string().max(120).optional(),
    eventDate: zod_1.z.string().nullable().optional(),
    ownerDisplayName: zod_1.z.string().max(120).optional(),
    contactEmail: zod_1.z.string().email().optional(),
    contactPhone: zod_1.z.string().min(6).max(20).optional(),
    childOrPersonName: zod_1.z.string().max(120).optional(),
    celebrationDetails: zod_1.z.string().max(4000).optional(),
    giftPreferences: zod_1.z.string().max(2000).optional(),
    photoMediaId: zod_1.z.string().optional(),
    coverImageUrl: zod_1.z.string().url().nullable().optional(),
    shippingAddress: shippingAddressSchema.optional(),
    visibility: zod_1.z.nativeEnum(client_1.RegistryVisibility).optional(),
    password: zod_1.z.string().min(4).max(64).optional(),
    status: zod_1.z.enum(["DRAFT", "ACTIVE", "CLOSED", "ARCHIVED"]).optional(),
})), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, registry_service_1.updateRegistry)(customerId(req), (0, params_1.param)(req, "id"), req.body));
    }
    catch (err) {
        return next(err);
    }
});
exports.accountRegistryRouter.delete("/:id", (0, validate_1.validate)(zod_1.z.object({ id: zod_1.z.string().min(1) }), "params"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, registry_service_1.archiveRegistry)(customerId(req), (0, params_1.param)(req, "id")));
    }
    catch (err) {
        return next(err);
    }
});
exports.accountRegistryRouter.post("/:id/items", (0, validate_1.validate)(zod_1.z.object({ id: zod_1.z.string().min(1) }), "params"), (0, validate_1.validate)(zod_1.z.object({
    sourceType: zod_1.z.nativeEnum(client_1.GiftLinkSourceType),
    externalUrl: zod_1.z.string().url().optional(),
    manualTitle: zod_1.z.string().max(200).optional(),
    manualImageUrl: zod_1.z.string().url().optional(),
    manualPriceInPaise: zod_1.z.number().int().positive().optional(),
    currency: zod_1.z.string().max(8).optional(),
    storeName: zod_1.z.string().max(80).optional(),
    description: zod_1.z.string().max(2000).optional(),
    notes: zod_1.z.string().max(1000).optional(),
    quantityDesired: zod_1.z.number().int().positive().max(99).optional(),
    priority: zod_1.z.number().int().min(0).max(100).optional(),
    internalProductId: zod_1.z.string().optional(),
})), async (req, res, next) => {
    try {
        const item = await (0, registry_service_1.addRegistryItem)(customerId(req), (0, params_1.param)(req, "id"), req.body);
        return res.status(201).json({ success: true, data: item });
    }
    catch (err) {
        return next(err);
    }
});
exports.accountRegistryRouter.put("/:id/items/reorder", (0, validate_1.validate)(zod_1.z.object({ id: zod_1.z.string().min(1) }), "params"), (0, validate_1.validate)(zod_1.z.object({ itemIds: zod_1.z.array(zod_1.z.string().min(1)).min(1) })), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, registry_service_1.reorderRegistryItems)(customerId(req), (0, params_1.param)(req, "id"), req.body.itemIds));
    }
    catch (err) {
        return next(err);
    }
});
exports.accountRegistryRouter.put("/:id/items/:itemId", (0, validate_1.validate)(zod_1.z.object({ id: zod_1.z.string().min(1), itemId: zod_1.z.string().min(1) }), "params"), (0, validate_1.validate)(zod_1.z.object({
    manualTitle: zod_1.z.string().max(200).optional(),
    manualImageUrl: zod_1.z.string().url().nullable().optional(),
    manualPriceInPaise: zod_1.z.number().int().positive().nullable().optional(),
    currency: zod_1.z.string().max(8).optional(),
    storeName: zod_1.z.string().max(80).optional(),
    description: zod_1.z.string().max(2000).optional(),
    notes: zod_1.z.string().max(1000).optional(),
    quantityDesired: zod_1.z.number().int().positive().max(99).optional(),
    priority: zod_1.z.number().int().min(0).max(100).optional(),
    displayOrder: zod_1.z.number().int().min(0).optional(),
    externalUrl: zod_1.z.string().url().optional(),
})), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, registry_service_1.updateRegistryItem)(customerId(req), (0, params_1.param)(req, "id"), (0, params_1.param)(req, "itemId"), req.body));
    }
    catch (err) {
        return next(err);
    }
});
exports.accountRegistryRouter.delete("/:id/items/:itemId", (0, validate_1.validate)(zod_1.z.object({ id: zod_1.z.string().min(1), itemId: zod_1.z.string().min(1) }), "params"), async (req, res, next) => {
    try {
        await (0, registry_service_1.deleteRegistryItem)(customerId(req), (0, params_1.param)(req, "id"), (0, params_1.param)(req, "itemId"));
        return (0, response_1.ok)(res, { deleted: true });
    }
    catch (err) {
        return next(err);
    }
});
exports.accountRegistryRouter.post("/:id/contributions/:contributionId/reverse", (0, validate_1.validate)(zod_1.z.object({ id: zod_1.z.string().min(1), contributionId: zod_1.z.string().min(1) }), "params"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, registry_service_1.reverseContribution)(customerId(req), (0, params_1.param)(req, "id"), (0, params_1.param)(req, "contributionId")));
    }
    catch (err) {
        return next(err);
    }
});
exports.registryRouter = (0, express_1.Router)();
exports.registryRouter.get("/:code/seo", (0, validate_1.validate)(zod_1.z.object({ code: zod_1.z.string().min(1) }), "params"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, registry_service_1.getRegistrySeo)((0, params_1.param)(req, "code")));
    }
    catch (err) {
        return next(err);
    }
});
exports.registryRouter.get("/:code", (0, validate_1.validate)(zod_1.z.object({ code: zod_1.z.string().min(1) }), "params"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, registry_service_1.getPublicRegistry)((0, params_1.param)(req, "code")));
    }
    catch (err) {
        return next(err);
    }
});
exports.registryRouter.post("/:code/view", (0, validate_1.validate)(zod_1.z.object({ code: zod_1.z.string().min(1) }), "params"), (0, validate_1.validate)(zod_1.z.object({ password: zod_1.z.string().min(1).optional() })), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, registry_service_1.getPublicRegistry)((0, params_1.param)(req, "code"), req.body.password));
    }
    catch (err) {
        return next(err);
    }
});
exports.registryRouter.post("/:code/items/:itemId/gift", customer_auth_1.requireCustomer, idempotency_1.idempotency, (0, validate_1.validate)(zod_1.z.object({ code: zod_1.z.string().min(1), itemId: zod_1.z.string().min(1) }), "params"), (0, validate_1.validate)(zod_1.z.object({
    password: zod_1.z.string().min(1).optional(),
    quantity: zod_1.z.number().int().positive().max(99).optional(),
    contactEmail: zod_1.z.string().email(),
    contactPhone: zod_1.z.string().min(6).max(20),
})), async (req, res, next) => {
    try {
        const result = await (0, registry_service_1.giftRegistryItem)(customerId(req), (0, params_1.param)(req, "code"), (0, params_1.param)(req, "itemId"), req.body);
        return res.status(201).json({ success: true, data: result });
    }
    catch (err) {
        return next(err);
    }
});
exports.registryRouter.post("/:code/items/:itemId/confirm", (0, validate_1.validate)(zod_1.z.object({ code: zod_1.z.string().min(1), itemId: zod_1.z.string().min(1) }), "params"), (0, validate_1.validate)(zod_1.z.object({
    password: zod_1.z.string().min(1).optional(),
    quantity: zod_1.z.number().int().positive().max(99).optional(),
    guestName: zod_1.z.string().max(120).optional(),
    guestEmail: zod_1.z.string().email().optional(),
})), async (req, res, next) => {
    try {
        const gifterUserId = req.customer?.sub;
        return (0, response_1.ok)(res, await (0, registry_service_1.confirmExternalGift)((0, params_1.param)(req, "code"), (0, params_1.param)(req, "itemId"), { ...req.body, gifterUserId }));
    }
    catch (err) {
        return next(err);
    }
});
exports.adminRegistryRouter = (0, express_1.Router)();
exports.adminRegistryRouter.use(auth_1.requireAdmin, (0, auth_1.requireRoles)(client_1.AdminRole.OPERATIONS, client_1.AdminRole.SUPER_ADMIN));
exports.adminRegistryRouter.get("/extractions", (0, validate_1.validate)(validators_1.paginationQuerySchema.extend({ search: zod_1.z.string().optional(), status: zod_1.z.nativeEnum(client_1.ExtractionStatus).optional() }), "query"), async (req, res, next) => {
    try {
        const result = await (0, registry_service_1.adminListExtractions)(req.query);
        return (0, response_1.ok)(res, result);
    }
    catch (err) {
        return next(err);
    }
});
exports.adminRegistryRouter.post("/extractions/:id/retry", (0, validate_1.validate)(zod_1.z.object({ id: zod_1.z.string().min(1) }), "params"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, registry_service_1.adminRetryExtraction)((0, params_1.param)(req, "id")));
    }
    catch (err) {
        return next(err);
    }
});
exports.adminRegistryRouter.put("/extractions/:id", (0, validate_1.validate)(zod_1.z.object({ id: zod_1.z.string().min(1) }), "params"), (0, validate_1.validate)(zod_1.z.object({
    title: zod_1.z.string().max(200).optional(),
    description: zod_1.z.string().max(2000).optional(),
    image: zod_1.z.string().url().optional(),
    priceInPaise: zod_1.z.number().int().positive().nullable().optional(),
    storeName: zod_1.z.string().max(80).optional(),
})), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, registry_service_1.adminOverrideExtraction)((0, params_1.param)(req, "id"), req.body));
    }
    catch (err) {
        return next(err);
    }
});
exports.adminRegistryRouter.get("/", (0, validate_1.validate)(validators_1.paginationQuerySchema.extend({
    search: zod_1.z.string().optional(),
    status: zod_1.z.nativeEnum(client_1.RegistryStatus).optional(),
    visibility: zod_1.z.nativeEnum(client_1.RegistryVisibility).optional(),
}), "query"), async (req, res, next) => {
    try {
        const result = await (0, registry_service_1.adminListRegistries)(req.query);
        return (0, response_1.ok)(res, result);
    }
    catch (err) {
        return next(err);
    }
});
exports.adminRegistryRouter.get("/:id", (0, validate_1.validate)(zod_1.z.object({ id: zod_1.z.string().min(1) }), "params"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, registry_service_1.adminGetRegistry)((0, params_1.param)(req, "id")));
    }
    catch (err) {
        return next(err);
    }
});
exports.adminRegistryRouter.patch("/:id", (0, validate_1.validate)(zod_1.z.object({ id: zod_1.z.string().min(1) }), "params"), (0, validate_1.validate)(zod_1.z.object({
    status: zod_1.z.nativeEnum(client_1.RegistryStatus).optional(),
    visibility: zod_1.z.nativeEnum(client_1.RegistryVisibility).optional(),
})), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, registry_service_1.adminUpdateRegistry)((0, params_1.param)(req, "id"), req.body));
    }
    catch (err) {
        return next(err);
    }
});
//# sourceMappingURL=registry.routes.js.map