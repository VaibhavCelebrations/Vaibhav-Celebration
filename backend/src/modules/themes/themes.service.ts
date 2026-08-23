import { Prisma, SampleAssetType } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { NotFoundError } from "../../lib/errors";
import { cached, cacheKey, delPattern } from "../../lib/redis";
import {
  removeThemeGalleryTag,
  syncThemeGalleryTag,
} from "../gallery/gallery.service";

const publicThemeInclude = {
  heroImage: true,
  sampleAssets: { where: { deletedAt: null }, include: { media: true }, orderBy: { displayOrder: "asc" as const } },
  packages: {
    where: { isActive: true },
    include: {
      package: {
        include: {
          serviceItems: {
            where: { extraService: { deletedAt: null } },
            orderBy: { displayOrder: "asc" as const },
            include: { extraService: true },
          },
        },
      },
    },
  },
  galleryImages: { where: { deletedAt: null, isActive: true }, include: { media: true }, orderBy: { displayOrder: "asc" as const } },
} as const;

const PUB_TTL = 5 * 60; // 5 minutes

export async function listThemes(search?: string, tag?: string) {
  const term = search?.trim() || tag?.trim();
  const key = `pub:themes:list:${cacheKey({ term })}`;
  return cached(key, PUB_TTL, () =>
    prisma.theme.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        ...(term ? { OR: [{ title: { contains: term, mode: "insensitive" } }, { slug: { contains: term, mode: "insensitive" } }] } : {}),
      },
      include: { heroImage: true },
      orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
    }),
  );
}

export async function getThemeBySlug(slug: string) {
  const key = `pub:themes:slug:${slug}`;
  const theme = await cached(key, PUB_TTL, () =>
    prisma.theme.findFirst({ where: { slug, deletedAt: null, isActive: true }, include: publicThemeInclude }),
  );
  if (!theme) throw new NotFoundError("Theme not found");
  return theme;
}

export async function createTheme(data: Prisma.ThemeUncheckedCreateInput) {
  const theme = await prisma.theme.create({ data });
  if (typeof data.title === "string") {
    await syncThemeGalleryTag(data.title);
  }
  void delPattern("pub:themes:*");
  void delPattern("adm:themes:*");
  return theme;
}

export async function updateTheme(id: string, data: Prisma.ThemeUncheckedUpdateInput) {
  const existing = await prisma.theme.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Theme not found");
  await prisma.theme.updateMany({ where: { id, deletedAt: null }, data });
  const theme = await prisma.theme.findUniqueOrThrow({ where: { id } });
  if (typeof data.title === "string" && data.title !== existing.title) {
    await syncThemeGalleryTag(theme.title, existing.title);
  } else if (theme.isActive) {
    await syncThemeGalleryTag(theme.title);
  }
  void delPattern("pub:themes:*");
  void delPattern("adm:themes:*");
  return theme;
}

export async function deleteTheme(id: string) {
  const existing = await prisma.theme.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Theme not found");
  await prisma.theme.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date(), isActive: false },
  });
  await removeThemeGalleryTag(id, existing.title);
  void delPattern("pub:themes:*");
  void delPattern("adm:themes:*");
}

export async function addSampleAsset(themeId: string, data: { type: SampleAssetType; title: string; mediaId: string; description?: string; displayOrder?: number }) {
  const theme = await prisma.theme.findFirst({ where: { id: themeId, deletedAt: null } });
  if (!theme) throw new NotFoundError("Theme not found");
  const asset = await prisma.themeSampleAsset.create({ data: { themeId, ...data } });
  void delPattern("pub:themes:*");
  void delPattern("adm:themes:*");
  return asset;
}

export async function reorderThemes(items: Array<{ id: string; displayOrder: number }>) {
  await prisma.$transaction(items.map((item) => prisma.theme.updateMany({ where: { id: item.id, deletedAt: null }, data: { displayOrder: item.displayOrder } })));
  void delPattern("pub:themes:*");
  void delPattern("adm:themes:*");
}

export async function setThemePackages(
  themeId: string,
  links: Array<{ packageId: string; priceOverrideInPaise?: number | null; isActive?: boolean }>,
) {
  const theme = await prisma.theme.findFirst({ where: { id: themeId, deletedAt: null } });
  if (!theme) throw new NotFoundError("Theme not found");
  await prisma.themePackage.deleteMany({ where: { themeId } });
  if (links.length) {
    await prisma.themePackage.createMany({
      data: links.map((link) => ({
        themeId,
        packageId: link.packageId,
        priceOverrideInPaise: link.priceOverrideInPaise ?? null,
        isActive: link.isActive ?? true,
      })),
    });
  }
  void delPattern("pub:themes:*");
  void delPattern("adm:themes:*");
}

export async function deleteSampleAsset(themeId: string, assetId: string) {
  const result = await prisma.themeSampleAsset.updateMany({
    where: { id: assetId, themeId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (!result.count) throw new NotFoundError("Sample asset not found");
  void delPattern("pub:themes:*");
  void delPattern("adm:themes:*");
}

/**
 * Sync the 'gallery' display images for a theme (Option C).
 * The heroImage counts as image #1; this manages up to 4 additional gallery images
 * stored as ThemeSampleAsset rows with type=OTHER and title='gallery-image'.
 * Maximum 4 extra images (so total with hero ≤ 5).
 */
export async function syncThemeGalleryImages(
  themeId: string,
  mediaIds: string[],
) {
  if (mediaIds.length > 4) {
    throw Object.assign(new Error("Maximum 4 additional gallery images allowed (5 total including hero)"), {
      status: 400,
      code: "VALIDATION_ERROR",
    });
  }
  const theme = await prisma.theme.findFirst({ where: { id: themeId, deletedAt: null } });
  if (!theme) throw new NotFoundError("Theme not found");

  // Soft-delete all existing gallery-image sample assets
  await prisma.themeSampleAsset.updateMany({
    where: { themeId, title: "gallery-image", deletedAt: null },
    data: { deletedAt: new Date() },
  });

  // Create new ones in order
  if (mediaIds.length > 0) {
    await prisma.themeSampleAsset.createMany({
      data: mediaIds.map((mediaId, idx) => ({
        themeId,
        type: "OTHER" as const,
        title: "gallery-image",
        mediaId,
        displayOrder: idx,
      })),
    });
  }

  void delPattern("pub:themes:*");
  void delPattern("adm:themes:*");
}
