import { param } from "../../lib/params";
import { AdminRole, BlogStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { created, ok } from "../../lib/response";
import { requireAdmin, requireRoles } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { triggerRevalidate } from "../../integrations/revalidate/client";
import {
  createPost,
  deletePost,
  getPostById,
  getPublishedPost,
  listPublishedPosts,
  updatePost,
  listCategories,
  listTags,
  createCategory,
  createTag,
  updateCategory,
  updateTag,
  deleteCategory,
  deleteTag,
} from "./blog.service";
const roles = [
  requireAdmin,
  requireRoles(
    AdminRole.CONTENT_EDITOR,
    AdminRole.OPERATIONS,
    AdminRole.SUPER_ADMIN,
  ),
];
const schema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  featuredImageId: z.string().optional().nullable(),
  contentHtml: z.string().min(1),
  excerpt: z.string().optional().nullable(),
  authorName: z.string().optional().nullable(),
  status: z.nativeEnum(BlogStatus).optional(),
  publishedAt: z.coerce.date().optional().nullable(),
  isFeatured: z.boolean().optional(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  categoryIds: z.array(z.string()).default([]),
  tagIds: z.array(z.string()).default([]),
});

function blogRevalidateTargets(slug: string, previousSlug?: string) {
  const paths = ["/blog", `/blog/${slug}`];
  const tags = ["cms:blog", `cms:blog:${slug}`];
  if (previousSlug && previousSlug !== slug) {
    paths.push(`/blog/${previousSlug}`);
    tags.push(`cms:blog:${previousSlug}`);
  }
  return { paths, tags };
}

export const blogRouter = Router();
blogRouter.get("/", async (_req, res, next) => {
  try {
    return ok(res, await listPublishedPosts());
  } catch (e) {
    return next(e);
  }
});
blogRouter.get("/:slug", async (req, res, next) => {
  try {
    return ok(res, await getPublishedPost(param(req, "slug")));
  } catch (e) {
    return next(e);
  }
});
export const adminBlogRouter = Router();
adminBlogRouter.use(...roles);
adminBlogRouter.get("/", async (req, res, next) => {
  try {
    const { prisma } = await import("../../db/prisma");
    const { parsePagination, paginationMeta } = await import("../../lib/response");
    const q = req.query as { page?: string; pageSize?: string; search?: string; status?: string };
    const { page, pageSize, skip, take } = parsePagination({
      page: q.page ? Number(q.page) : undefined,
      pageSize: q.pageSize ? Number(q.pageSize) : undefined,
    });
    const where = {
      deletedAt: null as null,
      ...(q.status ? { status: q.status as never } : {}),
      ...(q.search
        ? {
            OR: [
              { title: { contains: q.search, mode: "insensitive" as const } },
              { slug: { contains: q.search, mode: "insensitive" as const } },
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
    const { loadMediaMap, attachMediaField } = await import("../../lib/media-ref");
    const imageMap = await loadMediaMap(rows.map((r) => r.featuredImageId));
    const items = rows.map((r) => attachMediaField(r, imageMap, "featuredImageId", "featuredImage"));
    return ok(res, { items, total, page, pageSize }, { pagination: paginationMeta(page, pageSize, total) });
  } catch (e) {
    return next(e);
  }
});
adminBlogRouter.get("/categories", async (_req, res, next) => {
  try {
    return ok(res, await listCategories());
  } catch (e) {
    return next(e);
  }
});

adminBlogRouter.post(
  "/categories",
  validate(z.object({ name: z.string().min(1) })),
  async (req, res, next) => {
    try {
      return created(res, await createCategory(req.body.name));
    } catch (e) {
      return next(e);
    }
  },
);

adminBlogRouter.put(
  "/categories/:id",
  validate(z.object({ id: z.string().min(1) }), "params"),
  validate(z.object({ name: z.string().min(1) })),
  async (req, res, next) => {
    try {
      return ok(res, await updateCategory(param(req, "id"), req.body.name));
    } catch (e) {
      return next(e);
    }
  },
);

adminBlogRouter.delete(
  "/categories/:id",
  validate(z.object({ id: z.string().min(1) }), "params"),
  async (req, res, next) => {
    try {
      await deleteCategory(param(req, "id"));
      return ok(res, { deleted: true });
    } catch (e) {
      return next(e);
    }
  },
);

adminBlogRouter.get("/tags", async (_req, res, next) => {
  try {
    return ok(res, await listTags());
  } catch (e) {
    return next(e);
  }
});

adminBlogRouter.post(
  "/tags",
  validate(z.object({ name: z.string().min(1) })),
  async (req, res, next) => {
    try {
      return created(res, await createTag(req.body.name));
    } catch (e) {
      return next(e);
    }
  },
);

adminBlogRouter.put(
  "/tags/:id",
  validate(z.object({ id: z.string().min(1) }), "params"),
  validate(z.object({ name: z.string().min(1) })),
  async (req, res, next) => {
    try {
      return ok(res, await updateTag(param(req, "id"), req.body.name));
    } catch (e) {
      return next(e);
    }
  },
);

adminBlogRouter.delete(
  "/tags/:id",
  validate(z.object({ id: z.string().min(1) }), "params"),
  async (req, res, next) => {
    try {
      await deleteTag(param(req, "id"));
      return ok(res, { deleted: true });
    } catch (e) {
      return next(e);
    }
  },
);

adminBlogRouter.get("/:id", async (req, res, next) => {
  try {
    return ok(res, await getPostById(param(req, "id")));
  } catch (e) {
    return next(e);
  }
});

adminBlogRouter.post("/", validate(schema), async (req, res, next) => {
  try {
    const { categoryIds, tagIds, ...data } = req.body;
    const item = await createPost(data, categoryIds, tagIds);
    const { paths, tags } = blogRevalidateTargets(item.slug);
    void triggerRevalidate(paths, tags);
    return created(res, item);
  } catch (e) {
    return next(e);
  }
});
adminBlogRouter.put(
  "/:id",
  validate(z.object({ id: z.string().min(1) }), "params"),
  validate(schema.partial()),
  async (req, res, next) => {
    try {
      const id = param(req, "id");
      const { prisma } = await import("../../db/prisma");
      const before = await prisma.blogPost.findFirst({
        where: { id, deletedAt: null },
        select: { slug: true },
      });
      const { categoryIds, tagIds, ...data } = req.body;
      const item = await updatePost(id, data, categoryIds, tagIds);
      const { paths, tags } = blogRevalidateTargets(item.slug, before?.slug);
      void triggerRevalidate(paths, tags);
      return ok(res, item);
    } catch (e) {
      return next(e);
    }
  },
);
adminBlogRouter.delete(
  "/:id",
  validate(z.object({ id: z.string().min(1) }), "params"),
  async (req, res, next) => {
    try {
      const post = await getPostById(param(req, "id"));
      await deletePost(post.id);
      const { paths, tags } = blogRevalidateTargets(post.slug);
      void triggerRevalidate(paths, tags);
      return ok(res, { deleted: true });
    } catch (e) {
      return next(e);
    }
  },
);
