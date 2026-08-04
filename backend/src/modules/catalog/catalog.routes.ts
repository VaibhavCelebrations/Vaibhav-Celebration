import { AdminRole, InventoryLedgerReason } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { clientIp, writeAuditLog } from "../../lib/audit";
import { NotFoundError } from "../../lib/errors";
import { param } from "../../lib/params";
import { created, ok, paginationMeta } from "../../lib/response";
import { paginationQuerySchema } from "../../lib/validators";
import { requireAdmin, requireRoles, type AuthenticatedRequest } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { triggerRevalidate } from "../../integrations/revalidate/client";
import {
  adminGetProduct,
  adminListCategories,
  adminListProducts,
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  getProductBySlug,
  listCategories,
  listProducts,
  updateCategory,
  updateProduct,
} from "./catalog.service";
import { adjustInventory, getInventoryHistory } from "./inventory.service";

const roleGuard = [
  requireAdmin,
  requireRoles(AdminRole.CONTENT_EDITOR, AdminRole.OPERATIONS, AdminRole.SUPER_ADMIN),
];
const idSchema = z.object({ id: z.string().min(1) });

const personalizationFieldSchema = z.object({
  fieldKey: z.string().min(1),
  label: z.string().min(1),
  fieldType: z.enum(["text", "number", "shortText"]),
  isRequired: z.boolean().optional(),
  maxLength: z.number().int().positive().optional(),
});

const productSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  sku: z.string().min(1),
  description: z.string().min(1),
  priceInPaise: z.number().int().positive(),
  compareAtPriceInPaise: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
  minOrderQuantity: z.number().int().positive().optional(),
  maxOrderQuantity: z.number().int().positive().optional().nullable(),
  initialQuantity: z.number().int().nonnegative().optional(),
  lowStockThreshold: z.number().int().nonnegative().optional(),
  categoryIds: z.array(z.string().min(1)).optional(),
  themeIds: z.array(z.string().min(1)).optional(),
  imageMediaIds: z.array(z.string().min(1)).optional(),
  personalizationFields: z.array(personalizationFieldSchema).optional(),
});
const updateProductSchema = productSchema.partial();

async function audit(req: AuthenticatedRequest, action: string, entityType: string, id: string, metadata?: unknown) {
  await writeAuditLog({ adminUserId: req.admin!.sub, action, entityType, entityId: id, metadata, ipAddress: clientIp(req) });
}

// ─── Public: Products ─────────────────────────────────────────────────────────

export const productsRouter = Router();

productsRouter.get(
  "/",
  validate(
    z.object({
      page: z.coerce.number().int().min(1).optional(),
      pageSize: z.coerce.number().int().min(1).max(100).optional(),
      search: z.string().optional(),
      category: z.string().optional(),
      theme: z.string().optional(),
      minPrice: z.coerce.number().int().nonnegative().optional(),
      maxPrice: z.coerce.number().int().nonnegative().optional(),
      sort: z.enum(["price_asc", "price_desc", "newest"]).optional(),
    }),
    "query",
  ),
  async (req, res, next) => {
    try {
      return ok(res, await listProducts(req.query as never));
    } catch (err) {
      return next(err);
    }
  },
);

productsRouter.get("/:slug", validate(z.object({ slug: z.string().min(1) }), "params"), async (req, res, next) => {
  try {
    return ok(res, await getProductBySlug(param(req, "slug")));
  } catch (err) {
    return next(err);
  }
});

export const productCategoriesRouter = Router();
productCategoriesRouter.get("/", async (_req, res, next) => {
  try {
    return ok(res, await listCategories());
  } catch (err) {
    return next(err);
  }
});

// ─── Admin: Products ──────────────────────────────────────────────────────────

export const adminProductsRouter = Router();
adminProductsRouter.use(...roleGuard);

adminProductsRouter.get(
  "/",
  validate(
    paginationQuerySchema.extend({
      search: z.string().optional(),
      isActive: z.string().optional(),
      category: z.string().optional(),
      theme: z.string().optional(),
      sort: z.string().optional(),
      dir: z.enum(["asc", "desc"]).optional(),
    }),
    "query",
  ),
  async (req, res, next) => {
    try {
      const result = await adminListProducts(req.query as never);
      return ok(res, result.items, { pagination: paginationMeta(result.page, result.pageSize, result.total) });
    } catch (err) {
      return next(err);
    }
  },
);

adminProductsRouter.get("/:id", validate(idSchema, "params"), async (req, res, next) => {
  try {
    return ok(res, await adminGetProduct(param(req, "id")));
  } catch (err) {
    return next(err);
  }
});

adminProductsRouter.post("/", validate(productSchema), async (req, res, next) => {
  try {
    const item = await createProduct(req.body);
    await audit(req as AuthenticatedRequest, "CREATE", "Product", item.id);
    void triggerRevalidate(["/gifts", `/gifts/${item.slug}`]);
    return created(res, item);
  } catch (err) {
    return next(err);
  }
});

async function updateHandler(req: AuthenticatedRequest, res: import("express").Response, next: import("express").NextFunction) {
  try {
    const item = await updateProduct(param(req, "id"), req.body);
    await audit(req, "UPDATE", "Product", item.id, req.body);
    void triggerRevalidate(["/gifts", `/gifts/${item.slug}`]);
    return ok(res, item);
  } catch (err) {
    return next(err);
  }
}
adminProductsRouter.put("/:id", validate(idSchema, "params"), validate(updateProductSchema), updateHandler);
adminProductsRouter.patch("/:id", validate(idSchema, "params"), validate(updateProductSchema), updateHandler);

adminProductsRouter.delete("/:id", validate(idSchema, "params"), async (req, res, next) => {
  try {
    await deleteProduct(param(req, "id"));
    await audit(req as AuthenticatedRequest, "DELETE", "Product", param(req, "id"));
    void triggerRevalidate(["/gifts"]);
    return ok(res, { deleted: true });
  } catch (err) {
    return next(err);
  }
});

adminProductsRouter.post(
  "/:id/inventory/adjust",
  validate(idSchema, "params"),
  validate(
    z.object({
      delta: z.number().int().refine((v) => v !== 0, "delta must not be zero"),
      reason: z.nativeEnum(InventoryLedgerReason),
      note: z.string().optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const productId = param(req, "id");
      const result = await adjustInventory({
        productId,
        delta: req.body.delta,
        reason: req.body.reason,
        note: req.body.note,
        adminUserId: (req as AuthenticatedRequest).admin!.sub,
      });
      await audit(req as AuthenticatedRequest, "INVENTORY_ADJUST", "Product", productId, req.body);
      void triggerRevalidate(["/gifts"]);
      return ok(res, result);
    } catch (err) {
      return next(err);
    }
  },
);

adminProductsRouter.get(
  "/:id/inventory/history",
  validate(idSchema, "params"),
  validate(paginationQuerySchema, "query"),
  async (req, res, next) => {
    try {
      const result = await getInventoryHistory(param(req, "id"), req.query as never);
      return ok(res, result.items, { pagination: paginationMeta(result.page, result.pageSize, result.total) });
    } catch (err) {
      return next(err);
    }
  },
);

// ─── Admin: Product Categories ───────────────────────────────────────────────

export const adminProductCategoriesRouter = Router();
adminProductCategoriesRouter.use(...roleGuard);

adminProductCategoriesRouter.get("/", async (_req, res, next) => {
  try {
    return ok(res, await adminListCategories());
  } catch (err) {
    return next(err);
  }
});

const categorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

adminProductCategoriesRouter.post("/", validate(categorySchema), async (req, res, next) => {
  try {
    const item = await createCategory(req.body);
    await audit(req as AuthenticatedRequest, "CREATE", "ProductCategory", item.id);
    return created(res, item);
  } catch (err) {
    return next(err);
  }
});

adminProductCategoriesRouter.put(
  "/:id",
  validate(idSchema, "params"),
  validate(categorySchema.partial()),
  async (req, res, next) => {
    try {
      const item = await updateCategory(param(req, "id"), req.body);
      await audit(req as AuthenticatedRequest, "UPDATE", "ProductCategory", item.id, req.body);
      return ok(res, item);
    } catch (err) {
      return next(err);
    }
  },
);

adminProductCategoriesRouter.delete("/:id", validate(idSchema, "params"), async (req, res, next) => {
  try {
    await deleteCategory(param(req, "id"));
    await audit(req as AuthenticatedRequest, "DELETE", "ProductCategory", param(req, "id"));
    return ok(res, { deleted: true });
  } catch (err) {
    if (err instanceof NotFoundError) return next(err);
    return next(err);
  }
});
