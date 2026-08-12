"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminProductCategoriesRouter = exports.adminProductsRouter = exports.productCategoriesRouter = exports.productsRouter = void 0;
const client_1 = require("@prisma/client");
const express_1 = require("express");
const zod_1 = require("zod");
const audit_1 = require("../../lib/audit");
const errors_1 = require("../../lib/errors");
const params_1 = require("../../lib/params");
const response_1 = require("../../lib/response");
const validators_1 = require("../../lib/validators");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const client_2 = require("../../integrations/revalidate/client");
const catalog_service_1 = require("./catalog.service");
const inventory_service_1 = require("./inventory.service");
const roleGuard = [
    auth_1.requireAdmin,
    (0, auth_1.requireRoles)(client_1.AdminRole.CONTENT_EDITOR, client_1.AdminRole.OPERATIONS, client_1.AdminRole.SUPER_ADMIN),
];
const idSchema = zod_1.z.object({ id: zod_1.z.string().min(1) });
const personalizationFieldSchema = zod_1.z.object({
    fieldKey: zod_1.z.string().min(1),
    label: zod_1.z.string().min(1),
    fieldType: zod_1.z.enum(["text", "number", "shortText"]),
    isRequired: zod_1.z.boolean().optional(),
    maxLength: zod_1.z.number().int().positive().optional(),
});
const productSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    slug: zod_1.z.string().optional(),
    sku: zod_1.z.string().min(1),
    description: zod_1.z.string().min(1),
    priceInPaise: zod_1.z.number().int().positive(),
    compareAtPriceInPaise: zod_1.z.number().int().positive().optional().nullable(),
    personalizationEnabled: zod_1.z.boolean().optional(),
    personalizationCostInPaise: zod_1.z.number().int().nonnegative().optional(),
    isActive: zod_1.z.boolean().optional(),
    minOrderQuantity: zod_1.z.number().int().positive().optional(),
    maxOrderQuantity: zod_1.z.number().int().positive().optional().nullable(),
    initialQuantity: zod_1.z.number().int().nonnegative().optional(),
    lowStockThreshold: zod_1.z.number().int().nonnegative().optional(),
    categoryIds: zod_1.z.array(zod_1.z.string().min(1)).optional(),
    themeIds: zod_1.z.array(zod_1.z.string().min(1)).optional(),
    imageMediaIds: zod_1.z.array(zod_1.z.string().min(1)).optional(),
    personalizationFields: zod_1.z.array(personalizationFieldSchema).optional(),
});
const updateProductSchema = productSchema.partial();
async function audit(req, action, entityType, id, metadata) {
    await (0, audit_1.writeAuditLog)({ adminUserId: req.admin.sub, action, entityType, entityId: id, metadata, ipAddress: (0, audit_1.clientIp)(req) });
}
// ─── Public: Products ─────────────────────────────────────────────────────────
exports.productsRouter = (0, express_1.Router)();
exports.productsRouter.get("/", (0, validate_1.validate)(zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).optional(),
    pageSize: zod_1.z.coerce.number().int().min(1).max(1000).optional(),
    search: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    theme: zod_1.z.string().optional(),
    minPrice: zod_1.z.coerce.number().int().nonnegative().optional(),
    maxPrice: zod_1.z.coerce.number().int().nonnegative().optional(),
    sort: zod_1.z.enum(["price_asc", "price_desc", "newest"]).optional(),
}), "query"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, catalog_service_1.listProducts)(req.query));
    }
    catch (err) {
        return next(err);
    }
});
exports.productsRouter.get("/:slug", (0, validate_1.validate)(zod_1.z.object({ slug: zod_1.z.string().min(1) }), "params"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, catalog_service_1.getProductBySlug)((0, params_1.param)(req, "slug")));
    }
    catch (err) {
        return next(err);
    }
});
exports.productCategoriesRouter = (0, express_1.Router)();
exports.productCategoriesRouter.get("/", async (_req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, catalog_service_1.listCategories)());
    }
    catch (err) {
        return next(err);
    }
});
// ─── Admin: Products ──────────────────────────────────────────────────────────
exports.adminProductsRouter = (0, express_1.Router)();
exports.adminProductsRouter.use(...roleGuard);
exports.adminProductsRouter.get("/", (0, validate_1.validate)(validators_1.paginationQuerySchema.extend({
    search: zod_1.z.string().optional(),
    isActive: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    theme: zod_1.z.string().optional(),
    sort: zod_1.z.string().optional(),
    dir: zod_1.z.enum(["asc", "desc"]).optional(),
}), "query"), async (req, res, next) => {
    try {
        const result = await (0, catalog_service_1.adminListProducts)(req.query);
        return (0, response_1.ok)(res, result);
    }
    catch (err) {
        return next(err);
    }
});
exports.adminProductsRouter.get("/:id", (0, validate_1.validate)(idSchema, "params"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, catalog_service_1.adminGetProduct)((0, params_1.param)(req, "id")));
    }
    catch (err) {
        return next(err);
    }
});
exports.adminProductsRouter.post("/", (0, validate_1.validate)(productSchema), async (req, res, next) => {
    try {
        const item = await (0, catalog_service_1.createProduct)(req.body);
        await audit(req, "CREATE", "Product", item.id);
        void (0, client_2.triggerRevalidate)(["/gifts", `/gifts/${item.slug}`]);
        return (0, response_1.created)(res, item);
    }
    catch (err) {
        return next(err);
    }
});
async function updateHandler(req, res, next) {
    try {
        const item = await (0, catalog_service_1.updateProduct)((0, params_1.param)(req, "id"), req.body);
        await audit(req, "UPDATE", "Product", item.id, req.body);
        void (0, client_2.triggerRevalidate)(["/gifts", `/gifts/${item.slug}`]);
        return (0, response_1.ok)(res, item);
    }
    catch (err) {
        return next(err);
    }
}
exports.adminProductsRouter.put("/:id", (0, validate_1.validate)(idSchema, "params"), (0, validate_1.validate)(updateProductSchema), updateHandler);
exports.adminProductsRouter.patch("/:id", (0, validate_1.validate)(idSchema, "params"), (0, validate_1.validate)(updateProductSchema), updateHandler);
exports.adminProductsRouter.delete("/:id", (0, validate_1.validate)(idSchema, "params"), async (req, res, next) => {
    try {
        await (0, catalog_service_1.deleteProduct)((0, params_1.param)(req, "id"));
        await audit(req, "DELETE", "Product", (0, params_1.param)(req, "id"));
        void (0, client_2.triggerRevalidate)(["/gifts"]);
        return (0, response_1.ok)(res, { deleted: true });
    }
    catch (err) {
        return next(err);
    }
});
exports.adminProductsRouter.post("/:id/inventory/adjust", (0, validate_1.validate)(idSchema, "params"), (0, validate_1.validate)(zod_1.z.object({
    delta: zod_1.z.number().int().refine((v) => v !== 0, "delta must not be zero"),
    reason: zod_1.z.nativeEnum(client_1.InventoryLedgerReason),
    note: zod_1.z.string().optional(),
})), async (req, res, next) => {
    try {
        const productId = (0, params_1.param)(req, "id");
        const result = await (0, inventory_service_1.adjustInventory)({
            productId,
            delta: req.body.delta,
            reason: req.body.reason,
            note: req.body.note,
            adminUserId: req.admin.sub,
        });
        await audit(req, "INVENTORY_ADJUST", "Product", productId, req.body);
        void (0, client_2.triggerRevalidate)(["/gifts"]);
        return (0, response_1.ok)(res, result);
    }
    catch (err) {
        return next(err);
    }
});
exports.adminProductsRouter.get("/:id/inventory/history", (0, validate_1.validate)(idSchema, "params"), (0, validate_1.validate)(validators_1.paginationQuerySchema, "query"), async (req, res, next) => {
    try {
        const result = await (0, inventory_service_1.getInventoryHistory)((0, params_1.param)(req, "id"), req.query);
        return (0, response_1.ok)(res, result);
    }
    catch (err) {
        return next(err);
    }
});
// ─── Admin: Product Categories ───────────────────────────────────────────────
exports.adminProductCategoriesRouter = (0, express_1.Router)();
exports.adminProductCategoriesRouter.use(...roleGuard);
exports.adminProductCategoriesRouter.get("/", async (_req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, catalog_service_1.adminListCategories)());
    }
    catch (err) {
        return next(err);
    }
});
const categorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    slug: zod_1.z.string().optional(),
    displayOrder: zod_1.z.number().int().optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.adminProductCategoriesRouter.post("/", (0, validate_1.validate)(categorySchema), async (req, res, next) => {
    try {
        const item = await (0, catalog_service_1.createCategory)(req.body);
        await audit(req, "CREATE", "ProductCategory", item.id);
        return (0, response_1.created)(res, item);
    }
    catch (err) {
        return next(err);
    }
});
exports.adminProductCategoriesRouter.put("/:id", (0, validate_1.validate)(idSchema, "params"), (0, validate_1.validate)(categorySchema.partial()), async (req, res, next) => {
    try {
        const item = await (0, catalog_service_1.updateCategory)((0, params_1.param)(req, "id"), req.body);
        await audit(req, "UPDATE", "ProductCategory", item.id, req.body);
        return (0, response_1.ok)(res, item);
    }
    catch (err) {
        return next(err);
    }
});
exports.adminProductCategoriesRouter.delete("/:id", (0, validate_1.validate)(idSchema, "params"), async (req, res, next) => {
    try {
        await (0, catalog_service_1.deleteCategory)((0, params_1.param)(req, "id"));
        await audit(req, "DELETE", "ProductCategory", (0, params_1.param)(req, "id"));
        return (0, response_1.ok)(res, { deleted: true });
    }
    catch (err) {
        if (err instanceof errors_1.NotFoundError)
            return next(err);
        return next(err);
    }
});
//# sourceMappingURL=catalog.routes.js.map