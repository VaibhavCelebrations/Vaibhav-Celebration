import { Prisma, SampleAssetType } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { NotFoundError } from "../../lib/errors";

const publicThemeInclude = {
  heroImage: true,
  sampleAssets: { where: { deletedAt: null }, include: { media: true }, orderBy: { displayOrder: "asc" as const } },
  packages: {
    where: { isActive: true },
    include: { package: { include: { features: { where: { deletedAt: null }, orderBy: { displayOrder: "asc" as const } } } } },
  },
  galleryImages: { where: { deletedAt: null, isActive: true }, include: { media: true }, orderBy: { displayOrder: "asc" as const } },
};

export async function listThemes(search?: string, tag?: string) {
  const term = search?.trim() || tag?.trim();
  return prisma.theme.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      ...(term ? { OR: [{ title: { contains: term, mode: "insensitive" } }, { slug: { contains: term, mode: "insensitive" } }] } : {}),
    },
    include: { heroImage: true },
    orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
  });
}

export async function getThemeBySlug(slug: string) {
  const theme = await prisma.theme.findFirst({ where: { slug, deletedAt: null, isActive: true }, include: publicThemeInclude });
  if (!theme) throw new NotFoundError("Theme not found");
  return theme;
}

export async function createTheme(data: Prisma.ThemeUncheckedCreateInput) {
  return prisma.theme.create({ data });
}

export async function updateTheme(id: string, data: Prisma.ThemeUncheckedUpdateInput) {
  const theme = await prisma.theme.updateMany({ where: { id, deletedAt: null }, data });
  if (!theme.count) throw new NotFoundError("Theme not found");
  return prisma.theme.findUniqueOrThrow({ where: { id } });
}

export async function deleteTheme(id: string) {
  const result = await prisma.theme.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: new Date(), isActive: false } });
  if (!result.count) throw new NotFoundError("Theme not found");
}

export async function addSampleAsset(themeId: string, data: { type: SampleAssetType; title: string; mediaId: string; description?: string; displayOrder?: number }) {
  const theme = await prisma.theme.findFirst({ where: { id: themeId, deletedAt: null } });
  if (!theme) throw new NotFoundError("Theme not found");
  return prisma.themeSampleAsset.create({ data: { themeId, ...data } });
}

export async function reorderThemes(items: Array<{ id: string; displayOrder: number }>) {
  await prisma.$transaction(items.map((item) => prisma.theme.updateMany({ where: { id: item.id, deletedAt: null }, data: { displayOrder: item.displayOrder } })));
}
