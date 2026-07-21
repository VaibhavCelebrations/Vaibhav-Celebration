import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { NotFoundError } from "../../lib/errors";

const include = {
  media: true,
  theme: { select: { id: true, title: true, slug: true } },
  tags: { include: { tag: true } },
} as const;

function slugifyTag(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export async function ensureGalleryTag(name: string) {
  const normalized = slugifyTag(name);
  if (!normalized) throw new NotFoundError("Tag name is required");
  return prisma.galleryTag.upsert({
    where: { name: normalized },
    create: { name: normalized },
    update: {},
  });
}

export async function listGalleryTags() {
  return prisma.galleryTag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { images: true } } },
  });
}

async function resolveTagIds(input: {
  tagIds?: string[];
  tagNames?: string[];
  themeId?: string | null;
}) {
  const ids = new Set<string>(input.tagIds ?? []);
  for (const name of input.tagNames ?? []) {
    const tag = await ensureGalleryTag(name);
    ids.add(tag.id);
  }
  if (input.themeId) {
    const theme = await prisma.theme.findFirst({
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

export function listGallery(tag?: string, themeId?: string) {
  return prisma.galleryImage.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      ...(themeId ? { themeId } : {}),
      ...(tag ? { tags: { some: { tag: { name: tag } } } } : {}),
    },
    include,
    orderBy: { displayOrder: "asc" },
  });
}

export async function createGalleryImage(
  data: Prisma.GalleryImageUncheckedCreateInput,
  tagIds?: string[],
  tagNames?: string[],
) {
  const resolvedTagIds = await resolveTagIds({
    tagIds,
    tagNames,
    themeId: data.themeId as string | null | undefined,
  });
  return prisma.galleryImage.create({
    data: {
      ...data,
      tags: resolvedTagIds.length
        ? { create: resolvedTagIds.map((tagId) => ({ tagId })) }
        : undefined,
    },
    include,
  });
}

export async function updateGalleryImage(
  id: string,
  data: Prisma.GalleryImageUncheckedUpdateInput,
  tagIds?: string[],
  tagNames?: string[],
) {
  const existing = await prisma.galleryImage.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw new NotFoundError("Gallery image not found");

  const themeId =
    data.themeId === undefined
      ? existing.themeId
      : (data.themeId as string | null);

  const shouldReplaceTags = tagIds !== undefined || tagNames !== undefined;
  const resolvedTagIds = shouldReplaceTags
    ? await resolveTagIds({ tagIds: tagIds ?? [], tagNames: tagNames ?? [], themeId })
    : themeId && themeId !== existing.themeId
      ? await resolveTagIds({
          tagIds: (
            await prisma.galleryImageTag.findMany({
              where: { galleryImageId: id },
              select: { tagId: true },
            })
          ).map((row) => row.tagId),
          themeId,
        })
      : null;

  await prisma.$transaction(async (tx) => {
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

  return prisma.galleryImage.findUniqueOrThrow({ where: { id }, include });
}

export async function deleteGalleryImage(id: string) {
  const result = await prisma.galleryImage.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date(), isActive: false },
  });
  if (!result.count) throw new NotFoundError("Gallery image not found");
}

/** Ensures a GalleryTag exists for a theme title (used on theme create/update). */
export async function syncThemeGalleryTag(themeTitle: string, previousTitle?: string | null) {
  const tag = await ensureGalleryTag(themeTitle);
  if (previousTitle && previousTitle !== themeTitle) {
    const old = await prisma.galleryTag.findUnique({ where: { name: slugifyTag(previousTitle) } });
    if (old && old.id !== tag.id) {
      const joins = await prisma.galleryImageTag.findMany({ where: { tagId: old.id } });
      if (joins.length) {
        await prisma.galleryImageTag.createMany({
          data: joins.map((j) => ({ galleryImageId: j.galleryImageId, tagId: tag.id })),
          skipDuplicates: true,
        });
      }
      await prisma.galleryImageTag.deleteMany({ where: { tagId: old.id } });
      await prisma.galleryTag.delete({ where: { id: old.id } });
    }
  }
  return tag;
}

/** Removes theme-linked gallery tag and clears themeId on images when a theme is archived. */
export async function removeThemeGalleryTag(themeId: string, themeTitle: string) {
  await prisma.galleryImage.updateMany({
    where: { themeId, deletedAt: null },
    data: { themeId: null },
  });
  const tag = await prisma.galleryTag.findUnique({ where: { name: slugifyTag(themeTitle) } });
  if (!tag) return;
  await prisma.galleryImageTag.deleteMany({ where: { tagId: tag.id } });
  await prisma.galleryTag.delete({ where: { id: tag.id } });
}
