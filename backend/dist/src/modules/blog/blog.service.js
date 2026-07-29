"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPublishedPosts = void 0;
exports.getPublishedPost = getPublishedPost;
exports.createPost = createPost;
exports.updatePost = updatePost;
exports.deletePost = deletePost;
exports.getPostById = getPostById;
exports.listCategories = listCategories;
exports.listTags = listTags;
exports.createCategory = createCategory;
exports.createTag = createTag;
exports.updateCategory = updateCategory;
exports.updateTag = updateTag;
exports.deleteCategory = deleteCategory;
exports.deleteTag = deleteTag;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
const errors_1 = require("../../lib/errors");
const media_ref_1 = require("../../lib/media-ref");
const redis_1 = require("../../lib/redis");
async function invalidateBlogCache(slug) {
    await (0, redis_1.delPattern)("pub:blog:*");
    if (slug)
        await (0, redis_1.delCache)(`pub:blog:slug:${slug}`);
}
/** Skip Redis read-through cache in development so CMS edits appear immediately. */
async function cacheable(key, ttlSeconds, fn) {
    if (process.env.NODE_ENV === "development")
        return fn();
    return (0, redis_1.cached)(key, ttlSeconds, fn);
}
async function setExclusiveFeatured(postId) {
    await prisma_1.prisma.blogPost.updateMany({
        where: { deletedAt: null, id: { not: postId }, isFeatured: true },
        data: { isFeatured: false },
    });
}
const include = {
    categories: { include: { category: true } },
    tags: { include: { tag: true } },
};
async function enrichPost(post) {
    const featuredImage = await (0, media_ref_1.loadMediaById)(post.featuredImageId);
    return { ...post, featuredImage };
}
async function enrichPosts(posts) {
    const map = await (0, media_ref_1.loadMediaMap)(posts.map((p) => p.featuredImageId));
    return posts.map((p) => (0, media_ref_1.attachMediaField)(p, map, "featuredImageId", "featuredImage"));
}
const listPublishedPosts = () => cacheable("pub:blog:list", 3 * 60, async () => {
    const posts = await prisma_1.prisma.blogPost.findMany({
        where: { deletedAt: null, status: client_1.BlogStatus.PUBLISHED },
        include,
        orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
    });
    return enrichPosts(posts);
});
exports.listPublishedPosts = listPublishedPosts;
async function getPublishedPost(slug) {
    const key = `pub:blog:slug:${slug}`;
    const post = await cacheable(key, 5 * 60, () => prisma_1.prisma.blogPost.findFirst({
        where: { slug, deletedAt: null, status: client_1.BlogStatus.PUBLISHED },
        include,
    }));
    if (!post)
        throw new errors_1.NotFoundError("Blog post not found");
    return enrichPost(post);
}
function withPublishDefaults(data, existingPublishedAt) {
    if (data.status === client_1.BlogStatus.PUBLISHED && !data.publishedAt && !existingPublishedAt) {
        return { ...data, publishedAt: new Date() };
    }
    return data;
}
/** Prisma checked updates reject `featuredImageId` when nested relation writes are present. */
function buildBlogUpdateData(payload, categoryIds, tagIds) {
    const { featuredImageId, ...scalarFields } = payload;
    const data = { ...scalarFields };
    if (featuredImageId !== undefined) {
        if (featuredImageId === null) {
            data.featuredImage = { disconnect: true };
        }
        else if (typeof featuredImageId === "string") {
            data.featuredImage = { connect: { id: featuredImageId } };
        }
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
async function createPost(data, categoryIds, tagIds) {
    const payload = withPublishDefaults(data);
    const post = await prisma_1.prisma.blogPost.create({
        data: {
            ...payload,
            categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
            tags: { create: tagIds.map((tagId) => ({ tagId })) },
        },
        include,
    });
    if (post.isFeatured)
        await setExclusiveFeatured(post.id);
    await invalidateBlogCache(post.slug);
    return enrichPost(post);
}
async function updatePost(id, data, categoryIds, tagIds) {
    const existing = await prisma_1.prisma.blogPost.findFirst({
        where: { id, deletedAt: null },
    });
    if (!existing)
        throw new errors_1.NotFoundError("Blog post not found");
    const payload = withPublishDefaults(data, existing.publishedAt);
    const post = await prisma_1.prisma.blogPost.update({
        where: { id },
        data: buildBlogUpdateData(payload, categoryIds, tagIds),
        include,
    });
    if (post.isFeatured)
        await setExclusiveFeatured(post.id);
    await invalidateBlogCache(existing.slug);
    if (post.slug !== existing.slug)
        await invalidateBlogCache(post.slug);
    return enrichPost(post);
}
async function deletePost(id) {
    const existing = await prisma_1.prisma.blogPost.findFirst({
        where: { id, deletedAt: null },
        select: { slug: true },
    });
    if (!existing)
        throw new errors_1.NotFoundError("Blog post not found");
    await prisma_1.prisma.blogPost.update({
        where: { id },
        data: { deletedAt: new Date(), status: client_1.BlogStatus.UNPUBLISHED },
    });
    await invalidateBlogCache(existing.slug);
}
async function getPostById(id) {
    const post = await prisma_1.prisma.blogPost.findFirst({
        where: { id, deletedAt: null },
        include,
    });
    if (!post)
        throw new errors_1.NotFoundError("Blog post not found");
    return enrichPost(post);
}
function listCategories() {
    return prisma_1.prisma.blogCategory.findMany({ orderBy: { name: "asc" } });
}
function listTags() {
    return prisma_1.prisma.blogTag.findMany({ orderBy: { name: "asc" } });
}
async function createCategory(name) {
    await invalidateBlogCache();
    return prisma_1.prisma.blogCategory.create({ data: { name } });
}
async function createTag(name) {
    await invalidateBlogCache();
    return prisma_1.prisma.blogTag.create({ data: { name } });
}
async function updateCategory(id, name) {
    await invalidateBlogCache();
    return prisma_1.prisma.blogCategory.update({ where: { id }, data: { name } });
}
async function updateTag(id, name) {
    await invalidateBlogCache();
    return prisma_1.prisma.blogTag.update({ where: { id }, data: { name } });
}
async function deleteCategory(id) {
    await invalidateBlogCache();
    await prisma_1.prisma.blogPostCategory.deleteMany({ where: { categoryId: id } });
    return prisma_1.prisma.blogCategory.delete({ where: { id } });
}
async function deleteTag(id) {
    await invalidateBlogCache();
    await prisma_1.prisma.blogPostTag.deleteMany({ where: { tagId: id } });
    return prisma_1.prisma.blogTag.delete({ where: { id } });
}
//# sourceMappingURL=blog.service.js.map