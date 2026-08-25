"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listThemes = listThemes;
exports.getThemeBySlug = getThemeBySlug;
exports.createTheme = createTheme;
exports.updateTheme = updateTheme;
exports.deleteTheme = deleteTheme;
exports.addSampleAsset = addSampleAsset;
exports.reorderThemes = reorderThemes;
exports.setThemePackages = setThemePackages;
exports.deleteSampleAsset = deleteSampleAsset;
exports.syncThemeGalleryImages = syncThemeGalleryImages;
const prisma_1 = require("../../db/prisma");
const errors_1 = require("../../lib/errors");
const redis_1 = require("../../lib/redis");
const gallery_service_1 = require("../gallery/gallery.service");
const publicThemeInclude = {
    heroImage: true,
    sampleAssets: { where: { deletedAt: null }, include: { media: true }, orderBy: { displayOrder: "asc" } },
    packages: {
        where: { isActive: true },
        include: {
            package: {
                include: {
                    serviceItems: {
                        where: { extraService: { deletedAt: null } },
                        orderBy: { displayOrder: "asc" },
                        include: { extraService: true },
                    },
                },
            },
        },
    },
    galleryImages: { where: { deletedAt: null, isActive: true }, include: { media: true }, orderBy: { displayOrder: "asc" } },
};
const PUB_TTL = 5 * 60; // 5 minutes
async function listThemes(search, tag) {
    const term = search?.trim() || tag?.trim();
    const key = `pub:themes:list:${(0, redis_1.cacheKey)({ term })}`;
    return (0, redis_1.cached)(key, PUB_TTL, () => prisma_1.prisma.theme.findMany({
        where: {
            deletedAt: null,
            isActive: true,
            ...(term ? { OR: [{ title: { contains: term, mode: "insensitive" } }, { slug: { contains: term, mode: "insensitive" } }] } : {}),
        },
        include: { heroImage: true },
        orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
    }));
}
async function getThemeBySlug(slug) {
    const key = `pub:themes:slug:${slug}`;
    const theme = await (0, redis_1.cached)(key, PUB_TTL, () => prisma_1.prisma.theme.findFirst({ where: { slug, deletedAt: null, isActive: true }, include: publicThemeInclude }));
    if (!theme)
        throw new errors_1.NotFoundError("Theme not found");
    return theme;
}
async function createTheme(data) {
    const theme = await prisma_1.prisma.theme.create({ data });
    if (typeof data.title === "string") {
        await (0, gallery_service_1.syncThemeGalleryTag)(data.title);
    }
    void (0, redis_1.delPattern)("pub:themes:*");
    void (0, redis_1.delPattern)("adm:themes:*");
    return theme;
}
async function updateTheme(id, data) {
    const existing = await prisma_1.prisma.theme.findFirst({ where: { id, deletedAt: null } });
    if (!existing)
        throw new errors_1.NotFoundError("Theme not found");
    await prisma_1.prisma.theme.updateMany({ where: { id, deletedAt: null }, data });
    const theme = await prisma_1.prisma.theme.findUniqueOrThrow({ where: { id } });
    if (typeof data.title === "string" && data.title !== existing.title) {
        await (0, gallery_service_1.syncThemeGalleryTag)(theme.title, existing.title);
    }
    else if (theme.isActive) {
        await (0, gallery_service_1.syncThemeGalleryTag)(theme.title);
    }
    void (0, redis_1.delPattern)("pub:themes:*");
    void (0, redis_1.delPattern)("adm:themes:*");
    return theme;
}
async function deleteTheme(id) {
    const existing = await prisma_1.prisma.theme.findFirst({ where: { id, deletedAt: null } });
    if (!existing)
        throw new errors_1.NotFoundError("Theme not found");
    await prisma_1.prisma.theme.updateMany({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date(), isActive: false },
    });
    await (0, gallery_service_1.removeThemeGalleryTag)(id, existing.title);
    void (0, redis_1.delPattern)("pub:themes:*");
    void (0, redis_1.delPattern)("adm:themes:*");
}
async function addSampleAsset(themeId, data) {
    const theme = await prisma_1.prisma.theme.findFirst({ where: { id: themeId, deletedAt: null } });
    if (!theme)
        throw new errors_1.NotFoundError("Theme not found");
    const asset = await prisma_1.prisma.themeSampleAsset.create({ data: { themeId, ...data } });
    void (0, redis_1.delPattern)("pub:themes:*");
    void (0, redis_1.delPattern)("adm:themes:*");
    return asset;
}
async function reorderThemes(items) {
    await prisma_1.prisma.$transaction(items.map((item) => prisma_1.prisma.theme.updateMany({ where: { id: item.id, deletedAt: null }, data: { displayOrder: item.displayOrder } })));
    void (0, redis_1.delPattern)("pub:themes:*");
    void (0, redis_1.delPattern)("adm:themes:*");
}
async function setThemePackages(themeId, links) {
    const theme = await prisma_1.prisma.theme.findFirst({ where: { id: themeId, deletedAt: null } });
    if (!theme)
        throw new errors_1.NotFoundError("Theme not found");
    await prisma_1.prisma.themePackage.deleteMany({ where: { themeId } });
    if (links.length) {
        await prisma_1.prisma.themePackage.createMany({
            data: links.map((link) => ({
                themeId,
                packageId: link.packageId,
                priceOverrideInPaise: link.priceOverrideInPaise ?? null,
                isActive: link.isActive ?? true,
            })),
        });
    }
    void (0, redis_1.delPattern)("pub:themes:*");
    void (0, redis_1.delPattern)("adm:themes:*");
}
async function deleteSampleAsset(themeId, assetId) {
    const result = await prisma_1.prisma.themeSampleAsset.updateMany({
        where: { id: assetId, themeId, deletedAt: null },
        data: { deletedAt: new Date() },
    });
    if (!result.count)
        throw new errors_1.NotFoundError("Sample asset not found");
    void (0, redis_1.delPattern)("pub:themes:*");
    void (0, redis_1.delPattern)("adm:themes:*");
}
/**
 * Sync the 'gallery' display images for a theme (Option C).
 * The heroImage counts as image #1; this manages up to 4 additional gallery images
 * stored as ThemeSampleAsset rows with type=OTHER and title='gallery-image'.
 * Maximum 4 extra images (so total with hero ≤ 5).
 */
async function syncThemeGalleryImages(themeId, mediaIds) {
    if (mediaIds.length > 4) {
        throw Object.assign(new Error("Maximum 4 additional gallery images allowed (5 total including hero)"), {
            status: 400,
            code: "VALIDATION_ERROR",
        });
    }
    const theme = await prisma_1.prisma.theme.findFirst({ where: { id: themeId, deletedAt: null } });
    if (!theme)
        throw new errors_1.NotFoundError("Theme not found");
    // Soft-delete all existing gallery-image sample assets
    await prisma_1.prisma.themeSampleAsset.updateMany({
        where: { themeId, title: "gallery-image", deletedAt: null },
        data: { deletedAt: new Date() },
    });
    // Create new ones in order
    if (mediaIds.length > 0) {
        await prisma_1.prisma.themeSampleAsset.createMany({
            data: mediaIds.map((mediaId, idx) => ({
                themeId,
                type: "OTHER",
                title: "gallery-image",
                mediaId,
                displayOrder: idx,
            })),
        });
    }
    void (0, redis_1.delPattern)("pub:themes:*");
    void (0, redis_1.delPattern)("adm:themes:*");
}
//# sourceMappingURL=themes.service.js.map