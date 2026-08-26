"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockStatusFlag = void 0;
exports.listProducts = listProducts;
exports.getProductBySlug = getProductBySlug;
exports.listCategories = listCategories;
exports.adminListProducts = adminListProducts;
exports.adminGetProduct = adminGetProduct;
exports.createProduct = createProduct;
exports.updateProduct = updateProduct;
exports.deleteProduct = deleteProduct;
exports.adminListCategories = adminListCategories;
exports.createCategory = createCategory;
exports.updateCategory = updateCategory;
exports.deleteCategory = deleteCategory;
const client_1 = require("@prisma/client");
Object.defineProperty(exports, "StockStatusFlag", { enumerable: true, get: function () { return client_1.StockStatusFlag; } });
const prisma_1 = require("../../db/prisma");
const errors_1 = require("../../lib/errors");
const media_ref_1 = require("../../lib/media-ref");
const redis_1 = require("../../lib/redis");
const response_1 = require("../../lib/response");
const validators_1 = require("../../lib/validators");
const inventory_service_1 = require("./inventory.service");
const PUB_TTL = 60; // 1 minute — products change more often than themes
const ADM_TTL = 15;
const productListInclude = {
    images: { include: { media: true }, orderBy: { displayOrder: "asc" } },
    categoryTags: { include: { category: true } },
    themeTags: { include: { theme: { select: { id: true, title: true, slug: true } } } },
    inventory: true,
};
const productDetailInclude = {
    ...productListInclude,
    personalizationFields: true,
};
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
        personalizationFields: (p.personalizationFields ?? []).map((f) => ({
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
// ─── Public catalog ───────────────────────────────────────────────────────────
async function listProducts(q) {
    const { page, pageSize, skip, take } = (0, response_1.parsePagination)(q, 1000);
    const where = {
        deletedAt: null,
        isActive: true,
        ...(q.search
            ? {
                OR: [
                    { title: { contains: q.search, mode: "insensitive" } },
                    { description: { contains: q.search, mode: "insensitive" } },
                    { sku: { contains: q.search, mode: "insensitive" } },
                ],
            }
            : {}),
        ...(q.category ? { categoryTags: { some: { category: { slug: q.category } } } } : {}),
        ...(q.theme ? { themeTags: { some: { theme: { slug: q.theme } } } } : {}),
        ...(q.minPrice !== undefined || q.maxPrice !== undefined
            ? { priceInPaise: { gte: q.minPrice, lte: q.maxPrice } }
            : {}),
    };
    const orderBy = q.sort === "price_asc"
        ? { priceInPaise: "asc" }
        : q.sort === "price_desc"
            ? { priceInPaise: "desc" }
            : q.sort === "newest"
                ? { createdAt: "desc" }
                : { title: "asc" };
    const key = `pub:products:list:${(0, redis_1.cacheKey)({ q, page, pageSize })}`;
    return (0, redis_1.cached)(key, PUB_TTL, async () => {
        const [rows, total] = await Promise.all([
            prisma_1.prisma.product.findMany({ where, skip, take, orderBy, include: productDetailInclude }),
            prisma_1.prisma.product.count({ where }),
        ]);
        return { items: rows.map((r) => shapeProduct(r)), total, page, pageSize };
    });
}
async function getProductBySlug(slug) {
    const key = `pub:products:slug:${slug}`;
    const product = await (0, redis_1.cached)(key, PUB_TTL, () => prisma_1.prisma.product.findFirst({ where: { slug, deletedAt: null, isActive: true }, include: productDetailInclude }));
    if (!product)
        throw new errors_1.NotFoundError("Product not found");
    const themeIds = product.themeTags.map((t) => t.themeId);
    const related = themeIds.length
        ? await prisma_1.prisma.product.findMany({
            where: { deletedAt: null, isActive: true, id: { not: product.id }, themeTags: { some: { themeId: { in: themeIds } } } },
            include: productDetailInclude,
            take: 4,
        })
        : [];
    return { ...shapeProduct(product), related: related.map((r) => shapeProduct(r)) };
}
async function listCategories() {
    const key = "pub:product-categories:list";
    return (0, redis_1.cached)(key, 5 * 60, () => prisma_1.prisma.productCategory.findMany({ where: { isActive: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] }));
}
async function adminListProducts(q) {
    const { page, pageSize, skip, take } = (0, response_1.parsePagination)(q);
    const where = {
        deletedAt: null,
        ...(q.isActive !== undefined && q.isActive !== "" ? { isActive: q.isActive === "true" } : {}),
        ...(q.category ? { categoryTags: { some: { categoryId: q.category } } } : {}),
        ...(q.theme ? { themeTags: { some: { themeId: q.theme } } } : {}),
        ...(q.search
            ? {
                OR: [
                    { title: { contains: q.search, mode: "insensitive" } },
                    { sku: { contains: q.search, mode: "insensitive" } },
                ],
            }
            : {}),
    };
    const orderBy = q.sort === "price" ? { priceInPaise: q.dir ?? "asc" } : q.sort === "title" ? { title: q.dir ?? "asc" } : { createdAt: "desc" };
    const key = `adm:products:${(0, redis_1.cacheKey)(q)}`;
    return (0, redis_1.cached)(key, ADM_TTL, async () => {
        const [rows, total] = await Promise.all([
            prisma_1.prisma.product.findMany({ where, skip, take, orderBy, include: productDetailInclude }),
            prisma_1.prisma.product.count({ where }),
        ]);
        return { items: rows.map((r) => shapeProduct(r)), total, page, pageSize };
    });
}
async function adminGetProduct(id) {
    const product = await prisma_1.prisma.product.findFirst({ where: { id, deletedAt: null }, include: productDetailInclude });
    if (!product)
        throw new errors_1.NotFoundError("Product not found");
    return shapeProduct(product);
}
async function ensureUniqueSlug(base, excludeId) {
    let candidate = base;
    let n = 1;
    while (true) {
        const existing = await prisma_1.prisma.product.findFirst({ where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) } });
        if (!existing)
            return candidate;
        n += 1;
        candidate = `${base}-${n}`;
    }
}
async function createProduct(input) {
    const existingSku = await prisma_1.prisma.product.findFirst({ where: { sku: input.sku } });
    if (existingSku)
        throw new errors_1.ConflictError("SKU_TAKEN", "A product with this SKU already exists");
    const slugBase = (0, validators_1.slugify)(input.slug || input.title);
    const slug = await ensureUniqueSlug(slugBase);
    const product = await prisma_1.prisma.product.create({
        data: {
            title: input.title,
            slug,
            sku: input.sku,
            description: input.description,
            priceInPaise: input.priceInPaise,
            compareAtPriceInPaise: input.compareAtPriceInPaise ?? null,
            personalizationEnabled: input.personalizationEnabled ?? Boolean(input.personalizationFields?.length),
            personalizationCostInPaise: input.personalizationCostInPaise ?? 0,
            isActive: input.isActive ?? true,
            minOrderQuantity: input.minOrderQuantity ?? 1,
            maxOrderQuantity: input.maxOrderQuantity ?? null,
            categoryTags: input.categoryIds?.length ? { create: input.categoryIds.map((categoryId) => ({ categoryId })) } : undefined,
            themeTags: input.themeIds?.length ? { create: input.themeIds.map((themeId) => ({ themeId })) } : undefined,
            images: input.imageMediaIds?.length
                ? { create: input.imageMediaIds.map((mediaId, i) => ({ mediaId, displayOrder: i })) }
                : undefined,
            personalizationFields: input.personalizationFields?.length ? { create: input.personalizationFields } : undefined,
        },
    });
    const quantityAvailable = input.initialQuantity ?? 0;
    const lowStockThreshold = input.lowStockThreshold ?? 10;
    await prisma_1.prisma.inventoryRecord.create({
        data: {
            productId: product.id,
            quantityAvailable,
            lowStockThreshold,
            statusFlag: (0, inventory_service_1.computeStockStatus)(quantityAvailable, lowStockThreshold),
        },
    });
    await invalidateProductCaches();
    return adminGetProduct(product.id);
}
async function updateProduct(id, input) {
    const existing = await prisma_1.prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!existing)
        throw new errors_1.NotFoundError("Product not found");
    if (input.sku && input.sku !== existing.sku) {
        const skuTaken = await prisma_1.prisma.product.findFirst({ where: { sku: input.sku, id: { not: id } } });
        if (skuTaken)
            throw new errors_1.ConflictError("SKU_TAKEN", "A product with this SKU already exists");
    }
    let slug = existing.slug;
    if (input.slug || (input.title && input.title !== existing.title && !input.slug)) {
        slug = await ensureUniqueSlug((0, validators_1.slugify)(input.slug || input.title || existing.title), id);
    }
    await prisma_1.prisma.$transaction(async (tx) => {
        await tx.product.update({
            where: { id },
            data: {
                title: input.title,
                slug,
                sku: input.sku,
                description: input.description,
                priceInPaise: input.priceInPaise,
                compareAtPriceInPaise: input.compareAtPriceInPaise,
                personalizationEnabled: input.personalizationEnabled,
                personalizationCostInPaise: input.personalizationCostInPaise,
                isActive: input.isActive,
                minOrderQuantity: input.minOrderQuantity,
                maxOrderQuantity: input.maxOrderQuantity,
            },
        });
        if (input.categoryIds) {
            await tx.productCategoryTag.deleteMany({ where: { productId: id } });
            if (input.categoryIds.length) {
                await tx.productCategoryTag.createMany({ data: input.categoryIds.map((categoryId) => ({ productId: id, categoryId })) });
            }
        }
        if (input.themeIds) {
            await tx.productThemeTag.deleteMany({ where: { productId: id } });
            if (input.themeIds.length) {
                await tx.productThemeTag.createMany({ data: input.themeIds.map((themeId) => ({ productId: id, themeId })) });
            }
        }
        if (input.imageMediaIds) {
            await tx.productImage.deleteMany({ where: { productId: id } });
            if (input.imageMediaIds.length) {
                await tx.productImage.createMany({
                    data: input.imageMediaIds.map((mediaId, i) => ({ productId: id, mediaId, displayOrder: i })),
                });
            }
        }
        if (input.personalizationFields) {
            await tx.productPersonalizationField.deleteMany({ where: { productId: id } });
            if (input.personalizationFields.length) {
                await tx.productPersonalizationField.createMany({
                    data: input.personalizationFields.map((f) => ({ ...f, productId: id })),
                });
            }
        }
    });
    await invalidateProductCaches();
    return adminGetProduct(id);
}
async function deleteProduct(id) {
    const existing = await prisma_1.prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!existing)
        throw new errors_1.NotFoundError("Product not found");
    await prisma_1.prisma.product.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    await invalidateProductCaches();
}
async function invalidateProductCaches() {
    void (0, redis_1.delPattern)("pub:products:*");
    void (0, redis_1.delPattern)("adm:products:*");
}
// ─── Admin: Categories ────────────────────────────────────────────────────────
async function adminListCategories() {
    return prisma_1.prisma.productCategory.findMany({ orderBy: [{ displayOrder: "asc" }, { name: "asc" }] });
}
async function createCategory(input) {
    const slug = await ensureUniqueCategorySlug((0, validators_1.slugify)(input.slug || input.name));
    const category = await prisma_1.prisma.productCategory.create({
        data: { name: input.name, slug, displayOrder: input.displayOrder ?? 0, isActive: input.isActive ?? true },
    });
    void (0, redis_1.delPattern)("pub:product-categories:*");
    return category;
}
async function ensureUniqueCategorySlug(base, excludeId) {
    let candidate = base;
    let n = 1;
    while (true) {
        const existing = await prisma_1.prisma.productCategory.findFirst({ where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) } });
        if (!existing)
            return candidate;
        n += 1;
        candidate = `${base}-${n}`;
    }
}
async function updateCategory(id, input) {
    const existing = await prisma_1.prisma.productCategory.findFirst({ where: { id } });
    if (!existing)
        throw new errors_1.NotFoundError("Category not found");
    let slug = existing.slug;
    if (input.slug || (input.name && input.name !== existing.name && !input.slug)) {
        slug = await ensureUniqueCategorySlug((0, validators_1.slugify)(input.slug || input.name || existing.name), id);
    }
    const category = await prisma_1.prisma.productCategory.update({
        where: { id },
        data: { name: input.name, slug, displayOrder: input.displayOrder, isActive: input.isActive },
    });
    void (0, redis_1.delPattern)("pub:product-categories:*");
    return category;
}
async function deleteCategory(id) {
    const existing = await prisma_1.prisma.productCategory.findFirst({ where: { id } });
    if (!existing)
        throw new errors_1.NotFoundError("Category not found");
    await prisma_1.prisma.productCategoryTag.deleteMany({ where: { categoryId: id } });
    await prisma_1.prisma.productCategory.delete({ where: { id } });
    void (0, redis_1.delPattern)("pub:product-categories:*");
}
//# sourceMappingURL=catalog.service.js.map