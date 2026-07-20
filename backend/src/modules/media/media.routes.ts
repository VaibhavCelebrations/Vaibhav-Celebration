import { param } from "../../lib/params";
import { AdminRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { NotFoundError } from "../../lib/errors";
import { created, ok, paginationMeta, parsePagination } from "../../lib/response";
import { requireAdmin, requireRoles, type AuthenticatedRequest } from "../../middleware/auth";
import { validate } from "../../middleware/validate";

const schema = z.object({
  url: z.string().url(),
  cdnKey: z.string().min(1),
  type: z.string().min(1),
  altText: z.string().optional().nullable(),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
  sizeBytes: z.number().int().nonnegative().optional().nullable(),
});

export const mediaRouter = Router();
mediaRouter.use(
  requireAdmin,
  requireRoles(AdminRole.CONTENT_EDITOR, AdminRole.OPERATIONS, AdminRole.SUPER_ADMIN),
);

mediaRouter.get(
  "/",
  validate(
    z.object({
      page: z.coerce.number().int().positive().optional(),
      pageSize: z.coerce.number().int().positive().optional(),
    }),
    "query",
  ),
  async (req, res, next) => {
    try {
      const q = req.query as unknown as { page?: number; pageSize?: number };
      const { page, pageSize, skip, take } = parsePagination(q);
      const where = { deletedAt: null };
      const [data, total] = await prisma.$transaction([
        prisma.mediaAsset.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
        prisma.mediaAsset.count({ where }),
      ]);
      return ok(res, data, { pagination: paginationMeta(page, pageSize, total) });
    } catch (e) {
      return next(e);
    }
  },
);

mediaRouter.post("/upload", validate(schema), async (req, res, next) => {
  try {
    const item = await prisma.mediaAsset.create({
      data: {
        ...req.body,
        uploadedByAdminUserId: (req as AuthenticatedRequest).admin!.sub,
      },
    });
    return created(res, item);
  } catch (e) {
    return next(e);
  }
});

mediaRouter.delete(
  "/:id",
  validate(z.object({ id: z.string().min(1) }), "params"),
  async (req, res, next) => {
    try {
      const result = await prisma.mediaAsset.updateMany({
        where: { id: param(req, "id"), deletedAt: null },
        data: { deletedAt: new Date() },
      });
      if (!result.count) throw new NotFoundError("Media asset not found");
      return ok(res, { deleted: true });
    } catch (e) {
      return next(e);
    }
  },
);
