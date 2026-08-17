"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminThemesRouter = exports.themesRouter = void 0;
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
const admin_list_service_1 = require("../admin/admin-list.service");
const themes_service_1 = require("./themes.service");
const roleGuard = [
    auth_1.requireAdmin,
    (0, auth_1.requireRoles)(client_1.AdminRole.CONTENT_EDITOR, client_1.AdminRole.OPERATIONS, client_1.AdminRole.SUPER_ADMIN),
];
const idSchema = zod_1.z.object({ id: zod_1.z.string().min(1) });
const themeSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    slug: zod_1.z.string().min(1),
    shortDescription: zod_1.z.string().min(1),
    storyDescription: zod_1.z.string().optional().nullable(),
    audienceNote: zod_1.z.string().optional().nullable(),
    heroImageId: zod_1.z.string().optional().nullable(),
    isActive: zod_1.z.boolean().optional(),
    displayOrder: zod_1.z.number().int().optional(),
    seoTitle: zod_1.z.string().optional().nullable(),
    seoDescription: zod_1.z.string().optional().nullable(),
    ogImageId: zod_1.z.string().optional().nullable(),
});
const updateSchema = themeSchema.partial();
async function audit(req, action, id, metadata) {
    await (0, audit_1.writeAuditLog)({
        adminUserId: req.admin.sub,
        action,
        entityType: "Theme",
        entityId: id,
        metadata,
        ipAddress: (0, audit_1.clientIp)(req),
    });
}
exports.themesRouter = (0, express_1.Router)();
exports.themesRouter.get("/", (0, validate_1.validate)(zod_1.z.object({ search: zod_1.z.string().optional(), tag: zod_1.z.string().optional() }), "query"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, themes_service_1.listThemes)(req.query.search, req.query.tag));
    }
    catch (err) {
        return next(err);
    }
});
exports.themesRouter.get("/:slug", (0, validate_1.validate)(zod_1.z.object({ slug: zod_1.z.string().min(1) }), "params"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, themes_service_1.getThemeBySlug)((0, params_1.param)(req, "slug")));
    }
    catch (err) {
        return next(err);
    }
});
exports.adminThemesRouter = (0, express_1.Router)();
exports.adminThemesRouter.use(...roleGuard);
exports.adminThemesRouter.get("/", (0, validate_1.validate)(validators_1.paginationQuerySchema.extend({
    search: zod_1.z.string().optional(),
    sort: zod_1.z.string().optional(),
    dir: zod_1.z.enum(["asc", "desc"]).optional(),
    isActive: zod_1.z.string().optional(),
}), "query"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, admin_list_service_1.adminListThemes)(req.query));
    }
    catch (err) {
        return next(err);
    }
});
exports.adminThemesRouter.get("/:id", (0, validate_1.validate)(idSchema, "params"), async (req, res, next) => {
    try {
        const item = await (0, admin_list_service_1.adminGetTheme)((0, params_1.param)(req, "id"));
        if (!item)
            throw new errors_1.NotFoundError("Theme not found");
        return (0, response_1.ok)(res, item);
    }
    catch (err) {
        return next(err);
    }
});
exports.adminThemesRouter.post("/", (0, validate_1.validate)(themeSchema), async (req, res, next) => {
    try {
        const item = await (0, themes_service_1.createTheme)(req.body);
        await audit(req, "CREATE", item.id);
        void (0, client_2.triggerRevalidate)(["/themes", `/themes/${item.slug}`]);
        return (0, response_1.created)(res, await (0, admin_list_service_1.adminGetTheme)(item.id));
    }
    catch (err) {
        return next(err);
    }
});
exports.adminThemesRouter.put("/reorder", (0, validate_1.validate)(zod_1.z.object({
    items: zod_1.z.array(zod_1.z.object({ id: zod_1.z.string().min(1), displayOrder: zod_1.z.number().int() })).min(1),
})), async (req, res, next) => {
    try {
        await (0, themes_service_1.reorderThemes)(req.body.items);
        await audit(req, "REORDER", "bulk", req.body);
        void (0, client_2.triggerRevalidate)(["/themes"]);
        return (0, response_1.ok)(res, { reordered: true });
    }
    catch (err) {
        return next(err);
    }
});
exports.adminThemesRouter.post("/:id/sample-assets", (0, validate_1.validate)(idSchema, "params"), (0, validate_1.validate)(zod_1.z.object({
    type: zod_1.z.nativeEnum(client_1.SampleAssetType),
    title: zod_1.z.string().min(1),
    mediaId: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    displayOrder: zod_1.z.number().int().optional(),
})), async (req, res, next) => {
    try {
        const item = await (0, themes_service_1.addSampleAsset)((0, params_1.param)(req, "id"), req.body);
        await audit(req, "ADD_SAMPLE_ASSET", (0, params_1.param)(req, "id"), {
            assetId: item.id,
        });
        void (0, client_2.triggerRevalidate)(["/themes"]);
        return (0, response_1.created)(res, item);
    }
    catch (err) {
        return next(err);
    }
});
exports.adminThemesRouter.put("/:id/packages", (0, validate_1.validate)(idSchema, "params"), (0, validate_1.validate)(zod_1.z.object({
    links: zod_1.z.array(zod_1.z.object({
        packageId: zod_1.z.string().min(1),
        priceOverrideInPaise: zod_1.z.number().int().optional().nullable(),
        isActive: zod_1.z.boolean().optional(),
    })),
})), async (req, res, next) => {
    try {
        await (0, themes_service_1.setThemePackages)((0, params_1.param)(req, "id"), req.body.links);
        await audit(req, "UPDATE_PACKAGES", (0, params_1.param)(req, "id"), req.body);
        void (0, client_2.triggerRevalidate)(["/themes"]);
        return (0, response_1.ok)(res, await (0, admin_list_service_1.adminGetTheme)((0, params_1.param)(req, "id")));
    }
    catch (err) {
        return next(err);
    }
});
exports.adminThemesRouter.delete("/:id/sample-assets/:assetId", (0, validate_1.validate)(zod_1.z.object({ id: zod_1.z.string().min(1), assetId: zod_1.z.string().min(1) }), "params"), async (req, res, next) => {
    try {
        await (0, themes_service_1.deleteSampleAsset)((0, params_1.param)(req, "id"), (0, params_1.param)(req, "assetId"));
        await audit(req, "DELETE_SAMPLE_ASSET", (0, params_1.param)(req, "id"));
        void (0, client_2.triggerRevalidate)(["/themes"]);
        return (0, response_1.ok)(res, { deleted: true });
    }
    catch (err) {
        return next(err);
    }
});
/** PUT /admin/themes/:id/gallery-images — sync display gallery images (max 4, hero counts as #1) */
exports.adminThemesRouter.put("/:id/gallery-images", (0, validate_1.validate)(idSchema, "params"), (0, validate_1.validate)(zod_1.z.object({
    mediaIds: zod_1.z.array(zod_1.z.string().min(1)).max(4, "Maximum 4 additional gallery images"),
})), async (req, res, next) => {
    try {
        await (0, themes_service_1.syncThemeGalleryImages)((0, params_1.param)(req, "id"), req.body.mediaIds);
        await audit(req, "UPDATE_GALLERY_IMAGES", (0, params_1.param)(req, "id"), req.body);
        void (0, client_2.triggerRevalidate)(["/themes", `/themes/${(0, params_1.param)(req, "id")}`]);
        return (0, response_1.ok)(res, await (0, admin_list_service_1.adminGetTheme)((0, params_1.param)(req, "id")));
    }
    catch (err) {
        return next(err);
    }
});
async function updateHandler(req, res, next) {
    try {
        const item = await (0, themes_service_1.updateTheme)((0, params_1.param)(req, "id"), req.body);
        await audit(req, "UPDATE", item.id, req.body);
        void (0, client_2.triggerRevalidate)(["/themes", `/themes/${item.slug}`]);
        return (0, response_1.ok)(res, await (0, admin_list_service_1.adminGetTheme)(item.id));
    }
    catch (err) {
        return next(err);
    }
}
exports.adminThemesRouter.put("/:id", (0, validate_1.validate)(idSchema, "params"), (0, validate_1.validate)(updateSchema), updateHandler);
exports.adminThemesRouter.patch("/:id", (0, validate_1.validate)(idSchema, "params"), (0, validate_1.validate)(updateSchema), updateHandler);
exports.adminThemesRouter.delete("/:id", (0, validate_1.validate)(idSchema, "params"), async (req, res, next) => {
    try {
        await (0, themes_service_1.deleteTheme)((0, params_1.param)(req, "id"));
        await audit(req, "DELETE", (0, params_1.param)(req, "id"));
        void (0, client_2.triggerRevalidate)(["/themes"]);
        return (0, response_1.ok)(res, { deleted: true });
    }
    catch (err) {
        return next(err);
    }
});
//# sourceMappingURL=themes.routes.js.map