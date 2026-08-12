"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCollections = listCollections;
exports.getCollectionBySlug = getCollectionBySlug;
exports.adminListCollections = adminListCollections;
exports.adminGetCollection = adminGetCollection;
exports.createCollection = createCollection;
exports.updateCollection = updateCollection;
exports.deleteCollection = deleteCollection;
const prisma_1 = require("../../db/prisma");
const errors_1 = require("../../lib/errors");
const media_ref_1 = require("../../lib/media-ref");
const redis_1 = require("../../lib/redis");
const response_1 = require("../../lib/response");
const validators_1 = require("../../lib/validators");
const PUB_TTL = 60;
const ADM_TTL = 15;
const collectionInclude = {
    heroImage: true,
    items: {
        orderBy: { displayOrder: "asc" },
        include: {
            product: {
                include: {
                    images: { include: { media: true }, orderBy: { displayOrder: "asc" } },
                    categoryTags: { include: { category: true } },
                    themeTags: { include: { theme: { select: { id: true, title: true, slug: true } } } },
                    personalizationFields: true,
                    inventory: true,
                },
            },
        },
    },
};
function activeWindow(now = new Date()) {
    return {
        deletedAt: null,
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    };
}
function shapeProduct(p) {
    return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        sku: p.sku,
        description: p.description,
        priceInPaise: p.priceInPaise,
        compareAtPriceInPaise: p.compareAtPriceInPaise,
        personalizationEnabled: p.personalizationEnabled,
        personalizationCostInPaise: p.personalizationCostInPaise,
        isActive: p.isActive,
        minOrderQuantity: p.minOrderQuantity,
        maxOrderQuantity: p.maxOrderQuantity,
        images: p.images.map((img) => ({ id: img.id, displayOrder: img.displayOrder, media: (0, media_ref_1.toMediaRef)(img.media) })),
        categories: p.categoryTags.map((t) => ({ id: t.category.id, name: t.category.name, slug: t.category.slug })),
        themes: p.themeTags.map((t) => ({ id: t.theme.id, title: t.theme.title, slug: t.theme.slug })),
        personalizationFields: p.personalizationFields.map((f) => ({
            id: f.id,
            fieldKey: f.fieldKey,
            label: f.label,
            fieldType: f.fieldType,
            isRequired: f.isRequired,
            maxLength: f.maxLength,
        })),
        stock: p.inventory
            ? {
                quantityAvailable: p.inventory.quantityAvailable,
                statusFlag: p.inventory.statusFlag,
                lowStockThreshold: p.inventory.lowStockThreshold,
            }
            : null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        deletedAt: p.deletedAt?.toISOString() ?? null,
    };
}
function shapeCollection(c, includeInactiveProducts = false) {
    const items = c.items
        .filter((item) => includeInactiveProducts || (item.product.isActive && !item.product.deletedAt))
        .map((item) => ({ displayOrder: item.displayOrder, product: shapeProduct(item.product) }));
    return {
        id: c.id,
        title: c.title,
        slug: c.slug,
        description: c.description,
        heroImage: (0, media_ref_1.toMediaRef)(c.heroImage),
        startsAt: c.startsAt?.toISOString() ?? null,
        endsAt: c.endsAt?.toISOString() ?? null,
        showOnHomepage: c.showOnHomepage,
        isActive: c.isActive,
        displayOrder: c.displayOrder,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        deletedAt: c.deletedAt?.toISOString() ?? null,
        products: items.map((item) => item.product),
        productCount: items.length,
    };
}
async function listCollections(q) {
    const key = `pub:collections:${(0, redis_1.cacheKey)(q)}`;
    return (0, redis_1.cached)(key, PUB_TTL, async () => {
        const rows = await prisma_1.prisma.productCollection.findMany({
            where: { ...activeWindow(), ...(q.featured ? { showOnHomepage: true } : {}) },
            include: collectionInclude,
            orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
        });
        return rows.map((row) => shapeCollection(row)).filter((row) => row.productCount > 0);
    });
}
async function getCollectionBySlug(slug) {
    const item = await (0, redis_1.cached)(`pub:collections:slug:${slug}`, PUB_TTL, () => prisma_1.prisma.productCollection.findFirst({ where: { slug, ...activeWindow() }, include: collectionInclude }));
    if (!item)
        throw new errors_1.NotFoundError("Collection not found");
    const shaped = shapeCollection(item);
    if (shaped.productCount === 0)
        throw new errors_1.NotFoundError("Collection not found");
    return shaped;
}
async function ensureUniqueSlug(base, excludeId) {
    let candidate = base;
    let n = 1;
    while (true) {
        const existing = await prisma_1.prisma.productCollection.findFirst({
            where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
        });
        if (!existing)
            return candidate;
        n += 1;
        candidate = `${base}-${n}`;
    }
}
async function adminListCollections(q) {
    const { page, pageSize, skip, take } = (0, response_1.parsePagination)(q);
    const where = {
        deletedAt: null,
        ...(q.isActive !== undefined && q.isActive !== "" ? { isActive: q.isActive === "true" } : {}),
        ...(q.search
            ? {
                OR: [
                    { title: { contains: q.search, mode: "insensitive" } },
                    { slug: { contains: q.search, mode: "insensitive" } },
                ],
            }
            : {}),
    };
    const key = `adm:collections:${(0, redis_1.cacheKey)(q)}`;
    return (0, redis_1.cached)(key, ADM_TTL, async () => {
        const [rows, total] = await Promise.all([
            prisma_1.prisma.productCollection.findMany({ where, skip, take, include: collectionInclude, orderBy: [{ displayOrder: "asc" }, { title: "asc" }] }),
            prisma_1.prisma.productCollection.count({ where }),
        ]);
        return { items: rows.map((r) => shapeCollection(r, true)), total, page, pageSize };
    });
}
async function adminGetCollection(id) {
    const item = await prisma_1.prisma.productCollection.findFirst({ where: { id, deletedAt: null }, include: collectionInclude });
    if (!item)
        throw new errors_1.NotFoundError("Collection not found");
    return shapeCollection(item, true);
}
async function syncProducts(tx, collectionId, productIds) {
    if (!productIds)
        return;
    await tx.productCollectionItem.deleteMany({ where: { collectionId } });
    if (productIds.length) {
        await tx.productCollectionItem.createMany({
            data: productIds.map((productId, index) => ({ collectionId, productId, displayOrder: index })),
        });
    }
}
async function createCollection(input) {
    const slug = await ensureUniqueSlug((0, validators_1.slugify)(input.slug || input.title));
    const existing = await prisma_1.prisma.productCollection.findFirst({ where: { slug } });
    if (existing)
        throw new errors_1.ConflictError("SLUG_TAKEN", "A collection with this slug already exists");
    const created = await prisma_1.prisma.$transaction(async (tx) => {
        const row = await tx.productCollection.create({
            data: {
                title: input.title,
                slug,
                description: input.description ?? null,
                heroImageId: input.heroImageId ?? null,
                startsAt: input.startsAt ?? null,
                endsAt: input.endsAt ?? null,
                showOnHomepage: input.showOnHomepage ?? false,
                isActive: input.isActive ?? true,
                displayOrder: input.displayOrder ?? 0,
            },
        });
        await syncProducts(tx, row.id, input.productIds);
        return row;
    });
    await invalidateCollectionCaches();
    return adminGetCollection(created.id);
}
async function updateCollection(id, input) {
    const existing = await prisma_1.prisma.productCollection.findFirst({ where: { id, deletedAt: null } });
    if (!existing)
        throw new errors_1.NotFoundError("Collection not found");
    let slug = existing.slug;
    if (input.slug || (input.title && input.title !== existing.title && !input.slug)) {
        slug = await ensureUniqueSlug((0, validators_1.slugify)(input.slug || input.title || existing.title), id);
    }
    await prisma_1.prisma.$transaction(async (tx) => {
        await tx.productCollection.update({
            where: { id },
            data: {
                title: input.title,
                slug,
                description: input.description,
                heroImageId: input.heroImageId,
                startsAt: input.startsAt,
                endsAt: input.endsAt,
                showOnHomepage: input.showOnHomepage,
                isActive: input.isActive,
                displayOrder: input.displayOrder,
            },
        });
        await syncProducts(tx, id, input.productIds);
    });
    await invalidateCollectionCaches();
    return adminGetCollection(id);
}
async function deleteCollection(id) {
    const updated = await prisma_1.prisma.productCollection.updateMany({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date(), isActive: false },
    });
    if (!updated.count)
        throw new errors_1.NotFoundError("Collection not found");
    await invalidateCollectionCaches();
}
async function invalidateCollectionCaches() {
    void (0, redis_1.delPattern)("pub:collections:*");
    void (0, redis_1.delPattern)("adm:collections:*");
}
//# sourceMappingURL=collections.service.js.map