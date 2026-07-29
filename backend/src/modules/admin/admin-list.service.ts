import { prisma } from "../../db/prisma";
import { parsePagination } from "../../lib/response";
import { loadMediaMap } from "../../lib/media-ref";
import { cached, cacheKey, delPattern } from "../../lib/redis";

const ADM_TTL = 30; // 30 seconds for admin lists

export type AdminListQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  dir?: "asc" | "desc";
  isActive?: string;
};

export function toMediaRef(
  media: { id: string; url: string; altText?: string | null } | null | undefined,
) {
  if (!media) return null;
  return { id: media.id, url: media.url, altText: media.altText ?? undefined };
}

export function listResult<T>(items: T[], total: number, page: number, pageSize: number) {
  return { items, total, page, pageSize };
}

export async function adminListThemes(q: AdminListQuery) {
  const { page, pageSize, skip, take } = parsePagination(q);
  const where = {
    deletedAt: null as null,
    ...(q.isActive !== undefined && q.isActive !== ""
      ? { isActive: q.isActive === "true" }
      : {}),
    ...(q.search
      ? {
          OR: [
            { title: { contains: q.search, mode: "insensitive" as const } },
            { slug: { contains: q.search, mode: "insensitive" as const } },
            { shortDescription: { contains: q.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const orderBy =
    q.sort === "title"
      ? { title: q.dir ?? ("asc" as const) }
      : q.sort === "updatedAt"
        ? { updatedAt: q.dir ?? ("desc" as const) }
        : { displayOrder: "asc" as const };

  const key = `adm:themes:${cacheKey(q)}`;
  return cached(key, ADM_TTL, async () => {
    const [rows, total] = await Promise.all([
      prisma.theme.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          heroImage: true,
          _count: {
            select: {
              packages: true,
              galleryImages: { where: { deletedAt: null } },
            },
          },
        },
      }),
      prisma.theme.count({ where }),
    ]);

    const ogMap = await loadMediaMap(rows.map((t) => t.ogImageId));

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

export async function adminGetTheme(id: string) {
  const t = await prisma.theme.findFirst({
    where: { id, deletedAt: null },
    include: {
      heroImage: true,
      sampleAssets: {
        where: { deletedAt: null },
        include: { media: true },
        orderBy: { displayOrder: "asc" },
      },
      packages: {
        include: { package: { select: { id: true, title: true, slug: true, priceInPaise: true } } },
      },
      _count: {
        select: {
          packages: true,
          galleryImages: { where: { deletedAt: null } },
        },
      },
    },
  });
  if (!t) return null;
  const { loadMediaById } = await import("../../lib/media-ref");
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
    sampleAssets: t.sampleAssets.map((s) => ({
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

export async function adminListPackages(q: AdminListQuery) {
  const { page, pageSize, skip, take } = parsePagination(q);
  const where = {
    deletedAt: null as null,
    ...(q.isActive !== undefined && q.isActive !== ""
      ? { isActive: q.isActive === "true" }
      : {}),
    ...(q.search
      ? {
          OR: [
            { title: { contains: q.search, mode: "insensitive" as const } },
            { slug: { contains: q.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const key = `adm:packages:${cacheKey(q)}`;
  return cached(key, ADM_TTL, async () => {
    const [rows, total] = await Promise.all([
      prisma.package.findMany({
        where,
        skip,
        take,
        orderBy: [{ tierRank: "asc" }, { displayOrder: "asc" }],
        include: {
          _count: {
            select: {
              serviceItems: true,
              themeLinks: true,
            },
          },
        },
      }),
      prisma.package.count({ where }),
    ]);

    const items = rows.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      priceInPaise: p.priceInPaise,
      tierRank: p.tierRank,
      isRecommended: p.isRecommended,
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

export async function adminListFaqs(q: AdminListQuery & { category?: string }) {
  const { page, pageSize, skip, take } = parsePagination(q);
  const where = {
    deletedAt: null as null,
    ...(q.isActive !== undefined && q.isActive !== ""
      ? { isActive: q.isActive === "true" }
      : {}),
    ...(q.category ? { category: q.category } : {}),
    ...(q.search
      ? {
          OR: [
            { question: { contains: q.search, mode: "insensitive" as const } },
            { answer: { contains: q.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const key = `adm:faqs:${cacheKey(q)}`;
  return cached(key, ADM_TTL, async () => {
    const [rows, total] = await Promise.all([
      prisma.fAQ.findMany({ where, skip, take, orderBy: { displayOrder: "asc" } }),
      prisma.fAQ.count({ where }),
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
