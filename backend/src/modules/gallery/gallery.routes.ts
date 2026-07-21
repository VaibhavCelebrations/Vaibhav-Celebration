import { param } from "../../lib/params";
import { AdminRole, GalleryCtaType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { clientIp, writeAuditLog } from "../../lib/audit";
import { created, ok } from "../../lib/response";
import {
  requireAdmin,
  requireRoles,
  type AuthenticatedRequest,
} from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { triggerRevalidate } from "../../integrations/revalidate/client";
import {
  createGalleryImage,
  deleteGalleryImage,
  listGallery,
  listGalleryTags,
  updateGalleryImage,
} from "./gallery.service";

const roles = [
  requireAdmin,
  requireRoles(
    AdminRole.CONTENT_EDITOR,
    AdminRole.OPERATIONS,
    AdminRole.SUPER_ADMIN,
  ),
];
const id = z.object({ id: z.string().min(1) });
const schema = z.object({
  mediaId: z.string().min(1),
  caption: z.string().optional().nullable(),
  altText: z.string().min(1),
  themeId: z.string().optional().nullable(),
  ctaType: z.nativeEnum(GalleryCtaType).optional(),
  ctaTargetSlug: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  tagIds: z.array(z.string()).optional(),
  tagNames: z.array(z.string().min(1)).optional(),
});

async function audit(
  req: AuthenticatedRequest,
  action: string,
  entityId: string,
) {
  await writeAuditLog({
    adminUserId: req.admin!.sub,
    action,
    entityType: "GalleryImage",
    entityId,
    ipAddress: clientIp(req),
  });
}

export const galleryRouter = Router();
galleryRouter.get(
  "/",
  validate(
    z.object({ tag: z.string().optional(), themeId: z.string().optional() }),
    "query",
  ),
  async (req, res, next) => {
    try {
      return ok(
        res,
        await listGallery(
          req.query.tag as string | undefined,
          req.query.themeId as string | undefined,
        ),
      );
    } catch (err) {
      return next(err);
    }
  },
);

export const adminGalleryRouter = Router();
adminGalleryRouter.use(...roles);

adminGalleryRouter.get("/tags", async (_req, res, next) => {
  try {
    return ok(res, await listGalleryTags());
  } catch (err) {
    return next(err);
  }
});

adminGalleryRouter.get("/", async (req, res, next) => {
  try {
    const { parsePagination, paginationMeta } = await import("../../lib/response");
    const { prisma } = await import("../../db/prisma");
    const q = req.query as {
      page?: string;
      pageSize?: string;
      search?: string;
      themeId?: string;
      tag?: string;
    };
    const { page, pageSize, skip, take } = parsePagination({
      page: q.page ? Number(q.page) : undefined,
      pageSize: q.pageSize ? Number(q.pageSize) : undefined,
    });
    const where = {
      deletedAt: null as null,
      ...(q.themeId ? { themeId: q.themeId } : {}),
      ...(q.tag ? { tags: { some: { tag: { name: q.tag } } } } : {}),
      ...(q.search
        ? {
            OR: [
              { caption: { contains: q.search, mode: "insensitive" as const } },
              { altText: { contains: q.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.galleryImage.findMany({
        where,
        skip,
        take,
        include: {
          media: true,
          theme: { select: { id: true, title: true, slug: true } },
          tags: { include: { tag: true } },
        },
        orderBy: { displayOrder: "asc" },
      }),
      prisma.galleryImage.count({ where }),
    ]);
    return ok(
      res,
      { items, total, page, pageSize },
      { pagination: paginationMeta(page, pageSize, total) },
    );
  } catch (err) {
    return next(err);
  }
});

adminGalleryRouter.post("/", validate(schema), async (req, res, next) => {
  try {
    const { tagIds, tagNames, ...data } = req.body as z.infer<typeof schema>;
    const item = await createGalleryImage(data, tagIds, tagNames);
    await audit(req as AuthenticatedRequest, "CREATE", item.id);
    void triggerRevalidate(["/gallery"]);
    return created(res, item);
  } catch (err) {
    return next(err);
  }
});

adminGalleryRouter.put(
  "/:id",
  validate(id, "params"),
  validate(schema.partial()),
  async (req, res, next) => {
    try {
      const { tagIds, tagNames, ...data } = req.body as z.infer<typeof schema>;
      const item = await updateGalleryImage(param(req, "id"), data, tagIds, tagNames);
      await audit(req as AuthenticatedRequest, "UPDATE", item.id);
      void triggerRevalidate(["/gallery"]);
      return ok(res, item);
    } catch (err) {
      return next(err);
    }
  },
);

adminGalleryRouter.patch(
  "/:id",
  validate(id, "params"),
  validate(schema.partial()),
  async (req, res, next) => {
    try {
      const { tagIds, tagNames, ...data } = req.body as z.infer<typeof schema>;
      const item = await updateGalleryImage(param(req, "id"), data, tagIds, tagNames);
      await audit(req as AuthenticatedRequest, "UPDATE", item.id);
      void triggerRevalidate(["/gallery"]);
      return ok(res, item);
    } catch (err) {
      return next(err);
    }
  },
);

adminGalleryRouter.delete(
  "/:id",
  validate(id, "params"),
  async (req, res, next) => {
    try {
      await deleteGalleryImage(param(req, "id"));
      await audit(req as AuthenticatedRequest, "DELETE", param(req, "id"));
      void triggerRevalidate(["/gallery"]);
      return ok(res, { deleted: true });
    } catch (err) {
      return next(err);
    }
  },
);
