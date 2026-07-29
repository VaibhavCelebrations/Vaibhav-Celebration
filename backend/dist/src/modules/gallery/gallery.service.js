"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureGalleryTag = ensureGalleryTag;
exports.listGalleryTags = listGalleryTags;
exports.listGallery = listGallery;
exports.createGalleryImage = createGalleryImage;
exports.updateGalleryImage = updateGalleryImage;
exports.deleteGalleryImage = deleteGalleryImage;
exports.syncThemeGalleryTag = syncThemeGalleryTag;
exports.removeThemeGalleryTag = removeThemeGalleryTag;
const prisma_1 = require("../../db/prisma");
const errors_1 = require("../../lib/errors");
const redis_1 = require("../../lib/redis");
const PUB_TTL = 5 * 60;
const include = {
    media: true,
    theme: { select: { id: true, title: true, slug: true } },
    tags: { include: { tag: true } },
};
function slugifyTag(name) {
    return name.trim().replace(/\s+/g, " ");
}
async function ensureGalleryTag(name) {
    const normalized = slugifyTag(name);
    if (!normalized)
        throw new errors_1.NotFoundError("Tag name is required");
    return prisma_1.prisma.galleryTag.upsert({
        where: { name: normalized },
        create: { name: normalized },
        update: {},
    });
}
async function listGalleryTags() {
    return prisma_1.prisma.galleryTag.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { images: true } } },
    });
}
async function resolveTagIds(input) {
    const ids = new Set(input.tagIds ?? []);
    for (const name of input.tagNames ?? []) {
        const tag = await ensureGalleryTag(name);
        ids.add(tag.id);
    }
    if (input.themeId) {
        const theme = await prisma_1.prisma.theme.findFirst({
            where: { id: input.themeId, deletedAt: null },
            select: { title: true },
        });
        if (theme) {
            const themeTag = await ensureGalleryTag(theme.title);
            ids.add(themeTag.id);
        }
    }
    return [...ids];
}
function listGallery(tag, themeId) {
    const key = `pub:gallery:list:${(0, redis_1.cacheKey)({ tag, themeId })}`;
    return (0, redis_1.cached)(key, PUB_TTL, () => prisma_1.prisma.galleryImage.findMany({
        where: {
            deletedAt: null,
            isActive: true,
            ...(themeId ? { themeId } : {}),
            ...(tag ? { tags: { some: { tag: { name: tag } } } } : {}),
        },
        include,
        orderBy: { displayOrder: "asc" },
    }));
}
async function createGalleryImage(data, tagIds, tagNames) {
    const resolvedTagIds = await resolveTagIds({
        tagIds,
        tagNames,
        themeId: data.themeId,
    });
    const img = await prisma_1.prisma.galleryImage.create({
        data: {
            ...data,
            tags: resolvedTagIds.length
                ? { create: resolvedTagIds.map((tagId) => ({ tagId })) }
                : undefined,
        },
        include,
    });
    void (0, redis_1.delPattern)("pub:gallery:*");
    return img;
}
async function updateGalleryImage(id, data, tagIds, tagNames) {
    const existing = await prisma_1.prisma.galleryImage.findFirst({
        where: { id, deletedAt: null },
    });
    if (!existing)
        throw new errors_1.NotFoundError("Gallery image not found");
    const themeId = data.themeId === undefined
        ? existing.themeId
        : data.themeId;
    const shouldReplaceTags = tagIds !== undefined || tagNames !== undefined;
    const resolvedTagIds = shouldReplaceTags
        ? await resolveTagIds({ tagIds: tagIds ?? [], tagNames: tagNames ?? [], themeId })
        : themeId && themeId !== existing.themeId
            ? await resolveTagIds({
                tagIds: (await prisma_1.prisma.galleryImageTag.findMany({
                    where: { galleryImageId: id },
                    select: { tagId: true },
                })).map((row) => row.tagId),
                themeId,
            })
            : null;
    await prisma_1.prisma.$transaction(async (tx) => {
        await tx.galleryImage.update({ where: { id }, data });
        if (resolvedTagIds) {
            await tx.galleryImageTag.deleteMany({ where: { galleryImageId: id } });
            if (resolvedTagIds.length) {
                await tx.galleryImageTag.createMany({
                    data: resolvedTagIds.map((tagId) => ({ galleryImageId: id, tagId })),
                    skipDuplicates: true,
                });
            }
        }
    });
    const updated = await prisma_1.prisma.galleryImage.findUniqueOrThrow({ where: { id }, include });
    void (0, redis_1.delPattern)("pub:gallery:*");
    return updated;
}
async function deleteGalleryImage(id) {
    const result = await prisma_1.prisma.galleryImage.updateMany({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date(), isActive: false },
    });
    if (!result.count)
        throw new errors_1.NotFoundError("Gallery image not found");
    void (0, redis_1.delPattern)("pub:gallery:*");
}
/** Ensures a GalleryTag exists for a theme title (used on theme create/update). */
async function syncThemeGalleryTag(themeTitle, previousTitle) {
    const tag = await ensureGalleryTag(themeTitle);
    if (previousTitle && previousTitle !== themeTitle) {
        const old = await prisma_1.prisma.galleryTag.findUnique({ where: { name: slugifyTag(previousTitle) } });
        if (old && old.id !== tag.id) {
            const joins = await prisma_1.prisma.galleryImageTag.findMany({ where: { tagId: old.id } });
            if (joins.length) {
                await prisma_1.prisma.galleryImageTag.createMany({
                    data: joins.map((j) => ({ galleryImageId: j.galleryImageId, tagId: tag.id })),
                    skipDuplicates: true,
                });
            }
            await prisma_1.prisma.galleryImageTag.deleteMany({ where: { tagId: old.id } });
            await prisma_1.prisma.galleryTag.delete({ where: { id: old.id } });
        }
    }
    return tag;
}
/** Removes theme-linked gallery tag and clears themeId on images when a theme is archived. */
async function removeThemeGalleryTag(themeId, themeTitle) {
    await prisma_1.prisma.galleryImage.updateMany({
        where: { themeId, deletedAt: null },
        data: { themeId: null },
    });
    const tag = await prisma_1.prisma.galleryTag.findUnique({ where: { name: slugifyTag(themeTitle) } });
    if (!tag)
        return;
    await prisma_1.prisma.galleryImageTag.deleteMany({ where: { tagId: tag.id } });
    await prisma_1.prisma.galleryTag.delete({ where: { id: tag.id } });
}
//# sourceMappingURL=gallery.service.js.map