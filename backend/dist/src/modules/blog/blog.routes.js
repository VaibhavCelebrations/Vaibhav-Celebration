"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminBlogRouter = exports.blogRouter = void 0;
const params_1 = require("../../lib/params");
const client_1 = require("@prisma/client");
const express_1 = require("express");
const zod_1 = require("zod");
const response_1 = require("../../lib/response");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const client_2 = require("../../integrations/revalidate/client");
const blog_service_1 = require("./blog.service");
const roles = [
    auth_1.requireAdmin,
    (0, auth_1.requireRoles)(client_1.AdminRole.CONTENT_EDITOR, client_1.AdminRole.OPERATIONS, client_1.AdminRole.SUPER_ADMIN),
];
const schema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    slug: zod_1.z.string().min(1),
    featuredImageId: zod_1.z.string().optional().nullable(),
    contentHtml: zod_1.z.string().min(1),
    excerpt: zod_1.z.string().optional().nullable(),
    authorName: zod_1.z.string().optional().nullable(),
    status: zod_1.z.nativeEnum(client_1.BlogStatus).optional(),
    publishedAt: zod_1.z.coerce.date().optional().nullable(),
    isFeatured: zod_1.z.boolean().optional(),
    seoTitle: zod_1.z.string().optional().nullable(),
    seoDescription: zod_1.z.string().optional().nullable(),
    categoryIds: zod_1.z.array(zod_1.z.string()).default([]),
    tagIds: zod_1.z.array(zod_1.z.string()).default([]),
});
function blogRevalidateTargets(slug, previousSlug) {
    const paths = ["/blog", `/blog/${slug}`];
    const tags = ["cms:blog", `cms:blog:${slug}`];
    if (previousSlug && previousSlug !== slug) {
        paths.push(`/blog/${previousSlug}`);
        tags.push(`cms:blog:${previousSlug}`);
    }
    return { paths, tags };
}
exports.blogRouter = (0, express_1.Router)();
exports.blogRouter.get("/", async (_req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, blog_service_1.listPublishedPosts)());
    }
    catch (e) {
        return next(e);
    }
});
exports.blogRouter.get("/:slug", async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, blog_service_1.getPublishedPost)((0, params_1.param)(req, "slug")));
    }
    catch (e) {
        return next(e);
    }
});
exports.adminBlogRouter = (0, express_1.Router)();
exports.adminBlogRouter.use(...roles);
exports.adminBlogRouter.get("/", async (req, res, next) => {
    try {
        const { prisma } = await Promise.resolve().then(() => __importStar(require("../../db/prisma")));
        const { parsePagination, paginationMeta } = await Promise.resolve().then(() => __importStar(require("../../lib/response")));
        const q = req.query;
        const { page, pageSize, skip, take } = parsePagination({
            page: q.page ? Number(q.page) : undefined,
            pageSize: q.pageSize ? Number(q.pageSize) : undefined,
        });
        const where = {
            deletedAt: null,
            ...(q.status ? { status: q.status } : {}),
            ...(q.search
                ? {
                    OR: [
                        { title: { contains: q.search, mode: "insensitive" } },
                        { slug: { contains: q.search, mode: "insensitive" } },
                    ],
                }
                : {}),
        };
        const [rows, total] = await Promise.all([
            prisma.blogPost.findMany({
                where,
                skip,
                take,
                orderBy: { updatedAt: "desc" },
                include: {
                    categories: { include: { category: true } },
                    tags: { include: { tag: true } },
                },
            }),
            prisma.blogPost.count({ where }),
        ]);
        const { loadMediaMap, attachMediaField } = await Promise.resolve().then(() => __importStar(require("../../lib/media-ref")));
        const imageMap = await loadMediaMap(rows.map((r) => r.featuredImageId));
        const items = rows.map((r) => attachMediaField(r, imageMap, "featuredImageId", "featuredImage"));
        return (0, response_1.ok)(res, { items, total, page, pageSize }, { pagination: paginationMeta(page, pageSize, total) });
    }
    catch (e) {
        return next(e);
    }
});
exports.adminBlogRouter.get("/categories", async (_req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, blog_service_1.listCategories)());
    }
    catch (e) {
        return next(e);
    }
});
exports.adminBlogRouter.post("/categories", (0, validate_1.validate)(zod_1.z.object({ name: zod_1.z.string().min(1) })), async (req, res, next) => {
    try {
        return (0, response_1.created)(res, await (0, blog_service_1.createCategory)(req.body.name));
    }
    catch (e) {
        return next(e);
    }
});
exports.adminBlogRouter.put("/categories/:id", (0, validate_1.validate)(zod_1.z.object({ id: zod_1.z.string().min(1) }), "params"), (0, validate_1.validate)(zod_1.z.object({ name: zod_1.z.string().min(1) })), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, blog_service_1.updateCategory)((0, params_1.param)(req, "id"), req.body.name));
    }
    catch (e) {
        return next(e);
    }
});
exports.adminBlogRouter.delete("/categories/:id", (0, validate_1.validate)(zod_1.z.object({ id: zod_1.z.string().min(1) }), "params"), async (req, res, next) => {
    try {
        await (0, blog_service_1.deleteCategory)((0, params_1.param)(req, "id"));
        return (0, response_1.ok)(res, { deleted: true });
    }
    catch (e) {
        return next(e);
    }
});
exports.adminBlogRouter.get("/tags", async (_req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, blog_service_1.listTags)());
    }
    catch (e) {
        return next(e);
    }
});
exports.adminBlogRouter.post("/tags", (0, validate_1.validate)(zod_1.z.object({ name: zod_1.z.string().min(1) })), async (req, res, next) => {
    try {
        return (0, response_1.created)(res, await (0, blog_service_1.createTag)(req.body.name));
    }
    catch (e) {
        return next(e);
    }
});
exports.adminBlogRouter.put("/tags/:id", (0, validate_1.validate)(zod_1.z.object({ id: zod_1.z.string().min(1) }), "params"), (0, validate_1.validate)(zod_1.z.object({ name: zod_1.z.string().min(1) })), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, blog_service_1.updateTag)((0, params_1.param)(req, "id"), req.body.name));
    }
    catch (e) {
        return next(e);
    }
});
exports.adminBlogRouter.delete("/tags/:id", (0, validate_1.validate)(zod_1.z.object({ id: zod_1.z.string().min(1) }), "params"), async (req, res, next) => {
    try {
        await (0, blog_service_1.deleteTag)((0, params_1.param)(req, "id"));
        return (0, response_1.ok)(res, { deleted: true });
    }
    catch (e) {
        return next(e);
    }
});
exports.adminBlogRouter.get("/:id", async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, blog_service_1.getPostById)((0, params_1.param)(req, "id")));
    }
    catch (e) {
        return next(e);
    }
});
exports.adminBlogRouter.post("/", (0, validate_1.validate)(schema), async (req, res, next) => {
    try {
        const { categoryIds, tagIds, ...data } = req.body;
        const item = await (0, blog_service_1.createPost)(data, categoryIds, tagIds);
        const { paths, tags } = blogRevalidateTargets(item.slug);
        void (0, client_2.triggerRevalidate)(paths, tags);
        return (0, response_1.created)(res, item);
    }
    catch (e) {
        return next(e);
    }
});
exports.adminBlogRouter.put("/:id", (0, validate_1.validate)(zod_1.z.object({ id: zod_1.z.string().min(1) }), "params"), (0, validate_1.validate)(schema.partial()), async (req, res, next) => {
    try {
        const id = (0, params_1.param)(req, "id");
        const { prisma } = await Promise.resolve().then(() => __importStar(require("../../db/prisma")));
        const before = await prisma.blogPost.findFirst({
            where: { id, deletedAt: null },
            select: { slug: true },
        });
        const { categoryIds, tagIds, ...data } = req.body;
        const item = await (0, blog_service_1.updatePost)(id, data, categoryIds, tagIds);
        const { paths, tags } = blogRevalidateTargets(item.slug, before?.slug);
        void (0, client_2.triggerRevalidate)(paths, tags);
        return (0, response_1.ok)(res, item);
    }
    catch (e) {
        return next(e);
    }
});
exports.adminBlogRouter.delete("/:id", (0, validate_1.validate)(zod_1.z.object({ id: zod_1.z.string().min(1) }), "params"), async (req, res, next) => {
    try {
        const post = await (0, blog_service_1.getPostById)((0, params_1.param)(req, "id"));
        await (0, blog_service_1.deletePost)(post.id);
        const { paths, tags } = blogRevalidateTargets(post.slug);
        void (0, client_2.triggerRevalidate)(paths, tags);
        return (0, response_1.ok)(res, { deleted: true });
    }
    catch (e) {
        return next(e);
    }
});
//# sourceMappingURL=blog.routes.js.map