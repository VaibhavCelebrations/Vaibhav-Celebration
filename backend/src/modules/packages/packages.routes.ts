import { AdminRole } from "@prisma/client";
import { Router, type NextFunction, type Response } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { clientIp, writeAuditLog } from "../../lib/audit";
import { NotFoundError } from "../../lib/errors";
import { param } from "../../lib/params";
import { created, ok } from "../../lib/response";
import { paginationQuerySchema } from "../../lib/validators";
import { requireAdmin, requireRoles, type AuthenticatedRequest } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { triggerRevalidate } from "../../integrations/revalidate/client";
import { adminListPackages } from "../admin/admin-list.service";
import {
  comparePackages,
  createPackage,
  deletePackage,
  getPackageBySlug,
  getPackageDetail,
  getPackageMatrix,
  listPackages,
  replacePackageServiceItems,
  savePackageMatrix,
  updatePackage,
} from "./packages.service";

const roles = [
  requireAdmin,
  requireRoles(AdminRole.CONTENT_EDITOR, AdminRole.OPERATIONS, AdminRole.SUPER_ADMIN),
];
const id = z.object({ id: z.string().min(1) });
const packageSchema = z.object({
  title: z.string().min(1),
  displayName: z.string().optional().nullable(),
  slug: z.string().min(1),
  priceInPaise: z.number().int().min(0),
  tierRank: z.number().int(),
  isRecommended: z.boolean().optional(),
  badgeText: z.string().optional().nullable(),
  pricingUnit: z.string().optional().nullable(),
  hasGiftRegistry: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isCustomizable: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  description: z.string().optional().nullable(),
});

const serviceItemSchema = z.object({
  extraServiceId: z.string().min(1),
  isIncluded: z.boolean(),
  displayOrder: z.number().int().optional(),
});

const extraServicePriceSchema = z.object({
  id: z.string().min(1),
  customizationPriceInPaise: z.number().int().min(0),
});

async function audit(req: AuthenticatedRequest, action: string, entityId: string, metadata?: unknown) {
  await writeAuditLog({
    adminUserId: req.admin!.sub,
    action,
    entityType: "Package",
    entityId,
    metadata,
    ipAddress: clientIp(req),
  });
}

async function shapePackage(packageId: string) {
  const p = await prisma.package.findFirst({
    where: { id: packageId, deletedAt: null },
    include: {
      serviceItems: {
        where: { extraService: { deletedAt: null } },
        orderBy: { displayOrder: "asc" },
        include: { extraService: true },
      },
      _count: {
        select: {
          serviceItems: true,
          themeLinks: true,
        },
      },
    },
  });
  if (!p) throw new NotFoundError("Package not found");
  return {
    id: p.id,
    title: p.title,
    displayName: p.displayName,
    slug: p.slug,
    priceInPaise: p.priceInPaise,
    tierRank: p.tierRank,
    isRecommended: p.isRecommended,
    badgeText: p.badgeText,
    pricingUnit: p.pricingUnit,
    hasGiftRegistry: p.hasGiftRegistry,
    isActive: p.isActive,
    isCustomizable: p.isCustomizable,
    displayOrder: p.displayOrder,
    description: p.description,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    deletedAt: p.deletedAt?.toISOString() ?? null,
    serviceItemCount: p._count.serviceItems,
    includedServiceCount: p.serviceItems.filter((s) => s.isIncluded).length,
    themeCount: p._count.themeLinks,
    serviceItems: p.serviceItems.map((s) => ({
      id: s.id,
      extraServiceId: s.extraServiceId,
      label: s.extraService.label,
      description: s.extraService.description,
      requirements: s.extraService.requirements,
      customizationPriceInPaise: s.extraService.customizationPriceInPaise,
      isIncluded: s.isIncluded,
      displayOrder: s.displayOrder,
    })),
  };
}

export const packagesRouter = Router();
packagesRouter.get("/", async (_req, res, next) => {
  try {
    return ok(res, await listPackages());
  } catch (err) {
    return next(err);
  }
});
packagesRouter.get(
  "/compare",
  validate(z.object({ ids: z.string().min(1) }), "query"),
  async (req, res, next) => {
    try {
      const { ids } = req.query as unknown as { ids: string };
      return ok(
        res,
        await comparePackages(
          ids
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      );
    } catch (err) {
      return next(err);
    }
  },
);
packagesRouter.get(
  "/:slug",
  validate(z.object({ slug: z.string().min(1) }), "params"),
  async (req, res, next) => {
    try {
      return ok(res, await getPackageBySlug(param(req, "slug")));
    } catch (err) {
      return next(err);
    }
  },
);

export const adminPackagesRouter = Router();
adminPackagesRouter.use(...roles);

adminPackagesRouter.get(
  "/",
  validate(
    paginationQuerySchema.extend({
      search: z.string().optional(),
      sort: z.string().optional(),
      dir: z.enum(["asc", "desc"]).optional(),
      isActive: z.string().optional(),
    }),
    "query",
  ),
  async (req, res, next) => {
    try {
      return ok(res, await adminListPackages(req.query as never));
    } catch (err) {
      return next(err);
    }
  },
);

adminPackagesRouter.get("/matrix", async (_req, res, next) => {
  try {
    return ok(res, await getPackageMatrix());
  } catch (err) {
    return next(err);
  }
});

adminPackagesRouter.put(
  "/matrix",
  validate(
    z.object({
      packages: z.array(
        z.object({
          packageId: z.string().min(1),
          title: z.string().optional(),
          displayName: z.string().optional().nullable(),
          description: z.string().optional().nullable(),
          priceInPaise: z.number().int().min(0).optional(),
          isRecommended: z.boolean().optional(),
          badgeText: z.string().optional().nullable(),
          pricingUnit: z.string().optional().nullable(),
          hasGiftRegistry: z.boolean().optional(),
          isActive: z.boolean().optional(),
          isCustomizable: z.boolean().optional(),
          items: z.array(serviceItemSchema),
        }),
      ),
      extraServices: z.array(extraServicePriceSchema).optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const result = await savePackageMatrix(req.body);
      await audit(req as AuthenticatedRequest, "SAVE_MATRIX", "all");
      void triggerRevalidate(["/packages"]);
      return ok(res, result);
    } catch (err) {
      return next(err);
    }
  },
);

adminPackagesRouter.get("/:id", validate(id, "params"), async (req, res, next) => {
  try {
    return ok(res, await shapePackage(param(req, "id")));
  } catch (err) {
    return next(err);
  }
});

adminPackagesRouter.post("/", validate(packageSchema), async (req, res, next) => {
  try {
    const item = await createPackage(req.body);
    await audit(req as AuthenticatedRequest, "CREATE", item.id);
    void triggerRevalidate(["/packages", `/packages/${item.slug}`]);
    return created(res, await shapePackage(item.id));
  } catch (err) {
    return next(err);
  }
});

adminPackagesRouter.post(
  "/:id/service-items",
  validate(id, "params"),
  validate(z.object({ items: z.array(serviceItemSchema) })),
  async (req, res, next) => {
    try {
      const item = await replacePackageServiceItems(param(req, "id"), req.body.items);
      await audit(req as AuthenticatedRequest, "REPLACE_SERVICE_ITEMS", param(req, "id"));
      void triggerRevalidate(["/packages"]);
      return ok(res, item);
    } catch (err) {
      return next(err);
    }
  },
);

async function updatePkg(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const item = await updatePackage(param(req, "id"), req.body);
    await audit(req, "UPDATE", item.id);
    void triggerRevalidate(["/packages", `/packages/${item.slug}`]);
    return ok(res, await shapePackage(item.id));
  } catch (err) {
    return next(err);
  }
}

adminPackagesRouter.put("/:id", validate(id, "params"), validate(packageSchema.partial()), updatePkg);
adminPackagesRouter.patch("/:id", validate(id, "params"), validate(packageSchema.partial()), updatePkg);

adminPackagesRouter.delete("/:id", validate(id, "params"), async (req, res, next) => {
  try {
    await deletePackage(param(req, "id"));
    await audit(req as AuthenticatedRequest, "DELETE", param(req, "id"));
    void triggerRevalidate(["/packages"]);
    return ok(res, { deleted: true });
  } catch (err) {
    return next(err);
  }
});
