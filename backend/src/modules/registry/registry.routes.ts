import { AdminRole, ExtractionStatus, GiftLinkSourceType, RegistryStatus, RegistryVisibility } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { param } from "../../lib/params";
import { ok } from "../../lib/response";
import { paginationQuerySchema } from "../../lib/validators";
import { requireAdmin, requireRoles } from "../../middleware/auth";
import { requireCustomer, type CustomerAuthenticatedRequest } from "../../middleware/customer-auth";
import { idempotency } from "../../middleware/idempotency";
import { validate } from "../../middleware/validate";
import {
  addRegistryItem,
  adminGetRegistry,
  adminListExtractions,
  adminListRegistries,
  adminOverrideExtraction,
  adminRetryExtraction,
  adminUpdateRegistry,
  archiveRegistry,
  confirmExternalGift,
  createRegistry,
  deleteRegistryItem,
  getPublicRegistry,
  getRegistryForOwner,
  getRegistryPreviewForOwner,
  getRegistrySeo,
  giftRegistryItem,
  listRegistriesForOwner,
  previewExternalProduct,
  reorderRegistryItems,
  reverseContribution,
  updateRegistry,
  updateRegistryItem,
} from "./registry.service";
import { getRegistryAccess } from "../upgrades/upgrades.service";

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

export const accountRegistryRouter = Router();
accountRegistryRouter.use(requireCustomer);

accountRegistryRouter.get("/", async (req, res, next) => {
  try {
    return ok(res, await listRegistriesForOwner(customerId(req)));
  } catch (err) {
    return next(err);
  }
});

accountRegistryRouter.get("/access", async (req, res, next) => {
  try {
    return ok(res, await getRegistryAccess(customerId(req)));
  } catch (err) {
    return next(err);
  }
});

accountRegistryRouter.post(
  "/",
  validate(
    z.object({
      sourceOrderCode: z.string().min(1),
      password: z.string().min(4).max(64).optional(),
      title: z.string().max(160).optional(),
      occasion: z.string().max(120).optional(),
      eventDate: z.string().optional(),
      ownerDisplayName: z.string().max(120).optional(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().min(6).max(20).optional(),
      childOrPersonName: z.string().max(120).optional(),
      celebrationDetails: z.string().max(4000).optional(),
      giftPreferences: z.string().max(2000).optional(),
      photoMediaId: z.string().optional(),
      coverImageUrl: z.string().url().optional(),
      shippingAddress: shippingAddressSchema.optional(),
      visibility: z.nativeEnum(RegistryVisibility).optional(),
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

accountRegistryRouter.post(
  "/extract",
  validate(z.object({ url: z.string().url(), force: z.boolean().optional() })),
  async (req, res, next) => {
    try {
      return ok(res, await previewExternalProduct(customerId(req), req.body.url, req.body.force));
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

accountRegistryRouter.get(
  "/:id/preview",
  validate(z.object({ id: z.string().min(1) }), "params"),
  async (req, res, next) => {
    try {
      return ok(res, await getRegistryPreviewForOwner(customerId(req), param(req, "id")));
    } catch (err) {
      return next(err);
    }
  },
);

accountRegistryRouter.put(
  "/:id",
  validate(z.object({ id: z.string().min(1) }), "params"),
  validate(
    z.object({
      title: z.string().max(160).optional(),
      occasion: z.string().max(120).optional(),
      eventDate: z.string().nullable().optional(),
      ownerDisplayName: z.string().max(120).optional(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().min(6).max(20).optional(),
      childOrPersonName: z.string().max(120).optional(),
      celebrationDetails: z.string().max(4000).optional(),
      giftPreferences: z.string().max(2000).optional(),
      photoMediaId: z.string().optional(),
      coverImageUrl: z.string().url().nullable().optional(),
      shippingAddress: shippingAddressSchema.optional(),
      visibility: z.nativeEnum(RegistryVisibility).optional(),
      password: z.string().min(4).max(64).optional(),
      status: z.enum(["DRAFT", "ACTIVE", "CLOSED", "ARCHIVED"]).optional(),
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

accountRegistryRouter.delete("/:id", validate(z.object({ id: z.string().min(1) }), "params"), async (req, res, next) => {
  try {
    return ok(res, await archiveRegistry(customerId(req), param(req, "id")));
  } catch (err) {
    return next(err);
  }
});

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
      currency: z.string().max(8).optional(),
      storeName: z.string().max(80).optional(),
      description: z.string().max(2000).optional(),
      notes: z.string().max(1000).optional(),
      quantityDesired: z.number().int().positive().max(99).optional(),
      priority: z.number().int().min(0).max(100).optional(),
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

accountRegistryRouter.put(
  "/:id/items/reorder",
  validate(z.object({ id: z.string().min(1) }), "params"),
  validate(z.object({ itemIds: z.array(z.string().min(1)).min(1) })),
  async (req, res, next) => {
    try {
      return ok(res, await reorderRegistryItems(customerId(req), param(req, "id"), req.body.itemIds));
    } catch (err) {
      return next(err);
    }
  },
);

accountRegistryRouter.put(
  "/:id/items/:itemId",
  validate(z.object({ id: z.string().min(1), itemId: z.string().min(1) }), "params"),
  validate(
    z.object({
      manualTitle: z.string().max(200).optional(),
      manualImageUrl: z.string().url().nullable().optional(),
      manualPriceInPaise: z.number().int().positive().nullable().optional(),
      currency: z.string().max(8).optional(),
      storeName: z.string().max(80).optional(),
      description: z.string().max(2000).optional(),
      notes: z.string().max(1000).optional(),
      quantityDesired: z.number().int().positive().max(99).optional(),
      priority: z.number().int().min(0).max(100).optional(),
      displayOrder: z.number().int().min(0).optional(),
      externalUrl: z.string().url().optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      return ok(res, await updateRegistryItem(customerId(req), param(req, "id"), param(req, "itemId"), req.body));
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

accountRegistryRouter.post(
  "/:id/contributions/:contributionId/reverse",
  validate(z.object({ id: z.string().min(1), contributionId: z.string().min(1) }), "params"),
  async (req, res, next) => {
    try {
      return ok(res, await reverseContribution(customerId(req), param(req, "id"), param(req, "contributionId")));
    } catch (err) {
      return next(err);
    }
  },
);

export const registryRouter = Router();

registryRouter.get("/:code/seo", validate(z.object({ code: z.string().min(1) }), "params"), async (req, res, next) => {
  try {
    return ok(res, await getRegistrySeo(param(req, "code")));
  } catch (err) {
    return next(err);
  }
});

registryRouter.get("/:code", validate(z.object({ code: z.string().min(1) }), "params"), async (req, res, next) => {
  try {
    return ok(res, await getPublicRegistry(param(req, "code")));
  } catch (err) {
    return next(err);
  }
});

registryRouter.post(
  "/:code/view",
  validate(z.object({ code: z.string().min(1) }), "params"),
  validate(z.object({ password: z.string().min(1).optional() })),
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
      password: z.string().min(1).optional(),
      quantity: z.number().int().positive().max(99).optional(),
      contactEmail: z.string().email(),
      contactPhone: z.string().min(6).max(20),
    }),
  ),
  async (req, res, next) => {
    try {
      const result = await giftRegistryItem(customerId(req), param(req, "code"), param(req, "itemId"), req.body);
      return res.status(201).json({ success: true, data: result });
    } catch (err) {
      return next(err);
    }
  },
);

registryRouter.post(
  "/:code/items/:itemId/confirm",
  validate(z.object({ code: z.string().min(1), itemId: z.string().min(1) }), "params"),
  validate(
    z.object({
      password: z.string().min(1).optional(),
      quantity: z.number().int().positive().max(99).optional(),
      guestName: z.string().max(120).optional(),
      guestEmail: z.string().email().optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const gifterUserId = (req as CustomerAuthenticatedRequest).customer?.sub;
      return ok(
        res,
        await confirmExternalGift(param(req, "code"), param(req, "itemId"), { ...req.body, gifterUserId }),
      );
    } catch (err) {
      return next(err);
    }
  },
);

export const adminRegistryRouter = Router();
adminRegistryRouter.use(requireAdmin, requireRoles(AdminRole.OPERATIONS, AdminRole.SUPER_ADMIN));

adminRegistryRouter.get(
  "/extractions",
  validate(paginationQuerySchema.extend({ search: z.string().optional(), status: z.nativeEnum(ExtractionStatus).optional() }), "query"),
  async (req, res, next) => {
    try {
      const result = await adminListExtractions(req.query as never);
      return ok(res, result);
    } catch (err) {
      return next(err);
    }
  },
);

adminRegistryRouter.post(
  "/extractions/:id/retry",
  validate(z.object({ id: z.string().min(1) }), "params"),
  async (req, res, next) => {
    try {
      return ok(res, await adminRetryExtraction(param(req, "id")));
    } catch (err) {
      return next(err);
    }
  },
);

adminRegistryRouter.put(
  "/extractions/:id",
  validate(z.object({ id: z.string().min(1) }), "params"),
  validate(
    z.object({
      title: z.string().max(200).optional(),
      description: z.string().max(2000).optional(),
      image: z.string().url().optional(),
      priceInPaise: z.number().int().positive().nullable().optional(),
      storeName: z.string().max(80).optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      return ok(res, await adminOverrideExtraction(param(req, "id"), req.body));
    } catch (err) {
      return next(err);
    }
  },
);

adminRegistryRouter.get(
  "/",
  validate(
    paginationQuerySchema.extend({
      search: z.string().optional(),
      status: z.nativeEnum(RegistryStatus).optional(),
      visibility: z.nativeEnum(RegistryVisibility).optional(),
    }),
    "query",
  ),
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

adminRegistryRouter.patch(
  "/:id",
  validate(z.object({ id: z.string().min(1) }), "params"),
  validate(
    z.object({
      status: z.nativeEnum(RegistryStatus).optional(),
      visibility: z.nativeEnum(RegistryVisibility).optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      return ok(res, await adminUpdateRegistry(param(req, "id"), req.body));
    } catch (err) {
      return next(err);
    }
  },
);
