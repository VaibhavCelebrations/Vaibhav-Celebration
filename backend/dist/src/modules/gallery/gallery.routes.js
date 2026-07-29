"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminGalleryRouter = exports.galleryRouter = void 0;
const params_1 = require("../../lib/params");
const client_1 = require("@prisma/client");
const express_1 = require("express");
const zod_1 = require("zod");
const audit_1 = require("../../lib/audit");
const response_1 = require("../../lib/response");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const client_2 = require("../../integrations/revalidate/client");
const gallery_service_1 = require("./gallery.service");
const roles = [
    auth_1.requireAdmin,
    (0, auth_1.requireRoles)(client_1.AdminRole.CONTENT_EDITOR, client_1.AdminRole.OPERATIONS, client_1.AdminRole.SUPER_ADMIN),
];
const id = zod_1.z.object({ id: zod_1.z.string().min(1) });
const schema = zod_1.z.object({
    mediaId: zod_1.z.string().min(1),
    caption: zod_1.z.string().optional().nullable(),
    altText: zod_1.z.string().min(1),
    themeId: zod_1.z.string().optional().nullable(),
    ctaType: zod_1.z.nativeEnum(client_1.GalleryCtaType).optional(),
    ctaTargetSlug: zod_1.z.string().optional().nullable(),
    isActive: zod_1.z.boolean().optional(),
    displayOrder: zod_1.z.number().int().optional(),
    tagIds: zod_1.z.array(zod_1.z.string()).optional(),
    tagNames: zod_1.z.array(zod_1.z.string().min(1)).optional(),
});
async function audit(req, action, entityId) {
    await (0, audit_1.writeAuditLog)({
        adminUserId: req.admin.sub,
        action,
        entityType: "GalleryImage",
        entityId,
        ipAddress: (0, audit_1.clientIp)(req),
    });
}
exports.galleryRouter = (0, express_1.Router)();
exports.galleryRouter.get("/", (0, validate_1.validate)(zod_1.z.object({ tag: zod_1.z.string().optional(), themeId: zod_1.z.string().optional() }), "query"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, gallery_service_1.listGallery)(req.query.tag, req.query.themeId));
    }
    catch (err) {
        return next(err);
    }
});
exports.adminGalleryRouter = (0, express_1.Router)();
exports.adminGalleryRouter.use(...roles);
exports.adminGalleryRouter.get("/tags", async (_req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, gallery_service_1.listGalleryTags)());
    }
    catch (err) {
        return next(err);
    }
});
exports.adminGalleryRouter.get("/", async (req, res, next) => {
    try {
        const { parsePagination, paginationMeta } = await Promise.resolve().then(() => __importStar(require("../../lib/response")));
        const { prisma } = await Promise.resolve().then(() => __importStar(require("../../db/prisma")));
        const q = req.query;
        const { page, pageSize, skip, take } = parsePagination({
            page: q.page ? Number(q.page) : undefined,
            pageSize: q.pageSize ? Number(q.pageSize) : undefined,
        });
        const where = {
            deletedAt: null,
            ...(q.themeId ? { themeId: q.themeId } : {}),
            ...(q.tag ? { tags: { some: { tag: { name: q.tag } } } } : {}),
            ...(q.search
                ? {
                    OR: [
                        { caption: { contains: q.search, mode: "insensitive" } },
                        { altText: { contains: q.search, mode: "insensitive" } },
                    ],
                }
                : {}),
        };
        const [items, total] = await Promise.all([
            prisma.galleryImage.findMany({
                where,
                skip,
                take,
                include: {
                    media: true,
                    theme: { select: { id: true, title: true, slug: true } },
                    tags: { include: { tag: true } },
                },
                orderBy: { displayOrder: "asc" },
            }),
            prisma.galleryImage.count({ where }),
        ]);
        return (0, response_1.ok)(res, { items, total, page, pageSize }, { pagination: paginationMeta(page, pageSize, total) });
    }
    catch (err) {
        return next(err);
    }
});
exports.adminGalleryRouter.post("/", (0, validate_1.validate)(schema), async (req, res, next) => {
    try {
        const { tagIds, tagNames, ...data } = req.body;
        const item = await (0, gallery_service_1.createGalleryImage)(data, tagIds, tagNames);
        await audit(req, "CREATE", item.id);
        void (0, client_2.triggerRevalidate)(["/gallery"]);
        return (0, response_1.created)(res, item);
    }
    catch (err) {
        return next(err);
    }
});
exports.adminGalleryRouter.put("/:id", (0, validate_1.validate)(id, "params"), (0, validate_1.validate)(schema.partial()), async (req, res, next) => {
    try {
        const { tagIds, tagNames, ...data } = req.body;
        const item = await (0, gallery_service_1.updateGalleryImage)((0, params_1.param)(req, "id"), data, tagIds, tagNames);
        await audit(req, "UPDATE", item.id);
        void (0, client_2.triggerRevalidate)(["/gallery"]);
        return (0, response_1.ok)(res, item);
    }
    catch (err) {
        return next(err);
    }
});
exports.adminGalleryRouter.patch("/:id", (0, validate_1.validate)(id, "params"), (0, validate_1.validate)(schema.partial()), async (req, res, next) => {
    try {
        const { tagIds, tagNames, ...data } = req.body;
        const item = await (0, gallery_service_1.updateGalleryImage)((0, params_1.param)(req, "id"), data, tagIds, tagNames);
        await audit(req, "UPDATE", item.id);
        void (0, client_2.triggerRevalidate)(["/gallery"]);
        return (0, response_1.ok)(res, item);
    }
    catch (err) {
        return next(err);
    }
});
exports.adminGalleryRouter.delete("/:id", (0, validate_1.validate)(id, "params"), async (req, res, next) => {
    try {
        await (0, gallery_service_1.deleteGalleryImage)((0, params_1.param)(req, "id"));
        await audit(req, "DELETE", (0, params_1.param)(req, "id"));
        void (0, client_2.triggerRevalidate)(["/gallery"]);
        return (0, response_1.ok)(res, { deleted: true });
    }
    catch (err) {
        return next(err);
    }
});
//# sourceMappingURL=gallery.routes.js.map