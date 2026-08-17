import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ConflictError, NotFoundError } from "../../lib/errors";
import { toMediaRef } from "../../lib/media-ref";
import { cached, cacheKey, delPattern } from "../../lib/redis";
import { parsePagination } from "../../lib/response";
import { slugify } from "../../lib/validators";

const PUB_TTL = 60;
const ADM_TTL = 15;

const collectionInclude = {
  heroImage: true,
  items: {
    orderBy: { displayOrder: "asc" as const },
    include: {
      product: {
        include: {
          images: { include: { media: true }, orderBy: { displayOrder: "asc" as const } },
          categoryTags: { include: { category: true } },
          themeTags: { include: { theme: { select: { id: true, title: true, slug: true } } } },
          personalizationFields: true,
          inventory: true,
        },
      },
    },
  },
} satisfies Prisma.ProductCollectionInclude;

type CollectionWithRelations = Prisma.ProductCollectionGetPayload<{ include: typeof collectionInclude }>;

function activeWindow(now = new Date()): Prisma.ProductCollectionWhereInput {
  return {
    deletedAt: null,
    isActive: true,
    OR: [{ startsAt: null }, { startsAt: { lte: now } }],
    AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
  };
}

function shapeProduct(p: CollectionWithRelations["items"][number]["product"]) {
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

function shapeCollection(c: CollectionWithRelations, includeInactiveProducts = false) {
  const items = c.items
    .filter((item) => includeInactiveProducts || (item.product.isActive && !item.product.deletedAt))
    .map((item) => ({ displayOrder: item.displayOrder, product: shapeProduct(item.product) }));

  return {
    id: c.id,
    title: c.title,
    slug: c.slug,
    description: c.description,
    heroImage: toMediaRef(c.heroImage),
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

export async function listCollections(q: { featured?: boolean }) {
  const key = `pub:collections:${cacheKey(q)}`;
  return cached(key, PUB_TTL, async () => {
    const rows = await prisma.productCollection.findMany({
      where: { ...activeWindow(), ...(q.featured ? { showOnHomepage: true } : {}) },
      include: collectionInclude,
      orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
    });
    return rows.map((row) => shapeCollection(row)).filter((row) => row.productCount > 0);
  });
}

export async function getCollectionBySlug(slug: string) {
  const item = await cached(`pub:collections:slug:${slug}`, PUB_TTL, () =>
    prisma.productCollection.findFirst({ where: { slug, ...activeWindow() }, include: collectionInclude }),
  );
  if (!item) throw new NotFoundError("Collection not found");
  const shaped = shapeCollection(item);
  if (shaped.productCount === 0) throw new NotFoundError("Collection not found");
  return shaped;
}

export type CollectionInput = {
  title: string;
  slug?: string;
  description?: string | null;
  heroImageId?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  showOnHomepage?: boolean;
  isActive?: boolean;
  displayOrder?: number;
  productIds?: string[];
};

async function ensureUniqueSlug(base: string, excludeId?: string) {
  let candidate = base;
  let n = 1;
  while (true) {
    const existing = await prisma.productCollection.findFirst({
      where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    if (!existing) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

const collectionListInclude = {
  heroImage: true,
  items: {
    orderBy: { displayOrder: "asc" as const },
    include: {
      product: { select: { id: true, title: true, isActive: true, deletedAt: true } },
    },
  },
} satisfies Prisma.ProductCollectionInclude;

export async function adminListCollections(q: { page?: number; pageSize?: number; search?: string; isActive?: string }) {
  const { page, pageSize, skip, take } = parsePagination(q);
  const where: Prisma.ProductCollectionWhereInput = {
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
  const key = `adm:collections:${cacheKey(q)}`;
  return cached(key, ADM_TTL, async () => {
    const [rows, total] = await Promise.all([
      prisma.productCollection.findMany({
        where,
        skip,
        take,
        include: collectionListInclude,
        orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
      }),
      prisma.productCollection.count({ where }),
    ]);
    return {
      items: rows.map((c) => {
        const products = c.items
          .filter((item) => item.product && !item.product.deletedAt)
          .map((item) => ({ id: item.product.id, title: item.product.title, isActive: item.product.isActive }));
        return {
          id: c.id,
          title: c.title,
          slug: c.slug,
          description: c.description,
          heroImage: toMediaRef(c.heroImage),
          startsAt: c.startsAt?.toISOString() ?? null,
          endsAt: c.endsAt?.toISOString() ?? null,
          showOnHomepage: c.showOnHomepage,
          isActive: c.isActive,
          displayOrder: c.displayOrder,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
          deletedAt: c.deletedAt?.toISOString() ?? null,
          products,
          productCount: products.length,
        };
      }),
      total,
      page,
      pageSize,
    };
  });
}

export async function adminGetCollection(id: string) {
  const item = await prisma.productCollection.findFirst({ where: { id, deletedAt: null }, include: collectionInclude });
  if (!item) throw new NotFoundError("Collection not found");
  return shapeCollection(item, true);
}

async function syncProducts(tx: Prisma.TransactionClient, collectionId: string, productIds: string[] | undefined) {
  if (!productIds) return;
  await tx.productCollectionItem.deleteMany({ where: { collectionId } });
  if (productIds.length) {
    await tx.productCollectionItem.createMany({
      data: productIds.map((productId, index) => ({ collectionId, productId, displayOrder: index })),
    });
  }
}

export async function createCollection(input: CollectionInput) {
  const slug = await ensureUniqueSlug(slugify(input.slug || input.title));
  const existing = await prisma.productCollection.findFirst({ where: { slug } });
  if (existing) throw new ConflictError("SLUG_TAKEN", "A collection with this slug already exists");
  const created = await prisma.$transaction(async (tx) => {
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

export async function updateCollection(id: string, input: Partial<CollectionInput>) {
  const existing = await prisma.productCollection.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Collection not found");
  let slug = existing.slug;
  if (input.slug || (input.title && input.title !== existing.title && !input.slug)) {
    slug = await ensureUniqueSlug(slugify(input.slug || input.title || existing.title), id);
  }
  await prisma.$transaction(async (tx) => {
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

export async function deleteCollection(id: string) {
  const updated = await prisma.productCollection.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date(), isActive: false },
  });
  if (!updated.count) throw new NotFoundError("Collection not found");
  await invalidateCollectionCaches();
}

async function invalidateCollectionCaches() {
  void delPattern("pub:collections:*");
  void delPattern("adm:collections:*");
}
