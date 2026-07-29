import { BlogStatus, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { NotFoundError } from "../../lib/errors";
import { attachMediaField, loadMediaById, loadMediaMap } from "../../lib/media-ref";
import { cached, delCache, delPattern } from "../../lib/redis";

async function invalidateBlogCache(slug?: string) {
  await delPattern("pub:blog:*");
  if (slug) await delCache(`pub:blog:slug:${slug}`);
}

/** Skip Redis read-through cache in development so CMS edits appear immediately. */
async function cacheable<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  if (process.env.NODE_ENV === "development") return fn();
  return cached(key, ttlSeconds, fn);
}

async function setExclusiveFeatured(postId: string) {
  await prisma.blogPost.updateMany({
    where: { deletedAt: null, id: { not: postId }, isFeatured: true },
    data: { isFeatured: false },
  });
}

const include = {
  categories: { include: { category: true } },
  tags: { include: { tag: true } },
};

type BlogRow = Prisma.BlogPostGetPayload<{ include: typeof include }>;

async function enrichPost(post: BlogRow) {
  const featuredImage = await loadMediaById(post.featuredImageId);
  return { ...post, featuredImage };
}

async function enrichPosts(posts: BlogRow[]) {
  const map = await loadMediaMap(posts.map((p) => p.featuredImageId));
  return posts.map((p) => attachMediaField(p, map, "featuredImageId", "featuredImage"));
}

export const listPublishedPosts = () =>
  cacheable("pub:blog:list", 3 * 60, async () => {
    const posts = await prisma.blogPost.findMany({
      where: { deletedAt: null, status: BlogStatus.PUBLISHED },
      include,
      orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
    });
    return enrichPosts(posts);
  });

export async function getPublishedPost(slug: string) {
  const key = `pub:blog:slug:${slug}`;
  const post = await cacheable(key, 5 * 60, () =>
    prisma.blogPost.findFirst({
      where: { slug, deletedAt: null, status: BlogStatus.PUBLISHED },
      include,
    }),
  );
  if (!post) throw new NotFoundError("Blog post not found");
  return enrichPost(post);
}

function withPublishDefaults(
  data: Prisma.BlogPostUncheckedCreateInput | Prisma.BlogPostUncheckedUpdateInput,
  existingPublishedAt?: Date | null,
) {
  if (data.status === BlogStatus.PUBLISHED && !data.publishedAt && !existingPublishedAt) {
    return { ...data, publishedAt: new Date() };
  }
  return data;
}

/** Prisma checked updates reject `featuredImageId` when nested relation writes are present. */
function buildBlogUpdateData(
  payload: Prisma.BlogPostUncheckedUpdateInput,
  categoryIds?: string[],
  tagIds?: string[],
): Prisma.BlogPostUpdateInput {
  const { featuredImageId, ...scalarFields } = payload;
  const data = { ...scalarFields } as Prisma.BlogPostUpdateInput;

  if (featuredImageId !== undefined) {
    data.featuredImage =
      featuredImageId == null
        ? { disconnect: true }
        : { connect: { id: featuredImageId } };
  }

  if (categoryIds) {
    data.categories = {
      deleteMany: {},
      create: categoryIds.map((categoryId) => ({ categoryId })),
    };
  }
  if (tagIds) {
    data.tags = {
      deleteMany: {},
      create: tagIds.map((tagId) => ({ tagId })),
    };
  }

  return data;
}

export async function createPost(
  data: Prisma.BlogPostUncheckedCreateInput,
  categoryIds: string[],
  tagIds: string[],
) {
  const payload = withPublishDefaults(data) as Prisma.BlogPostUncheckedCreateInput;
  const post = await prisma.blogPost.create({
    data: {
      ...payload,
      categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
      tags: { create: tagIds.map((tagId) => ({ tagId })) },
    },
    include,
  });
  if (post.isFeatured) await setExclusiveFeatured(post.id);
  await invalidateBlogCache(post.slug);
  return enrichPost(post);
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
  const payload = withPublishDefaults(data, existing.publishedAt) as Prisma.BlogPostUncheckedUpdateInput;
  const post = await prisma.blogPost.update({
    where: { id },
    data: buildBlogUpdateData(payload, categoryIds, tagIds),
    include,
  });
  if (post.isFeatured) await setExclusiveFeatured(post.id);
  await invalidateBlogCache(existing.slug);
  if (post.slug !== existing.slug) await invalidateBlogCache(post.slug);
  return enrichPost(post);
}

export async function deletePost(id: string) {
  const existing = await prisma.blogPost.findFirst({
    where: { id, deletedAt: null },
    select: { slug: true },
  });
  if (!existing) throw new NotFoundError("Blog post not found");
  await prisma.blogPost.update({
    where: { id },
    data: { deletedAt: new Date(), status: BlogStatus.UNPUBLISHED },
  });
  await invalidateBlogCache(existing.slug);
}

export async function getPostById(id: string) {
  const post = await prisma.blogPost.findFirst({
    where: { id, deletedAt: null },
    include,
  });
  if (!post) throw new NotFoundError("Blog post not found");
  return enrichPost(post);
}

export function listCategories() {
  return prisma.blogCategory.findMany({ orderBy: { name: "asc" } });
}

export function listTags() {
  return prisma.blogTag.findMany({ orderBy: { name: "asc" } });
}

export async function createCategory(name: string) {
  await invalidateBlogCache();
  return prisma.blogCategory.create({ data: { name } });
}

export async function createTag(name: string) {
  await invalidateBlogCache();
  return prisma.blogTag.create({ data: { name } });
}

export async function updateCategory(id: string, name: string) {
  await invalidateBlogCache();
  return prisma.blogCategory.update({ where: { id }, data: { name } });
}

export async function updateTag(id: string, name: string) {
  await invalidateBlogCache();
  return prisma.blogTag.update({ where: { id }, data: { name } });
}

export async function deleteCategory(id: string) {
  await invalidateBlogCache();
  await prisma.blogPostCategory.deleteMany({ where: { categoryId: id } });
  return prisma.blogCategory.delete({ where: { id } });
}

export async function deleteTag(id: string) {
  await invalidateBlogCache();
  await prisma.blogPostTag.deleteMany({ where: { tagId: id } });
  return prisma.blogTag.delete({ where: { id } });
}
