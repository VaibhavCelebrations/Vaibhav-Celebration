import { Prisma, StockStatusFlag } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ConflictError, NotFoundError } from "../../lib/errors";
import { loadMediaMap, toMediaRef } from "../../lib/media-ref";
import { cached, cacheKey, delPattern } from "../../lib/redis";
import { parsePagination } from "../../lib/response";
import { slugify } from "../../lib/validators";
import { computeStockStatus } from "./inventory.service";

const PUB_TTL = 60; // 1 minute — products change more often than themes
const ADM_TTL = 15;

const productListInclude = {
  images: { include: { media: true }, orderBy: { displayOrder: "asc" as const } },
  categoryTags: { include: { category: true } },
  themeTags: { include: { theme: { select: { id: true, title: true, slug: true } } } },
  inventory: true,
} satisfies Prisma.ProductInclude;

const productDetailInclude = {
  ...productListInclude,
  personalizationFields: true,
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productDetailInclude }>;

function shapeProduct(p: ProductWithRelations) {
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
    images: p.images.map((img) => ({ id: img.id, displayOrder: img.displayOrder, media: toMediaRef(img.media) })),
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

export async function listProducts(q: {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  theme?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
}) {
  const { page, pageSize, skip, take } = parsePagination(q, 1000);
  const where: Prisma.ProductWhereInput = {
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

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    q.sort === "price_asc"
      ? { priceInPaise: "asc" }
      : q.sort === "price_desc"
        ? { priceInPaise: "desc" }
        : q.sort === "newest"
          ? { createdAt: "desc" }
          : { title: "asc" };

  const key = `pub:products:list:${cacheKey({ q, page, pageSize })}`;
  return cached(key, PUB_TTL, async () => {
    const [rows, total] = await Promise.all([
      prisma.product.findMany({ where, skip, take, orderBy, include: productDetailInclude }),
      prisma.product.count({ where }),
    ]);
    return { items: rows.map((r) => shapeProduct(r as ProductWithRelations)), total, page, pageSize };
  });
}

export async function getProductBySlug(slug: string) {
  const key = `pub:products:slug:${slug}`;
  const product = await cached(key, PUB_TTL, () =>
    prisma.product.findFirst({ where: { slug, deletedAt: null, isActive: true }, include: productDetailInclude }),
  );
  if (!product) throw new NotFoundError("Product not found");

  const themeIds = product.themeTags.map((t) => t.themeId);
  const related = themeIds.length
    ? await prisma.product.findMany({
        where: { deletedAt: null, isActive: true, id: { not: product.id }, themeTags: { some: { themeId: { in: themeIds } } } },
        include: productDetailInclude,
        take: 4,
      })
    : [];

  return { ...shapeProduct(product as ProductWithRelations), related: related.map((r) => shapeProduct(r as ProductWithRelations)) };
}

export async function listCategories() {
  const key = "pub:product-categories:list";
  return cached(key, 5 * 60, () =>
    prisma.productCategory.findMany({ where: { isActive: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] }),
  );
}

// ─── Admin: Products ──────────────────────────────────────────────────────────

export type AdminProductInput = {
  title: string;
  slug?: string;
  sku: string;
  description: string;
  priceInPaise: number;
  compareAtPriceInPaise?: number | null;
  personalizationEnabled?: boolean;
  personalizationCostInPaise?: number;
  isActive?: boolean;
  minOrderQuantity?: number;
  maxOrderQuantity?: number | null;
  initialQuantity?: number;
  lowStockThreshold?: number;
  categoryIds?: string[];
  themeIds?: string[];
  imageMediaIds?: string[];
  personalizationFields?: Array<{ fieldKey: string; label: string; fieldType: string; isRequired?: boolean; maxLength?: number }>;
};

export async function adminListProducts(q: {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: string;
  category?: string;
  theme?: string;
  sort?: string;
  dir?: "asc" | "desc";
}) {
  const { page, pageSize, skip, take } = parsePagination(q, 1000);
  const where: Prisma.ProductWhereInput = {
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
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    q.sort === "price" ? { priceInPaise: q.dir ?? "asc" } : q.sort === "title" ? { title: q.dir ?? "asc" } : { createdAt: "desc" };

  const key = `adm:products:${cacheKey(q)}`;
  return cached(key, ADM_TTL, async () => {
    const [rows, total] = await Promise.all([
      prisma.product.findMany({ where, skip, take, orderBy, include: productDetailInclude }),
      prisma.product.count({ where }),
    ]);
    return { items: rows.map((r) => shapeProduct(r as ProductWithRelations)), total, page, pageSize };
  });
}

export async function adminGetProduct(id: string) {
  const product = await prisma.product.findFirst({ where: { id, deletedAt: null }, include: productDetailInclude });
  if (!product) throw new NotFoundError("Product not found");
  return shapeProduct(product as ProductWithRelations);
}

async function ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
  let candidate = base;
  let n = 1;
  while (true) {
    const existing = await prisma.product.findFirst({ where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) } });
    if (!existing) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

export async function createProduct(input: AdminProductInput) {
  const existingSku = await prisma.product.findFirst({ where: { sku: input.sku } });
  if (existingSku) throw new ConflictError("SKU_TAKEN", "A product with this SKU already exists");

  const slugBase = slugify(input.slug || input.title);
  const slug = await ensureUniqueSlug(slugBase);

  const product = await prisma.product.create({
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
  await prisma.inventoryRecord.create({
    data: {
      productId: product.id,
      quantityAvailable,
      lowStockThreshold,
      statusFlag: computeStockStatus(quantityAvailable, lowStockThreshold),
    },
  });

  await invalidateProductCaches();
  return adminGetProduct(product.id);
}

export async function updateProduct(id: string, input: Partial<AdminProductInput>) {
  const existing = await prisma.product.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Product not found");

  if (input.sku && input.sku !== existing.sku) {
    const skuTaken = await prisma.product.findFirst({ where: { sku: input.sku, id: { not: id } } });
    if (skuTaken) throw new ConflictError("SKU_TAKEN", "A product with this SKU already exists");
  }

  let slug = existing.slug;
  if (input.slug || (input.title && input.title !== existing.title && !input.slug)) {
    slug = await ensureUniqueSlug(slugify(input.slug || input.title || existing.title), id);
  }

  await prisma.$transaction(async (tx) => {
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

export async function deleteProduct(id: string) {
  const existing = await prisma.product.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Product not found");
  await prisma.product.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  await invalidateProductCaches();
}

async function invalidateProductCaches() {
  void delPattern("pub:products:*");
  void delPattern("adm:products:*");
}

// ─── Admin: Categories ────────────────────────────────────────────────────────

export async function adminListCategories() {
  return prisma.productCategory.findMany({ orderBy: [{ displayOrder: "asc" }, { name: "asc" }] });
}

export async function createCategory(input: { name: string; slug?: string; displayOrder?: number; isActive?: boolean }) {
  const slug = await ensureUniqueCategorySlug(slugify(input.slug || input.name));
  const category = await prisma.productCategory.create({
    data: { name: input.name, slug, displayOrder: input.displayOrder ?? 0, isActive: input.isActive ?? true },
  });
  void delPattern("pub:product-categories:*");
  return category;
}

async function ensureUniqueCategorySlug(base: string, excludeId?: string): Promise<string> {
  let candidate = base;
  let n = 1;
  while (true) {
    const existing = await prisma.productCategory.findFirst({ where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) } });
    if (!existing) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

export async function updateCategory(id: string, input: { name?: string; slug?: string; displayOrder?: number; isActive?: boolean }) {
  const existing = await prisma.productCategory.findFirst({ where: { id } });
  if (!existing) throw new NotFoundError("Category not found");
  let slug = existing.slug;
  if (input.slug || (input.name && input.name !== existing.name && !input.slug)) {
    slug = await ensureUniqueCategorySlug(slugify(input.slug || input.name || existing.name), id);
  }
  const category = await prisma.productCategory.update({
    where: { id },
    data: { name: input.name, slug, displayOrder: input.displayOrder, isActive: input.isActive },
  });
  void delPattern("pub:product-categories:*");
  return category;
}

export async function deleteCategory(id: string) {
  const existing = await prisma.productCategory.findFirst({ where: { id } });
  if (!existing) throw new NotFoundError("Category not found");
  await prisma.productCategoryTag.deleteMany({ where: { categoryId: id } });
  await prisma.productCategory.delete({ where: { id } });
  void delPattern("pub:product-categories:*");
}

export { StockStatusFlag };
