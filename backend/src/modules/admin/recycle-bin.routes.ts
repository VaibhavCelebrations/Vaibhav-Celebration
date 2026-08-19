import { AdminRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { ok } from "../../lib/response";
import { requireAdmin, requireRoles } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { param, queryString } from "../../lib/params";
import type { AuthenticatedRequest } from "../../middleware/auth";
import {
  listDeletedItems,
  restoreItem,
  hardDeleteItem,
  getRecycleBinCount,
  RECYCLE_BIN_ENTITY_TYPES,
  type RecycleBinEntityType,
} from "./recycle-bin.service";

export const recycleBinRouter = Router();

// All recycle bin routes are SUPER_ADMIN only
recycleBinRouter.use(requireAdmin, requireRoles(AdminRole.SUPER_ADMIN));

const entityTypeSchema = z.enum(RECYCLE_BIN_ENTITY_TYPES);

// ── GET /admin/recycle-bin — list deleted items ──────────────────────────────
recycleBinRouter.get(
  "/",
  validate(
    z.object({
      entityType: entityTypeSchema.optional(),
      page: z.coerce.number().optional(),
      pageSize: z.coerce.number().optional(),
    }),
    "query",
  ),
  async (req, res, next) => {
    try {
      const entityType = queryString(req, "entityType") as RecycleBinEntityType | undefined;
      const page = req.query.page ? Number(req.query.page) : undefined;
      const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;

      const result = await listDeletedItems({ entityType, page, pageSize });
      return ok(res, result.items, { pagination: result.meta });
    } catch (err) {
      return next(err);
    }
  },
);

// ── GET /admin/recycle-bin/count — total deleted items count ─────────────────
recycleBinRouter.get("/count", async (_req, res, next) => {
  try {
    const count = await getRecycleBinCount();
    return ok(res, { count });
  } catch (err) {
    return next(err);
  }
});

// ── POST /admin/recycle-bin/:type/:id/restore ────────────────────────────────
recycleBinRouter.post(
  "/:type/:id/restore",
  validate(
    z.object({
      type: entityTypeSchema,
      id: z.string().min(1),
    }),
    "params",
  ),
  validate(
    z.object({
      password: z.string().min(1, "Password is required"),
    }),
  ),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const entityType = param(req, "type") as RecycleBinEntityType;
      const id = param(req, "id");
      const { password } = req.body as { password: string };

      const result = await restoreItem({
        entityType,
        id,
        adminId: req.admin!.sub,
        adminPassword: password,
      });

      return ok(res, result);
    } catch (err) {
      return next(err);
    }
  },
);

// ── DELETE /admin/recycle-bin/:type/:id — hard delete ────────────────────────
recycleBinRouter.delete(
  "/:type/:id",
  validate(
    z.object({
      type: entityTypeSchema,
      id: z.string().min(1),
    }),
    "params",
  ),
  validate(
    z.object({
      password: z.string().min(1, "Password is required"),
    }),
  ),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const entityType = param(req, "type") as RecycleBinEntityType;
      const id = param(req, "id");
      const { password } = req.body as { password: string };

      const result = await hardDeleteItem({
        entityType,
        id,
        adminId: req.admin!.sub,
        adminPassword: password,
      });

      return ok(res, result);
    } catch (err) {
      return next(err);
    }
  },
);
