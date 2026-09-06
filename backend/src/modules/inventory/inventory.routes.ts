import { AdminRole, PurchaseOrderStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { clientIp, writeAuditLog } from "../../lib/audit";
import { param } from "../../lib/params";
import { created, ok, paginationMeta } from "../../lib/response";
import { paginationQuerySchema } from "../../lib/validators";
import { requireAdmin, requireRoles, type AuthenticatedRequest } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createSupplier,
  deleteSupplier,
  getSupplier,
  getSupplierHistory,
  listSuppliers,
  updateSupplier,
} from "./suppliers.service";
import {
  cancelPurchaseOrder,
  createPurchaseOrder,
  getPurchaseOrder,
  listPurchaseOrders,
  receivePurchaseOrder,
  updatePurchaseOrder,
} from "./purchase-orders.service";
import { createWarehouse, deleteWarehouse, getWarehouse, listWarehouses, updateWarehouse } from "./warehouses.service";

// ─── Role guards ──────────────────────────────────────────────────────────────

const inventoryRoles = [AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.MANAGER, AdminRole.WAREHOUSE_STAFF];
const readonlyRoles = [...inventoryRoles, AdminRole.CONTENT_EDITOR, AdminRole.SALES_STAFF];

const inventoryGuard = [requireAdmin, requireRoles(...inventoryRoles)];

async function audit(
  req: AuthenticatedRequest,
  action: string,
  entityType: string,
  id: string,
  metadata?: unknown,
) {
  await writeAuditLog({
    adminUserId: req.admin!.sub,
    action,
    entityType,
    entityId: id,
    metadata,
    ipAddress: clientIp(req),
  });
}

const idSchema = z.object({ id: z.string().min(1) });

// ─── Suppliers ────────────────────────────────────────────────────────────────

export const adminSuppliersRouter = Router();
adminSuppliersRouter.use(...inventoryGuard);

const supplierSchema = z.object({
  name: z.string().min(1).max(200),
  contactPerson: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format")
    .optional(),
  notes: z.string().max(2000).optional(),
  isActive: z.boolean().optional(),
});

adminSuppliersRouter.get(
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
      const result = await listSuppliers(req.query as never);
      return ok(res, result.items, { pagination: paginationMeta(result.page, result.pageSize, result.total) });
    } catch (err) {
      return next(err);
    }
  },
);

adminSuppliersRouter.get("/:id", validate(idSchema, "params"), async (req, res, next) => {
  try {
    return ok(res, await getSupplier(param(req, "id")));
  } catch (err) {
    return next(err);
  }
});

adminSuppliersRouter.get(
  "/:id/history",
  validate(idSchema, "params"),
  validate(paginationQuerySchema, "query"),
  async (req, res, next) => {
    try {
      const result = await getSupplierHistory(param(req, "id"), req.query as never);
      return ok(res, result.items, { pagination: paginationMeta(result.page, result.pageSize, result.total) });
    } catch (err) {
      return next(err);
    }
  },
);

adminSuppliersRouter.post("/", validate(supplierSchema), async (req, res, next) => {
  try {
    const item = await createSupplier(req.body);
    await audit(req as AuthenticatedRequest, "CREATE", "Supplier", item.id);
    return created(res, item);
  } catch (err) {
    return next(err);
  }
});

adminSuppliersRouter.patch(
  "/:id",
  validate(idSchema, "params"),
  validate(supplierSchema.partial()),
  async (req, res, next) => {
    try {
      const item = await updateSupplier(param(req, "id"), req.body);
      await audit(req as AuthenticatedRequest, "UPDATE", "Supplier", item.id, req.body);
      return ok(res, item);
    } catch (err) {
      return next(err);
    }
  },
);

adminSuppliersRouter.delete("/:id", validate(idSchema, "params"), async (req, res, next) => {
  try {
    const id = param(req, "id");
    await deleteSupplier(id);
    await audit(req as AuthenticatedRequest, "DELETE", "Supplier", id);
    return ok(res, { deleted: true });
  } catch (err) {
    return next(err);
  }
});

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export const adminPurchaseOrdersRouter = Router();
adminPurchaseOrdersRouter.use(...inventoryGuard);

const poItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPriceInPaise: z.number().int().nonnegative(),
});

const createPoSchema = z.object({
  supplierId: z.string().min(1),
  warehouseId: z.string().optional(),
  notes: z.string().max(2000).optional(),
  expectedAt: z.string().datetime().optional(),
  items: z.array(poItemSchema).min(1),
});

adminPurchaseOrdersRouter.get(
  "/",
  validate(
    paginationQuerySchema.extend({
      status: z.nativeEnum(PurchaseOrderStatus).optional(),
      supplierId: z.string().optional(),
    }),
    "query",
  ),
  async (req, res, next) => {
    try {
      const result = await listPurchaseOrders(req.query as never);
      return ok(res, result.items, { pagination: paginationMeta(result.page, result.pageSize, result.total) });
    } catch (err) {
      return next(err);
    }
  },
);

adminPurchaseOrdersRouter.get("/:id", validate(idSchema, "params"), async (req, res, next) => {
  try {
    return ok(res, await getPurchaseOrder(param(req, "id")));
  } catch (err) {
    return next(err);
  }
});

adminPurchaseOrdersRouter.post("/", validate(createPoSchema), async (req, res, next) => {
  try {
    const item = await createPurchaseOrder({
      ...req.body,
      adminUserId: (req as AuthenticatedRequest).admin!.sub,
    });
    await audit(req as AuthenticatedRequest, "CREATE", "PurchaseOrder", item.id);
    return created(res, item);
  } catch (err) {
    return next(err);
  }
});

adminPurchaseOrdersRouter.patch(
  "/:id",
  validate(idSchema, "params"),
  validate(
    z.object({
      notes: z.string().max(2000).optional(),
      expectedAt: z.string().datetime().nullable().optional(),
      warehouseId: z.string().nullable().optional(),
      status: z.enum(["DRAFT", "ORDERED"]).optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const item = await updatePurchaseOrder(param(req, "id"), req.body);
      await audit(req as AuthenticatedRequest, "UPDATE", "PurchaseOrder", item.id, req.body);
      return ok(res, item);
    } catch (err) {
      return next(err);
    }
  },
);

adminPurchaseOrdersRouter.post(
  "/:id/receive",
  validate(idSchema, "params"),
  validate(
    z.object({
      items: z.array(z.object({ itemId: z.string().min(1), receivedQuantity: z.number().int().positive() })).min(1),
    }),
  ),
  async (req, res, next) => {
    try {
      const id = param(req, "id");
      const item = await receivePurchaseOrder(id, {
        adminUserId: (req as AuthenticatedRequest).admin!.sub,
        items: req.body.items,
      });
      await audit(req as AuthenticatedRequest, "RECEIVE", "PurchaseOrder", id, req.body);
      return ok(res, item);
    } catch (err) {
      return next(err);
    }
  },
);

adminPurchaseOrdersRouter.post("/:id/cancel", validate(idSchema, "params"), async (req, res, next) => {
  try {
    const id = param(req, "id");
    const item = await cancelPurchaseOrder(id);
    await audit(req as AuthenticatedRequest, "CANCEL", "PurchaseOrder", id);
    return ok(res, item);
  } catch (err) {
    return next(err);
  }
});

// ─── Warehouses ───────────────────────────────────────────────────────────────

export const adminWarehousesRouter = Router();
adminWarehousesRouter.use(...inventoryGuard);

const warehouseSchema = z.object({
  name: z.string().min(1).max(200),
  location: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

adminWarehousesRouter.get("/", async (_req, res, next) => {
  try {
    return ok(res, await listWarehouses());
  } catch (err) {
    return next(err);
  }
});

adminWarehousesRouter.get("/:id", validate(idSchema, "params"), async (req, res, next) => {
  try {
    return ok(res, await getWarehouse(param(req, "id")));
  } catch (err) {
    return next(err);
  }
});

adminWarehousesRouter.post("/", validate(warehouseSchema), async (req, res, next) => {
  try {
    const item = await createWarehouse(req.body);
    await audit(req as AuthenticatedRequest, "CREATE", "Warehouse", item.id);
    return created(res, item);
  } catch (err) {
    return next(err);
  }
});

adminWarehousesRouter.patch(
  "/:id",
  validate(idSchema, "params"),
  validate(warehouseSchema.partial()),
  async (req, res, next) => {
    try {
      const item = await updateWarehouse(param(req, "id"), req.body);
      await audit(req as AuthenticatedRequest, "UPDATE", "Warehouse", item.id, req.body);
      return ok(res, item);
    } catch (err) {
      return next(err);
    }
  },
);

adminWarehousesRouter.delete("/:id", validate(idSchema, "params"), async (req, res, next) => {
  try {
    const id = param(req, "id");
    await deleteWarehouse(id);
    await audit(req as AuthenticatedRequest, "DELETE", "Warehouse", id);
    return ok(res, { deleted: true });
  } catch (err) {
    return next(err);
  }
});
