import { BlogStatus, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { NotFoundError } from "../../lib/errors";
const include = {
  categories: { include: { category: true } },
  tags: { include: { tag: true } },
};
export const listPublishedPosts = () =>
  prisma.blogPost.findMany({
    where: { deletedAt: null, status: BlogStatus.PUBLISHED },
    include,
    orderBy: { publishedAt: "desc" },
  });
export async function getPublishedPost(slug: string) {
  const post = await prisma.blogPost.findFirst({
    where: { slug, deletedAt: null, status: BlogStatus.PUBLISHED },
    include,
  });
  if (!post) throw new NotFoundError("Blog post not found");
  return post;
}
export function createPost(
  data: Prisma.BlogPostUncheckedCreateInput,
  categoryIds: string[],
  tagIds: string[],
) {
  return prisma.blogPost.create({
    data: {
      ...data,
      categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
      tags: { create: tagIds.map((tagId) => ({ tagId })) },
    },
    include,
  });
}
export async function updatePost(
  id: string,
  data: Prisma.BlogPostUncheckedUpdateInput,
  categoryIds?: string[],
  tagIds?: string[],
) {
  const existing = await prisma.blogPost.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw new NotFoundError("Blog post not found");
  return prisma.blogPost.update({
    where: { id },
    data: {
      ...data,
      ...(categoryIds
        ? {
            categories: {
              deleteMany: {},
              create: categoryIds.map((categoryId) => ({ categoryId })),
            },
          }
        : {}),
      ...(tagIds
        ? {
            tags: {
              deleteMany: {},
              create: tagIds.map((tagId) => ({ tagId })),
            },
          }
        : {}),
    },
    include,
  });
}
export async function deletePost(id: string) {
  const result = await prisma.blogPost.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date(), status: BlogStatus.UNPUBLISHED },
  });
  if (!result.count) throw new NotFoundError("Blog post not found");
}
