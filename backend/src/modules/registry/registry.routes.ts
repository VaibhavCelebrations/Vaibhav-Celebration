import { AdminRole, GiftLinkSourceType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { param } from "../../lib/params";
import { ok, paginationMeta } from "../../lib/response";
import { paginationQuerySchema } from "../../lib/validators";
import { requireAdmin, requireRoles } from "../../middleware/auth";
import { requireCustomer, type CustomerAuthenticatedRequest } from "../../middleware/customer-auth";
import { idempotency } from "../../middleware/idempotency";
import { validate } from "../../middleware/validate";
import {
  addRegistryItem,
  adminGetRegistry,
  adminListRegistries,
  createRegistry,
  deleteRegistryItem,
  getPublicRegistry,
  getRegistryForOwner,
  giftRegistryItem,
  listRegistriesForOwner,
  updateRegistry,
} from "./registry.service";

function customerId(req: import("express").Request): string {
  return (req as CustomerAuthenticatedRequest).customer!.sub;
}

const shippingAddressSchema = z.object({
  fullName: z.string().min(1),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().min(4).max(10),
  country: z.string().min(1).default("India"),
});

// ─── Owner-facing (/account/registries) ──────────────────────────────────────

export const accountRegistryRouter = Router();
accountRegistryRouter.use(requireCustomer);

accountRegistryRouter.get("/", async (req, res, next) => {
  try {
    return ok(res, await listRegistriesForOwner(customerId(req)));
  } catch (err) {
    return next(err);
  }
});

accountRegistryRouter.post(
  "/",
  validate(
    z.object({
      password: z.string().min(4).max(64),
      childOrPersonName: z.string().max(120).optional(),
      celebrationDetails: z.string().max(2000).optional(),
      photoMediaId: z.string().optional(),
      shippingAddress: shippingAddressSchema.optional(),
      bookingId: z.string().optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const item = await createRegistry(customerId(req), req.body);
      return res.status(201).json({ success: true, data: item });
    } catch (err) {
      return next(err);
    }
  },
);

accountRegistryRouter.get("/:id", validate(z.object({ id: z.string().min(1) }), "params"), async (req, res, next) => {
  try {
    return ok(res, await getRegistryForOwner(customerId(req), param(req, "id")));
  } catch (err) {
    return next(err);
  }
});

accountRegistryRouter.put(
  "/:id",
  validate(z.object({ id: z.string().min(1) }), "params"),
  validate(
    z.object({
      childOrPersonName: z.string().max(120).optional(),
      celebrationDetails: z.string().max(2000).optional(),
      photoMediaId: z.string().optional(),
      shippingAddress: shippingAddressSchema.optional(),
      status: z.enum(["ACTIVE", "CLOSED"]).optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      return ok(res, await updateRegistry(customerId(req), param(req, "id"), req.body));
    } catch (err) {
      return next(err);
    }
  },
);

accountRegistryRouter.post(
  "/:id/items",
  validate(z.object({ id: z.string().min(1) }), "params"),
  validate(
    z.object({
      sourceType: z.nativeEnum(GiftLinkSourceType),
      externalUrl: z.string().url().optional(),
      manualTitle: z.string().max(200).optional(),
      manualImageUrl: z.string().url().optional(),
      manualPriceInPaise: z.number().int().positive().optional(),
      internalProductId: z.string().optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const item = await addRegistryItem(customerId(req), param(req, "id"), req.body);
      return res.status(201).json({ success: true, data: item });
    } catch (err) {
      return next(err);
    }
  },
);

accountRegistryRouter.delete(
  "/:id/items/:itemId",
  validate(z.object({ id: z.string().min(1), itemId: z.string().min(1) }), "params"),
  async (req, res, next) => {
    try {
      await deleteRegistryItem(customerId(req), param(req, "id"), param(req, "itemId"));
      return ok(res, { deleted: true });
    } catch (err) {
      return next(err);
    }
  },
);

// ─── Public share view (/registry) ───────────────────────────────────────────

export const registryRouter = Router();

registryRouter.post(
  "/:code/view",
  validate(z.object({ code: z.string().min(1) }), "params"),
  validate(z.object({ password: z.string().min(1) })),
  async (req, res, next) => {
    try {
      return ok(res, await getPublicRegistry(param(req, "code"), req.body.password));
    } catch (err) {
      return next(err);
    }
  },
);

registryRouter.post(
  "/:code/items/:itemId/gift",
  requireCustomer,
  idempotency,
  validate(z.object({ code: z.string().min(1), itemId: z.string().min(1) }), "params"),
  validate(
    z.object({
      password: z.string().min(1),
      shippingAddress: shippingAddressSchema,
      contactEmail: z.string().email(),
      contactPhone: z.string().min(6).max(20),
    }),
  ),
  async (req, res, next) => {
    try {
      const result = await giftRegistryItem(
        customerId(req),
        param(req, "code"),
        param(req, "itemId"),
        req.body.password,
        req.body,
      );
      return res.status(201).json({ success: true, data: result });
    } catch (err) {
      return next(err);
    }
  },
);

// ─── Admin (read-only operational visibility) ────────────────────────────────

export const adminRegistryRouter = Router();
adminRegistryRouter.use(requireAdmin, requireRoles(AdminRole.OPERATIONS, AdminRole.SUPER_ADMIN));

adminRegistryRouter.get(
  "/",
  validate(paginationQuerySchema.extend({ search: z.string().optional() }), "query"),
  async (req, res, next) => {
    try {
      const result = await adminListRegistries(req.query as never);
      return ok(res, result);
    } catch (err) {
      return next(err);
    }
  },
);

adminRegistryRouter.get("/:id", validate(z.object({ id: z.string().min(1) }), "params"), async (req, res, next) => {
  try {
    return ok(res, await adminGetRegistry(param(req, "id")));
  } catch (err) {
    return next(err);
  }
});
