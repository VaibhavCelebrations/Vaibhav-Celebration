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
exports.toMediaRef = toMediaRef;
exports.listResult = listResult;
exports.adminListThemes = adminListThemes;
exports.adminGetTheme = adminGetTheme;
exports.adminListPackages = adminListPackages;
exports.adminListFaqs = adminListFaqs;
const prisma_1 = require("../../db/prisma");
const response_1 = require("../../lib/response");
const media_ref_1 = require("../../lib/media-ref");
const redis_1 = require("../../lib/redis");
const ADM_TTL = 30; // 30 seconds for admin lists
function toMediaRef(media) {
    if (!media)
        return null;
    return { id: media.id, url: media.url, altText: media.altText ?? undefined };
}
function listResult(items, total, page, pageSize) {
    return { items, total, page, pageSize };
}
async function adminListThemes(q) {
    const { page, pageSize, skip, take } = (0, response_1.parsePagination)(q);
    const where = {
        deletedAt: null,
        ...(q.isActive !== undefined && q.isActive !== ""
            ? { isActive: q.isActive === "true" }
            : {}),
        ...(q.search
            ? {
                OR: [
                    { title: { contains: q.search, mode: "insensitive" } },
                    { displayName: { contains: q.search, mode: "insensitive" } },
                    { slug: { contains: q.search, mode: "insensitive" } },
                    { shortDescription: { contains: q.search, mode: "insensitive" } },
                ],
            }
            : {}),
    };
    const orderBy = q.sort === "title"
        ? { title: q.dir ?? "asc" }
        : q.sort === "updatedAt"
            ? { updatedAt: q.dir ?? "desc" }
            : { displayOrder: "asc" };
    const key = `adm:themes:${(0, redis_1.cacheKey)(q)}`;
    return (0, redis_1.cached)(key, ADM_TTL, async () => {
        const [rows, total] = await Promise.all([
            prisma_1.prisma.theme.findMany({
                where,
                skip,
                take,
                orderBy,
                include: {
                    heroImage: true,
                    _count: {
                        select: {
                            packages: { where: { package: { deletedAt: null } } },
                            galleryImages: { where: { deletedAt: null } },
                        },
                    },
                },
            }),
            prisma_1.prisma.theme.count({ where }),
        ]);
        const ogMap = await (0, media_ref_1.loadMediaMap)(rows.map((t) => t.ogImageId));
        const items = rows.map((t) => ({
            id: t.id,
            title: t.title,
            slug: t.slug,
            shortDescription: t.shortDescription,
            storyDescription: t.storyDescription,
            audienceNote: t.audienceNote,
            heroImage: toMediaRef(t.heroImage),
            isActive: t.isActive,
            displayOrder: t.displayOrder,
            seoTitle: t.seoTitle,
            seoDescription: t.seoDescription,
            ogImage: t.ogImageId ? ogMap.get(t.ogImageId) ?? null : null,
            createdAt: t.createdAt.toISOString(),
            updatedAt: t.updatedAt.toISOString(),
            deletedAt: t.deletedAt?.toISOString() ?? null,
            packageCount: t._count.packages,
            galleryCount: t._count.galleryImages,
        }));
        return listResult(items, total, page, pageSize);
    });
}
async function adminGetTheme(id) {
    const t = await prisma_1.prisma.theme.findFirst({
        where: { id, deletedAt: null },
        include: {
            heroImage: true,
            sampleAssets: {
                where: { deletedAt: null },
                include: { media: true },
                orderBy: { displayOrder: "asc" },
            },
            packages: {
                where: { package: { deletedAt: null } },
                include: { package: { select: { id: true, title: true, slug: true, priceInPaise: true } } },
            },
            _count: {
                select: {
                    packages: { where: { package: { deletedAt: null } } },
                    galleryImages: { where: { deletedAt: null } },
                },
            },
        },
    });
    if (!t)
        return null;
    const { loadMediaById } = await Promise.resolve().then(() => __importStar(require("../../lib/media-ref")));
    const ogImage = await loadMediaById(t.ogImageId);
    return {
        id: t.id,
        title: t.title,
        slug: t.slug,
        shortDescription: t.shortDescription,
        storyDescription: t.storyDescription,
        audienceNote: t.audienceNote,
        heroImage: toMediaRef(t.heroImage),
        isActive: t.isActive,
        displayOrder: t.displayOrder,
        seoTitle: t.seoTitle,
        seoDescription: t.seoDescription,
        ogImage,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        deletedAt: t.deletedAt?.toISOString() ?? null,
        packageCount: t._count.packages,
        galleryCount: t._count.galleryImages,
        // Gallery display images managed via the gallery-images endpoint
        galleryImageAssets: t.sampleAssets
            .filter((s) => s.title === "gallery-image")
            .map((s) => ({ id: s.id, media: toMediaRef(s.media), displayOrder: s.displayOrder })),
        // Other sample assets (digital invite, video, etc.)
        sampleAssets: t.sampleAssets
            .filter((s) => s.title !== "gallery-image")
            .map((s) => ({
            id: s.id,
            themeId: s.themeId,
            type: s.type,
            title: s.title,
            media: toMediaRef(s.media),
            description: s.description,
            displayOrder: s.displayOrder,
            deletedAt: s.deletedAt?.toISOString() ?? null,
        })),
        packageLinks: t.packages.map((p) => ({
            id: p.id,
            themeId: p.themeId,
            packageId: p.packageId,
            packageTitle: p.package.title,
            priceOverrideInPaise: p.priceOverrideInPaise,
            isActive: p.isActive,
        })),
    };
}
async function adminListPackages(q) {
    const { page, pageSize, skip, take } = (0, response_1.parsePagination)(q);
    const where = {
        deletedAt: null,
        ...(q.isActive !== undefined && q.isActive !== ""
            ? { isActive: q.isActive === "true" }
            : {}),
        ...(q.search
            ? {
                OR: [
                    { title: { contains: q.search, mode: "insensitive" } },
                    { slug: { contains: q.search, mode: "insensitive" } },
                ],
            }
            : {}),
    };
    const key = `adm:packages:${(0, redis_1.cacheKey)(q)}`;
    return (0, redis_1.cached)(key, ADM_TTL, async () => {
        const [rows, total] = await Promise.all([
            prisma_1.prisma.package.findMany({
                where,
                skip,
                take,
                orderBy: [{ tierRank: "asc" }, { displayOrder: "asc" }],
                include: {
                    _count: {
                        select: {
                            serviceItems: { where: { extraService: { deletedAt: null } } },
                            themeLinks: true,
                        },
                    },
                },
            }),
            prisma_1.prisma.package.count({ where }),
        ]);
        const items = rows.map((p) => ({
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
            includedServiceCount: 0,
            themeCount: p._count.themeLinks,
        }));
        return listResult(items, total, page, pageSize);
    });
}
async function adminListFaqs(q) {
    const { page, pageSize, skip, take } = (0, response_1.parsePagination)(q);
    const where = {
        deletedAt: null,
        ...(q.isActive !== undefined && q.isActive !== ""
            ? { isActive: q.isActive === "true" }
            : {}),
        ...(q.category ? { category: q.category } : {}),
        ...(q.search
            ? {
                OR: [
                    { question: { contains: q.search, mode: "insensitive" } },
                    { answer: { contains: q.search, mode: "insensitive" } },
                ],
            }
            : {}),
    };
    const key = `adm:faqs:${(0, redis_1.cacheKey)(q)}`;
    return (0, redis_1.cached)(key, ADM_TTL, async () => {
        const [rows, total] = await Promise.all([
            prisma_1.prisma.fAQ.findMany({ where, skip, take, orderBy: { displayOrder: "asc" } }),
            prisma_1.prisma.fAQ.count({ where }),
        ]);
        const items = rows.map((f) => ({
            id: f.id,
            question: f.question,
            answer: f.answer,
            category: f.category,
            displayOrder: f.displayOrder,
            isActive: f.isActive,
            deletedAt: f.deletedAt?.toISOString() ?? null,
        }));
        return listResult(items, total, page, pageSize);
    });
}
//# sourceMappingURL=admin-list.service.js.map