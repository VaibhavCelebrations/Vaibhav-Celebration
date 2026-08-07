import { AdminRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { clientIp, writeAuditLog } from "../../lib/audit";
import { created, ok } from "../../lib/response";
import { param } from "../../lib/params";
import { requireAdmin, requireRoles, type AuthenticatedRequest } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createExtraService,
  deleteExtraService,
  getExtraService,
  listExtraServices,
  updateExtraService,
} from "./extra-services.service";

const roles = [
  requireAdmin,
  requireRoles(AdminRole.CONTENT_EDITOR, AdminRole.OPERATIONS, AdminRole.SUPER_ADMIN),
];
const id = z.object({ id: z.string().min(1) });
const schema = z.object({
  label: z.string().min(1),
  slug: z.string().min(1).optional().nullable(),
  description: z.string().optional().nullable(),
  requirements: z.string().optional().nullable(),
  customizationPriceInPaise: z.number().int().min(0).optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  category: z
    .enum([
      "DIGITAL",
      "KEEPSAKE",
      "CHILDREN_ACTIVITY",
      "WELCOME_ITEM",
      "FAMILY_ACTIVITY",
      "RETURN_GIFT",
      "PACKAGING",
      "THANK_YOU_TAG",
      "CONSULTATION",
      "GIFT_REGISTRY",
      "PERSONALIZATION",
      "DECOR",
    ])
    .optional()
    .nullable(),
  pricingMode: z
    .enum(["FIXED", "PER_CHILD", "PER_CARD", "PER_GROUP", "PER_CHILD_CHOOSABLE"])
    .optional()
    .nullable(),
  locationScope: z.enum(["ALL", "JAIPUR_ONLY", "OUTSIDE_JAIPUR"]).optional(),
  choiceCount: z.number().int().min(1).optional().nullable(),
});

async function audit(req: AuthenticatedRequest, action: string, entityId: string) {
  await writeAuditLog({
    adminUserId: req.admin!.sub,
    action,
    entityType: "ExtraService",
    entityId,
    ipAddress: clientIp(req),
  });
}

export const adminExtraServicesRouter = Router();
adminExtraServicesRouter.use(...roles);

adminExtraServicesRouter.get("/", async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === "true";
    return ok(res, await listExtraServices(includeInactive));
  } catch (err) {
    return next(err);
  }
});

adminExtraServicesRouter.get("/:id", validate(id, "params"), async (req, res, next) => {
  try {
    return ok(res, await getExtraService(param(req, "id")));
  } catch (err) {
    return next(err);
  }
});

adminExtraServicesRouter.post("/", validate(schema), async (req, res, next) => {
  try {
    const item = await createExtraService(req.body);
    await audit(req as AuthenticatedRequest, "CREATE", item.id);
    return created(res, item);
  } catch (err) {
    return next(err);
  }
});

adminExtraServicesRouter.patch(
  "/:id",
  validate(id, "params"),
  validate(schema.partial()),
  async (req, res, next) => {
    try {
      const item = await updateExtraService(param(req, "id"), req.body);
      await audit(req as AuthenticatedRequest, "UPDATE", item.id);
      return ok(res, item);
    } catch (err) {
      return next(err);
    }
  },
);

adminExtraServicesRouter.delete("/:id", validate(id, "params"), async (req, res, next) => {
  try {
    await deleteExtraService(param(req, "id"));
    await audit(req as AuthenticatedRequest, "DELETE", param(req, "id"));
    return ok(res, { deleted: true });
  } catch (err) {
    return next(err);
  }
});
