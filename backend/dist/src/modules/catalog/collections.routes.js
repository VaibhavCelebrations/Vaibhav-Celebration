"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminProductCollectionsRouter = exports.productCollectionsRouter = void 0;
const client_1 = require("@prisma/client");
const express_1 = require("express");
const zod_1 = require("zod");
const audit_1 = require("../../lib/audit");
const params_1 = require("../../lib/params");
const response_1 = require("../../lib/response");
const validators_1 = require("../../lib/validators");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const client_2 = require("../../integrations/revalidate/client");
const collections_service_1 = require("./collections.service");
const roleGuard = [
    auth_1.requireAdmin,
    (0, auth_1.requireRoles)(client_1.AdminRole.CONTENT_EDITOR, client_1.AdminRole.OPERATIONS, client_1.AdminRole.SUPER_ADMIN),
];
const idSchema = zod_1.z.object({ id: zod_1.z.string().min(1) });
const collectionSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    slug: zod_1.z.string().optional(),
    description: zod_1.z.string().optional().nullable(),
    heroImageId: zod_1.z.string().optional().nullable(),
    startsAt: zod_1.z.coerce.date().optional().nullable(),
    endsAt: zod_1.z.coerce.date().optional().nullable(),
    showOnHomepage: zod_1.z.boolean().optional(),
    isActive: zod_1.z.boolean().optional(),
    displayOrder: zod_1.z.number().int().optional(),
    productIds: zod_1.z.array(zod_1.z.string().min(1)).optional(),
});
async function audit(req, action, entityId, metadata) {
    await (0, audit_1.writeAuditLog)({
        adminUserId: req.admin.sub,
        action,
        entityType: "ProductCollection",
        entityId,
        metadata,
        ipAddress: (0, audit_1.clientIp)(req),
    });
}
exports.productCollectionsRouter = (0, express_1.Router)();
exports.productCollectionsRouter.get("/", (0, validate_1.validate)(zod_1.z.object({ featured: zod_1.z.coerce.boolean().optional() }), "query"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, collections_service_1.listCollections)(req.query));
    }
    catch (err) {
        return next(err);
    }
});
exports.productCollectionsRouter.get("/:slug", (0, validate_1.validate)(zod_1.z.object({ slug: zod_1.z.string().min(1) }), "params"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, collections_service_1.getCollectionBySlug)((0, params_1.param)(req, "slug")));
    }
    catch (err) {
        return next(err);
    }
});
exports.adminProductCollectionsRouter = (0, express_1.Router)();
exports.adminProductCollectionsRouter.use(...roleGuard);
exports.adminProductCollectionsRouter.get("/", (0, validate_1.validate)(validators_1.paginationQuerySchema.extend({
    search: zod_1.z.string().optional(),
    isActive: zod_1.z.string().optional(),
}), "query"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, collections_service_1.adminListCollections)(req.query));
    }
    catch (err) {
        return next(err);
    }
});
exports.adminProductCollectionsRouter.get("/:id", (0, validate_1.validate)(idSchema, "params"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, collections_service_1.adminGetCollection)((0, params_1.param)(req, "id")));
    }
    catch (err) {
        return next(err);
    }
});
exports.adminProductCollectionsRouter.post("/", (0, validate_1.validate)(collectionSchema), async (req, res, next) => {
    try {
        const item = await (0, collections_service_1.createCollection)(req.body);
        await audit(req, "CREATE", item.id, req.body);
        void (0, client_2.triggerRevalidate)(["/gifts"]);
        return (0, response_1.created)(res, item);
    }
    catch (err) {
        return next(err);
    }
});
async function updateHandler(req, res, next) {
    try {
        const item = await (0, collections_service_1.updateCollection)((0, params_1.param)(req, "id"), req.body);
        await audit(req, "UPDATE", item.id, req.body);
        void (0, client_2.triggerRevalidate)(["/gifts", `/gifts/collection/${item.slug}`]);
        return (0, response_1.ok)(res, item);
    }
    catch (err) {
        return next(err);
    }
}
exports.adminProductCollectionsRouter.put("/:id", (0, validate_1.validate)(idSchema, "params"), (0, validate_1.validate)(collectionSchema.partial()), updateHandler);
exports.adminProductCollectionsRouter.patch("/:id", (0, validate_1.validate)(idSchema, "params"), (0, validate_1.validate)(collectionSchema.partial()), updateHandler);
exports.adminProductCollectionsRouter.delete("/:id", (0, validate_1.validate)(idSchema, "params"), async (req, res, next) => {
    try {
        await (0, collections_service_1.deleteCollection)((0, params_1.param)(req, "id"));
        await audit(req, "DELETE", (0, params_1.param)(req, "id"));
        void (0, client_2.triggerRevalidate)(["/gifts"]);
        return (0, response_1.ok)(res, { deleted: true });
    }
    catch (err) {
        return next(err);
    }
});
//# sourceMappingURL=collections.routes.js.map