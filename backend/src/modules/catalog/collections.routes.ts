import { AdminRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { clientIp, writeAuditLog } from "../../lib/audit";
import { param } from "../../lib/params";
import { created, ok } from "../../lib/response";
import { paginationQuerySchema } from "../../lib/validators";
import { requireAdmin, requireRoles, type AuthenticatedRequest } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { triggerRevalidate } from "../../integrations/revalidate/client";
import {
  adminGetCollection,
  adminListCollections,
  createCollection,
  deleteCollection,
  getCollectionBySlug,
  listCollections,
  updateCollection,
} from "./collections.service";

const roleGuard = [
  requireAdmin,
  requireRoles(AdminRole.CONTENT_EDITOR, AdminRole.OPERATIONS, AdminRole.SUPER_ADMIN),
];

const idSchema = z.object({ id: z.string().min(1) });

const collectionSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  heroImageId: z.string().optional().nullable(),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
  showOnHomepage: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  productIds: z.array(z.string().min(1)).optional(),
});

async function audit(req: AuthenticatedRequest, action: string, entityId: string, metadata?: unknown) {
  await writeAuditLog({
    adminUserId: req.admin!.sub,
    action,
    entityType: "ProductCollection",
    entityId,
    metadata,
    ipAddress: clientIp(req),
  });
}

export const productCollectionsRouter = Router();

productCollectionsRouter.get(
  "/",
  validate(z.object({ featured: z.coerce.boolean().optional() }), "query"),
  async (req, res, next) => {
    try {
      return ok(res, await listCollections(req.query as never));
    } catch (err) {
      return next(err);
    }
  },
);

productCollectionsRouter.get("/:slug", validate(z.object({ slug: z.string().min(1) }), "params"), async (req, res, next) => {
  try {
    return ok(res, await getCollectionBySlug(param(req, "slug")));
  } catch (err) {
    return next(err);
  }
});

export const adminProductCollectionsRouter = Router();
adminProductCollectionsRouter.use(...roleGuard);

adminProductCollectionsRouter.get(
  "/",
  validate(
    paginationQuerySchema.extend({
      search: z.string().optional(),
      isActive: z.string().optional(),
    }),
    "query",
  ),
  async (req, res, next) => {
    try {
      return ok(res, await adminListCollections(req.query as never));
    } catch (err) {
      return next(err);
    }
  },
);

adminProductCollectionsRouter.get("/:id", validate(idSchema, "params"), async (req, res, next) => {
  try {
    return ok(res, await adminGetCollection(param(req, "id")));
  } catch (err) {
    return next(err);
  }
});

adminProductCollectionsRouter.post("/", validate(collectionSchema), async (req, res, next) => {
  try {
    const item = await createCollection(req.body);
    await audit(req as AuthenticatedRequest, "CREATE", item.id, req.body);
    void triggerRevalidate(["/gifts"]);
    return created(res, item);
  } catch (err) {
    return next(err);
  }
});

async function updateHandler(req: AuthenticatedRequest, res: import("express").Response, next: import("express").NextFunction) {
  try {
    const item = await updateCollection(param(req, "id"), req.body);
    await audit(req, "UPDATE", item.id, req.body);
    void triggerRevalidate(["/gifts", `/gifts/collection/${item.slug}`]);
    return ok(res, item);
  } catch (err) {
    return next(err);
  }
}

adminProductCollectionsRouter.put("/:id", validate(idSchema, "params"), validate(collectionSchema.partial()), updateHandler);
adminProductCollectionsRouter.patch("/:id", validate(idSchema, "params"), validate(collectionSchema.partial()), updateHandler);

adminProductCollectionsRouter.delete("/:id", validate(idSchema, "params"), async (req, res, next) => {
  try {
    await deleteCollection(param(req, "id"));
    await audit(req as AuthenticatedRequest, "DELETE", param(req, "id"));
    void triggerRevalidate(["/gifts"]);
    return ok(res, { deleted: true });
  } catch (err) {
    return next(err);
  }
});
