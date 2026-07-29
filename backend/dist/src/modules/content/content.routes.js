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
exports.adminContentRouter = exports.contentRouter = void 0;
const client_1 = require("@prisma/client");
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../../db/prisma");
const errors_1 = require("../../lib/errors");
const params_1 = require("../../lib/params");
const response_1 = require("../../lib/response");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const client_2 = require("../../integrations/revalidate/client");
const media_ref_1 = require("../../lib/media-ref");
const roles = [
    auth_1.requireAdmin,
    (0, auth_1.requireRoles)(client_1.AdminRole.CONTENT_EDITOR, client_1.AdminRole.OPERATIONS, client_1.AdminRole.SUPER_ADMIN),
];
const id = zod_1.z.object({ id: zod_1.z.string().min(1) });
const testimonial = zod_1.z.object({
    customerName: zod_1.z.string().min(1),
    content: zod_1.z.string().min(1),
    rating: zod_1.z.number().int().min(1).max(5).optional().nullable(),
    subjectType: zod_1.z.nativeEnum(client_1.TestimonialSubjectType),
    themeId: zod_1.z.string().optional().nullable(),
    packageId: zod_1.z.string().optional().nullable(),
    isFeatured: zod_1.z.boolean().optional(),
    isActive: zod_1.z.boolean().optional(),
});
const faq = zod_1.z.object({
    question: zod_1.z.string().min(1),
    answer: zod_1.z.string().min(1),
    category: zod_1.z.string().optional().nullable(),
    displayOrder: zod_1.z.number().int().optional(),
    isActive: zod_1.z.boolean().optional(),
});
const popup = zod_1.z.object({
    title: zod_1.z.string().min(1),
    bodyText: zod_1.z.string().optional().nullable(),
    imageId: zod_1.z.string().optional().nullable(),
    ctaLabel: zod_1.z.string().optional().nullable(),
    ctaUrl: zod_1.z.string().optional().nullable(),
    placements: zod_1.z.array(zod_1.z.nativeEnum(client_1.PopupPlacement)).min(1),
    triggerAfterSeconds: zod_1.z.number().int().min(0).optional(),
    linkedEventId: zod_1.z.string().optional().nullable(),
    isActive: zod_1.z.boolean().optional(),
    startsAt: zod_1.z.coerce.date().optional().nullable(),
    endsAt: zod_1.z.coerce.date().optional().nullable(),
});
const legal = zod_1.z.object({
    type: zod_1.z.nativeEnum(client_1.LegalPageType),
    title: zod_1.z.string().min(1),
    bodyHtml: zod_1.z.string().min(1),
    publishedAt: zod_1.z.coerce.date().optional().nullable(),
});
const metadata = zod_1.z.object({
    pageKey: zod_1.z.string().min(1),
    metaTitle: zod_1.z.string().optional().nullable(),
    metaDescription: zod_1.z.string().optional().nullable(),
    ogImageId: zod_1.z.string().optional().nullable(),
    canonicalUrl: zod_1.z.string().optional().nullable(),
    schemaJsonLd: zod_1.z.unknown().optional().nullable(),
});
const legalTypes = {
    "refund-policy": "REFUND_POLICY",
    "terms-of-service": "TERMS_OF_SERVICE",
    "privacy-policy": "PRIVACY_POLICY",
    "cancellation-policy": "CANCELLATION_POLICY",
};
const FAQ_PATHS = ["/faq", "/"];
const LEGAL_PATHS = [
    "/legal/privacy-policy",
    "/legal/terms-of-service",
    "/legal/refund-policy",
    "/legal/cancellation-policy",
];
exports.contentRouter = (0, express_1.Router)();
exports.contentRouter.get("/testimonials", (0, validate_1.validate)(zod_1.z.object({
    themeId: zod_1.z.string().optional(),
    packageId: zod_1.z.string().optional(),
}), "query"), async (req, res, next) => {
    try {
        const themeId = (0, params_1.queryString)(req, "themeId");
        const packageId = (0, params_1.queryString)(req, "packageId");
        return (0, response_1.ok)(res, await prisma_1.prisma.testimonial.findMany({
            where: {
                deletedAt: null,
                isActive: true,
                ...(themeId ? { themeId } : {}),
                ...(packageId ? { packageId } : {}),
            },
        }));
    }
    catch (error) {
        return next(error);
    }
});
exports.contentRouter.get("/faqs", (0, validate_1.validate)(zod_1.z.object({ category: zod_1.z.string().optional() }), "query"), async (req, res, next) => {
    try {
        const category = (0, params_1.queryString)(req, "category");
        return (0, response_1.ok)(res, await prisma_1.prisma.fAQ.findMany({
            where: {
                deletedAt: null,
                isActive: true,
                ...(category ? { category } : {}),
            },
            orderBy: { displayOrder: "asc" },
        }));
    }
    catch (error) {
        return next(error);
    }
});
exports.contentRouter.get("/popups/active", (0, validate_1.validate)(zod_1.z.object({
    placement: zod_1.z.nativeEnum(client_1.PopupPlacement).default(client_1.PopupPlacement.HOMEPAGE),
}), "query"), async (req, res, next) => {
    try {
        const now = new Date();
        const q = req.query;
        const popups = await prisma_1.prisma.popup.findMany({
            where: {
                deletedAt: null,
                isActive: true,
                placements: { has: q.placement },
                AND: [
                    { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
                    { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
                ],
            },
        });
        const imageMap = await (0, media_ref_1.loadMediaMap)(popups.map((p) => p.imageId));
        return (0, response_1.ok)(res, popups.map((p) => ({
            ...p,
            image: p.imageId ? imageMap.get(p.imageId) ?? null : null,
        })));
    }
    catch (error) {
        return next(error);
    }
});
exports.contentRouter.get("/legal/:type", async (req, res, next) => {
    try {
        const type = legalTypes[(0, params_1.param)(req, "type")];
        if (!type)
            throw new errors_1.NotFoundError("Legal page not found");
        const item = await prisma_1.prisma.legalPage.findUnique({ where: { type } });
        if (!item)
            throw new errors_1.NotFoundError("Legal page not found");
        return (0, response_1.ok)(res, item);
    }
    catch (error) {
        return next(error);
    }
});
exports.contentRouter.get("/metadata/:pageKey", async (req, res, next) => {
    try {
        const item = await prisma_1.prisma.siteMetadata.findUnique({
            where: { pageKey: (0, params_1.param)(req, "pageKey") },
        });
        if (!item)
            throw new errors_1.NotFoundError("Metadata not found");
        const ogImage = await (0, media_ref_1.loadMediaById)(item.ogImageId);
        return (0, response_1.ok)(res, { ...item, ogImage });
    }
    catch (error) {
        return next(error);
    }
});
exports.adminContentRouter = (0, express_1.Router)();
exports.adminContentRouter.use(...roles);
exports.adminContentRouter.get("/testimonials", async (req, res, next) => {
    try {
        const { parsePagination, paginationMeta } = await Promise.resolve().then(() => __importStar(require("../../lib/response")));
        const q = req.query;
        const { page, pageSize, skip, take } = parsePagination({
            page: q.page ? Number(q.page) : undefined,
            pageSize: q.pageSize ? Number(q.pageSize) : undefined,
        });
        const where = {
            deletedAt: null,
            ...(q.search
                ? {
                    OR: [
                        { customerName: { contains: q.search, mode: "insensitive" } },
                        { content: { contains: q.search, mode: "insensitive" } },
                    ],
                }
                : {}),
        };
        const [items, total] = await Promise.all([
            prisma_1.prisma.testimonial.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
            prisma_1.prisma.testimonial.count({ where }),
        ]);
        return (0, response_1.ok)(res, { items, total, page, pageSize }, { pagination: paginationMeta(page, pageSize, total) });
    }
    catch (error) {
        return next(error);
    }
});
exports.adminContentRouter.post("/testimonials", (0, validate_1.validate)(testimonial), async (req, res, next) => {
    try {
        const item = await prisma_1.prisma.testimonial.create({ data: req.body });
        void (0, client_2.triggerRevalidate)(["/", "/about"]);
        return (0, response_1.created)(res, item);
    }
    catch (error) {
        return next(error);
    }
});
exports.adminContentRouter.put("/testimonials/:id", (0, validate_1.validate)(id, "params"), (0, validate_1.validate)(testimonial.partial()), async (req, res, next) => {
    try {
        const item = await prisma_1.prisma.testimonial.update({
            where: { id: (0, params_1.param)(req, "id") },
            data: req.body,
        });
        void (0, client_2.triggerRevalidate)(["/", "/about"]);
        return (0, response_1.ok)(res, item);
    }
    catch (error) {
        return next(error);
    }
});
exports.adminContentRouter.patch("/testimonials/:id", (0, validate_1.validate)(id, "params"), (0, validate_1.validate)(testimonial.partial()), async (req, res, next) => {
    try {
        const item = await prisma_1.prisma.testimonial.update({
            where: { id: (0, params_1.param)(req, "id") },
            data: req.body,
        });
        void (0, client_2.triggerRevalidate)(["/", "/about"]);
        return (0, response_1.ok)(res, item);
    }
    catch (error) {
        return next(error);
    }
});
exports.adminContentRouter.delete("/testimonials/:id", (0, validate_1.validate)(id, "params"), async (req, res, next) => {
    try {
        const result = await prisma_1.prisma.testimonial.updateMany({
            where: { id: (0, params_1.param)(req, "id"), deletedAt: null },
            data: { deletedAt: new Date(), isActive: false },
        });
        if (!result.count)
            throw new errors_1.NotFoundError("Content not found");
        void (0, client_2.triggerRevalidate)(["/", "/about"]);
        return (0, response_1.ok)(res, { deleted: true });
    }
    catch (error) {
        return next(error);
    }
});
exports.adminContentRouter.get("/faqs", (0, validate_1.validate)(zod_1.z.object({
    page: zod_1.z.coerce.number().optional(),
    pageSize: zod_1.z.coerce.number().optional(),
    search: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    isActive: zod_1.z.string().optional(),
}), "query"), async (req, res, next) => {
    try {
        const { adminListFaqs } = await Promise.resolve().then(() => __importStar(require("../admin/admin-list.service")));
        return (0, response_1.ok)(res, await adminListFaqs(req.query));
    }
    catch (error) {
        return next(error);
    }
});
exports.adminContentRouter.post("/faqs", (0, validate_1.validate)(faq), async (req, res, next) => {
    try {
        const item = await prisma_1.prisma.fAQ.create({ data: req.body });
        void (0, client_2.triggerRevalidate)(FAQ_PATHS);
        return (0, response_1.created)(res, item);
    }
    catch (error) {
        return next(error);
    }
});
exports.adminContentRouter.put("/faqs/:id", (0, validate_1.validate)(id, "params"), (0, validate_1.validate)(faq.partial()), async (req, res, next) => {
    try {
        const item = await prisma_1.prisma.fAQ.update({
            where: { id: (0, params_1.param)(req, "id") },
            data: req.body,
        });
        void (0, client_2.triggerRevalidate)(FAQ_PATHS);
        return (0, response_1.ok)(res, item);
    }
    catch (error) {
        return next(error);
    }
});
exports.adminContentRouter.patch("/faqs/:id", (0, validate_1.validate)(id, "params"), (0, validate_1.validate)(faq.partial()), async (req, res, next) => {
    try {
        const item = await prisma_1.prisma.fAQ.update({
            where: { id: (0, params_1.param)(req, "id") },
            data: req.body,
        });
        void (0, client_2.triggerRevalidate)(FAQ_PATHS);
        return (0, response_1.ok)(res, item);
    }
    catch (error) {
        return next(error);
    }
});
exports.adminContentRouter.delete("/faqs/:id", (0, validate_1.validate)(id, "params"), async (req, res, next) => {
    try {
        const result = await prisma_1.prisma.fAQ.updateMany({
            where: { id: (0, params_1.param)(req, "id"), deletedAt: null },
            data: { deletedAt: new Date(), isActive: false },
        });
        if (!result.count)
            throw new errors_1.NotFoundError("Content not found");
        void (0, client_2.triggerRevalidate)(FAQ_PATHS);
        return (0, response_1.ok)(res, { deleted: true });
    }
    catch (error) {
        return next(error);
    }
});
exports.adminContentRouter.get("/popups", async (req, res, next) => {
    try {
        const { parsePagination, paginationMeta } = await Promise.resolve().then(() => __importStar(require("../../lib/response")));
        const q = req.query;
        const { page, pageSize, skip, take } = parsePagination({
            page: q.page ? Number(q.page) : undefined,
            pageSize: q.pageSize ? Number(q.pageSize) : undefined,
        });
        const where = {
            deletedAt: null,
            ...(q.search ? { title: { contains: q.search, mode: "insensitive" } } : {}),
        };
        const [items, total] = await Promise.all([
            prisma_1.prisma.popup.findMany({ where, skip, take, orderBy: { title: "asc" } }),
            prisma_1.prisma.popup.count({ where }),
        ]);
        return (0, response_1.ok)(res, { items, total, page, pageSize }, { pagination: paginationMeta(page, pageSize, total) });
    }
    catch (error) {
        return next(error);
    }
});
exports.adminContentRouter.post("/popups", (0, validate_1.validate)(popup), async (req, res, next) => {
    try {
        const item = await prisma_1.prisma.popup.create({ data: req.body });
        void (0, client_2.triggerRevalidate)(["/"]);
        return (0, response_1.created)(res, item);
    }
    catch (error) {
        return next(error);
    }
});
exports.adminContentRouter.put("/popups/:id", (0, validate_1.validate)(id, "params"), (0, validate_1.validate)(popup.partial()), async (req, res, next) => {
    try {
        const item = await prisma_1.prisma.popup.update({
            where: { id: (0, params_1.param)(req, "id") },
            data: req.body,
        });
        void (0, client_2.triggerRevalidate)(["/"]);
        return (0, response_1.ok)(res, item);
    }
    catch (error) {
        return next(error);
    }
});
exports.adminContentRouter.delete("/popups/:id", (0, validate_1.validate)(id, "params"), async (req, res, next) => {
    try {
        const result = await prisma_1.prisma.popup.updateMany({
            where: { id: (0, params_1.param)(req, "id"), deletedAt: null },
            data: { deletedAt: new Date(), isActive: false },
        });
        if (!result.count)
            throw new errors_1.NotFoundError("Content not found");
        void (0, client_2.triggerRevalidate)(["/"]);
        return (0, response_1.ok)(res, { deleted: true });
    }
    catch (error) {
        return next(error);
    }
});
exports.adminContentRouter.get("/legal", async (_req, res, next) => {
    try {
        const items = await prisma_1.prisma.legalPage.findMany({ orderBy: { type: "asc" } });
        return (0, response_1.ok)(res, { items, total: items.length, page: 1, pageSize: items.length || 4 });
    }
    catch (error) {
        return next(error);
    }
});
exports.adminContentRouter.get("/metadata", async (_req, res, next) => {
    try {
        const rows = await prisma_1.prisma.siteMetadata.findMany({ orderBy: { pageKey: "asc" } });
        const imageMap = await (0, media_ref_1.loadMediaMap)(rows.map((r) => r.ogImageId));
        const items = rows.map((row) => ({
            ...row,
            ogImage: row.ogImageId ? imageMap.get(row.ogImageId) ?? null : null,
        }));
        return (0, response_1.ok)(res, { items, total: items.length, page: 1, pageSize: items.length || 20 });
    }
    catch (error) {
        return next(error);
    }
});
exports.adminContentRouter.post("/legal", (0, validate_1.validate)(legal), async (req, res, next) => {
    try {
        const item = await prisma_1.prisma.legalPage.upsert({
            where: { type: req.body.type },
            create: req.body,
            update: req.body,
        });
        void (0, client_2.triggerRevalidate)(LEGAL_PATHS);
        return (0, response_1.created)(res, item);
    }
    catch (error) {
        return next(error);
    }
});
exports.adminContentRouter.put("/legal/:type", (0, validate_1.validate)(zod_1.z.object({ type: zod_1.z.nativeEnum(client_1.LegalPageType) }), "params"), (0, validate_1.validate)(legal.omit({ type: true }).partial()), async (req, res, next) => {
    try {
        const item = await prisma_1.prisma.legalPage.update({
            where: { type: (0, params_1.param)(req, "type") },
            data: req.body,
        });
        void (0, client_2.triggerRevalidate)(LEGAL_PATHS);
        return (0, response_1.ok)(res, item);
    }
    catch (error) {
        return next(error);
    }
});
exports.adminContentRouter.post("/metadata", (0, validate_1.validate)(metadata), async (req, res, next) => {
    try {
        const item = await prisma_1.prisma.siteMetadata.upsert({
            where: { pageKey: req.body.pageKey },
            create: req.body,
            update: req.body,
        });
        void (0, client_2.triggerRevalidate)(["/"]);
        return (0, response_1.created)(res, item);
    }
    catch (error) {
        return next(error);
    }
});
exports.adminContentRouter.put("/metadata/:pageKey", (0, validate_1.validate)(zod_1.z.object({ pageKey: zod_1.z.string().min(1) }), "params"), (0, validate_1.validate)(metadata.omit({ pageKey: true }).partial()), async (req, res, next) => {
    try {
        const item = await prisma_1.prisma.siteMetadata.update({
            where: { pageKey: (0, params_1.param)(req, "pageKey") },
            data: req.body,
        });
        void (0, client_2.triggerRevalidate)(["/"]);
        return (0, response_1.ok)(res, item);
    }
    catch (error) {
        return next(error);
    }
});
//# sourceMappingURL=content.routes.js.map