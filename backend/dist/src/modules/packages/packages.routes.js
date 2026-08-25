"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminPackagesRouter = exports.packagesRouter = void 0;
const client_1 = require("@prisma/client");
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../../db/prisma");
const audit_1 = require("../../lib/audit");
const errors_1 = require("../../lib/errors");
const params_1 = require("../../lib/params");
const response_1 = require("../../lib/response");
const validators_1 = require("../../lib/validators");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const client_2 = require("../../integrations/revalidate/client");
const admin_list_service_1 = require("../admin/admin-list.service");
const packages_service_1 = require("./packages.service");
const roles = [
    auth_1.requireAdmin,
    (0, auth_1.requireRoles)(client_1.AdminRole.CONTENT_EDITOR, client_1.AdminRole.OPERATIONS, client_1.AdminRole.SUPER_ADMIN),
];
const id = zod_1.z.object({ id: zod_1.z.string().min(1) });
const packageSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    displayName: zod_1.z.string().optional().nullable(),
    slug: zod_1.z.string().min(1),
    priceInPaise: zod_1.z.number().int().min(0),
    tierRank: zod_1.z.number().int(),
    isRecommended: zod_1.z.boolean().optional(),
    badgeText: zod_1.z.string().optional().nullable(),
    pricingUnit: zod_1.z.string().optional().nullable(),
    hasGiftRegistry: zod_1.z.boolean().optional(),
    isActive: zod_1.z.boolean().optional(),
    isCustomizable: zod_1.z.boolean().optional(),
    displayOrder: zod_1.z.number().int().optional(),
    description: zod_1.z.string().optional().nullable(),
});
const serviceItemSchema = zod_1.z.object({
    extraServiceId: zod_1.z.string().min(1),
    isIncluded: zod_1.z.boolean(),
    displayOrder: zod_1.z.number().int().optional(),
});
const extraServicePriceSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    customizationPriceInPaise: zod_1.z.number().int().min(0),
});
async function audit(req, action, entityId, metadata) {
    await (0, audit_1.writeAuditLog)({
        adminUserId: req.admin.sub,
        action,
        entityType: "Package",
        entityId,
        metadata,
        ipAddress: (0, audit_1.clientIp)(req),
    });
}
async function shapePackage(packageId) {
    const p = await prisma_1.prisma.package.findFirst({
        where: { id: packageId, deletedAt: null },
        include: {
            serviceItems: {
                where: { extraService: { deletedAt: null } },
                orderBy: { displayOrder: "asc" },
                include: { extraService: true },
            },
            _count: {
                select: {
                    serviceItems: true,
                    themeLinks: true,
                },
            },
        },
    });
    if (!p)
        throw new errors_1.NotFoundError("Package not found");
    return {
        id: p.id,
        title: p.title,
        displayName: p.displayName,
        slug: p.slug,
        priceInPaise: p.priceInPaise,
        tierRank: p.tierRank,
        isRecommended: p.isRecommended,
        badgeText: p.badgeText,
        pricingUnit: p.pricingUnit,
        hasGiftRegistry: p.hasGiftRegistry,
        isActive: p.isActive,
        isCustomizable: p.isCustomizable,
        displayOrder: p.displayOrder,
        description: p.description,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        deletedAt: p.deletedAt?.toISOString() ?? null,
        serviceItemCount: p._count.serviceItems,
        includedServiceCount: p.serviceItems.filter((s) => s.isIncluded).length,
        themeCount: p._count.themeLinks,
        serviceItems: p.serviceItems.map((s) => ({
            id: s.id,
            extraServiceId: s.extraServiceId,
            label: s.extraService.label,
            description: s.extraService.description,
            requirements: s.extraService.requirements,
            customizationPriceInPaise: s.extraService.customizationPriceInPaise,
            isIncluded: s.isIncluded,
            displayOrder: s.displayOrder,
        })),
    };
}
exports.packagesRouter = (0, express_1.Router)();
exports.packagesRouter.get("/", async (_req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, packages_service_1.listPackages)());
    }
    catch (err) {
        return next(err);
    }
});
exports.packagesRouter.get("/compare", (0, validate_1.validate)(zod_1.z.object({ ids: zod_1.z.string().min(1) }), "query"), async (req, res, next) => {
    try {
        const { ids } = req.query;
        return (0, response_1.ok)(res, await (0, packages_service_1.comparePackages)(ids
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)));
    }
    catch (err) {
        return next(err);
    }
});
exports.packagesRouter.get("/:slug", (0, validate_1.validate)(zod_1.z.object({ slug: zod_1.z.string().min(1) }), "params"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, packages_service_1.getPackageBySlug)((0, params_1.param)(req, "slug")));
    }
    catch (err) {
        return next(err);
    }
});
exports.adminPackagesRouter = (0, express_1.Router)();
exports.adminPackagesRouter.use(...roles);
exports.adminPackagesRouter.get("/", (0, validate_1.validate)(validators_1.paginationQuerySchema.extend({
    search: zod_1.z.string().optional(),
    sort: zod_1.z.string().optional(),
    dir: zod_1.z.enum(["asc", "desc"]).optional(),
    isActive: zod_1.z.string().optional(),
}), "query"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, admin_list_service_1.adminListPackages)(req.query));
    }
    catch (err) {
        return next(err);
    }
});
exports.adminPackagesRouter.get("/matrix", async (_req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, packages_service_1.getPackageMatrix)());
    }
    catch (err) {
        return next(err);
    }
});
exports.adminPackagesRouter.put("/matrix", (0, validate_1.validate)(zod_1.z.object({
    packages: zod_1.z.array(zod_1.z.object({
        packageId: zod_1.z.string().min(1),
        title: zod_1.z.string().optional(),
        displayName: zod_1.z.string().optional().nullable(),
        description: zod_1.z.string().optional().nullable(),
        priceInPaise: zod_1.z.number().int().min(0).optional(),
        isRecommended: zod_1.z.boolean().optional(),
        isActive: zod_1.z.boolean().optional(),
        isCustomizable: zod_1.z.boolean().optional(),
        items: zod_1.z.array(serviceItemSchema),
    })),
    extraServices: zod_1.z.array(extraServicePriceSchema).optional(),
})), async (req, res, next) => {
    try {
        const result = await (0, packages_service_1.savePackageMatrix)(req.body);
        await audit(req, "SAVE_MATRIX", "all");
        void (0, client_2.triggerRevalidate)(["/packages"]);
        return (0, response_1.ok)(res, result);
    }
    catch (err) {
        return next(err);
    }
});
exports.adminPackagesRouter.get("/:id", (0, validate_1.validate)(id, "params"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await shapePackage((0, params_1.param)(req, "id")));
    }
    catch (err) {
        return next(err);
    }
});
exports.adminPackagesRouter.post("/", (0, validate_1.validate)(packageSchema), async (req, res, next) => {
    try {
        const item = await (0, packages_service_1.createPackage)(req.body);
        await audit(req, "CREATE", item.id);
        void (0, client_2.triggerRevalidate)(["/packages", `/packages/${item.slug}`]);
        return (0, response_1.created)(res, await shapePackage(item.id));
    }
    catch (err) {
        return next(err);
    }
});
exports.adminPackagesRouter.post("/:id/service-items", (0, validate_1.validate)(id, "params"), (0, validate_1.validate)(zod_1.z.object({ items: zod_1.z.array(serviceItemSchema) })), async (req, res, next) => {
    try {
        const item = await (0, packages_service_1.replacePackageServiceItems)((0, params_1.param)(req, "id"), req.body.items);
        await audit(req, "REPLACE_SERVICE_ITEMS", (0, params_1.param)(req, "id"));
        void (0, client_2.triggerRevalidate)(["/packages"]);
        return (0, response_1.ok)(res, item);
    }
    catch (err) {
        return next(err);
    }
});
async function updatePkg(req, res, next) {
    try {
        const item = await (0, packages_service_1.updatePackage)((0, params_1.param)(req, "id"), req.body);
        await audit(req, "UPDATE", item.id);
        void (0, client_2.triggerRevalidate)(["/packages", `/packages/${item.slug}`]);
        return (0, response_1.ok)(res, await shapePackage(item.id));
    }
    catch (err) {
        return next(err);
    }
}
exports.adminPackagesRouter.put("/:id", (0, validate_1.validate)(id, "params"), (0, validate_1.validate)(packageSchema.partial()), updatePkg);
exports.adminPackagesRouter.patch("/:id", (0, validate_1.validate)(id, "params"), (0, validate_1.validate)(packageSchema.partial()), updatePkg);
exports.adminPackagesRouter.delete("/:id", (0, validate_1.validate)(id, "params"), async (req, res, next) => {
    try {
        await (0, packages_service_1.deletePackage)((0, params_1.param)(req, "id"));
        await audit(req, "DELETE", (0, params_1.param)(req, "id"));
        void (0, client_2.triggerRevalidate)(["/packages"]);
        return (0, response_1.ok)(res, { deleted: true });
    }
    catch (err) {
        return next(err);
    }
});
//# sourceMappingURL=packages.routes.js.map