import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { NotFoundError } from "../../lib/errors";

const include = { media: true, theme: true, tags: { include: { tag: true } } };
export function listGallery(tag?: string, themeId?: string) {
  return prisma.galleryImage.findMany({ where: { deletedAt: null, isActive: true, ...(themeId ? { themeId } : {}), ...(tag ? { tags: { some: { tag: { name: tag } } } } : {}) }, include, orderBy: { displayOrder: "asc" } });
}
export const createGalleryImage = (data: Prisma.GalleryImageUncheckedCreateInput) => prisma.galleryImage.create({ data, include });
export async function updateGalleryImage(id: string, data: Prisma.GalleryImageUncheckedUpdateInput) {
  const result = await prisma.galleryImage.updateMany({ where: { id, deletedAt: null }, data });
  if (!result.count) throw new NotFoundError("Gallery image not found");
  return prisma.galleryImage.findUniqueOrThrow({ where: { id }, include });
}
export async function deleteGalleryImage(id: string) {
  const result = await prisma.galleryImage.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: new Date(), isActive: false } });
  if (!result.count) throw new NotFoundError("Gallery image not found");
}
