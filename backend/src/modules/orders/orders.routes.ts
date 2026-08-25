import { Router } from "express";
import { z } from "zod";
import { param } from "../../lib/params";
import { ok, paginationMeta } from "../../lib/response";
import { requireCustomer, type CustomerAuthenticatedRequest } from "../../middleware/customer-auth";
import { idempotency } from "../../middleware/idempotency";
import { validate } from "../../middleware/validate";
import { paginationQuerySchema } from "../../lib/validators";
import { createOrderFromCart, createPackageOrder, createDirectOrder, getCheckoutQuote, getOrderForUser, listOrdersForUser, reorderFromOrder, retryShopPayment, verifyShopCheckoutPayment, markOrderPaymentCancelled } from "./orders.service";

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

const packageBuilderSchema = z.object({
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  eventDetails: z
    .object({
      childName: z.string().optional(),
      childAge: z.string().optional(),
      venue: z.string().optional(),
      guestCount: z.union([z.number(), z.string()]).optional(),
      notes: z.string().optional(),
    })
    .optional(),
  builder: z.object({
    packageSlug: z.string().min(1),
    themeSlug: z.string().min(1),
    guestCount: z.number().int().min(5).max(200),
    location: z.enum(["jaipur", "outside"]),
    selections: z
      .object({
        welcomeItem: z.string().min(1).optional().nullable(),
        activity1: z.string().min(1).optional().nullable(),
        activity2: z.string().min(1).optional().nullable(),
        returnGift: z.string().min(1).optional().nullable(),
        familyActivity: z.string().min(1).optional().nullable(),
        decor: z.boolean().optional(),
        personalization: z.record(z.string(), z.boolean()).optional(),
        giftRegistryCustomize: z.boolean().optional(),
      })
      .default({}),
  }),
});

export const shopCheckoutRouter = Router();
shopCheckoutRouter.use(requireCustomer);

shopCheckoutRouter.get("/quote", async (req, res, next) => {
  try {
    return ok(res, await getCheckoutQuote(customerId(req)));
  } catch (err) {
    return next(err);
  }
});

export const ordersRouter = Router();
ordersRouter.use(requireCustomer);

ordersRouter.post(
  "/",
  idempotency,
  validate(
    z.object({
      shippingAddress: shippingAddressSchema,
      contactEmail: z.string().email(),
      contactPhone: z.string().min(6).max(20),
      packageData: packageBuilderSchema.optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const result = await createOrderFromCart(customerId(req), req.body);
      return res.status(201).json({ success: true, data: result });
    } catch (err) {
      return next(err);
    }
  },
);

ordersRouter.post(
  "/direct",
  idempotency,
  validate(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().positive().max(999),
      shippingAddress: shippingAddressSchema,
      contactEmail: z.string().email(),
      contactPhone: z.string().min(6).max(20),
      personalizationValues: z.unknown().optional(),
      personalizationSelected: z.boolean().optional(),
      packageData: packageBuilderSchema.optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const body = req.body as {
        productId: string;
        quantity: number;
        shippingAddress: z.infer<typeof shippingAddressSchema>;
        contactEmail: string;
        contactPhone: string;
        personalizationValues?: unknown;
        personalizationSelected?: boolean;
        packageData?: z.infer<typeof packageBuilderSchema>;
      };
      const result = await createDirectOrder(customerId(req), {
        productId: body.productId,
        quantity: body.quantity,
        shippingAddress: body.shippingAddress,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        personalizationValues: body.personalizationValues,
        personalizationSelected: body.personalizationSelected,
        packageData: body.packageData,
      });
      return res.status(201).json({ success: true, data: result });
    } catch (err) {
      return next(err);
    }
  },
);

ordersRouter.post(
  "/package",
  idempotency,
  validate(
    z.object({
      eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      contactEmail: z.string().email(),
      contactPhone: z.string().min(6).max(20),
      shippingAddress: shippingAddressSchema.optional(),
      eventDetails: packageBuilderSchema.shape.eventDetails,
      builder: packageBuilderSchema.shape.builder,
    }),
  ),
  async (req, res, next) => {
    try {
      const result = await createPackageOrder(customerId(req), req.body);
      return res.status(201).json({ success: true, data: result });
    } catch (err) {
      return next(err);
    }
  },
);

ordersRouter.post(
  "/verify-payment",
  idempotency,
  validate(
    z.object({
      orderCode: z.string().min(1),
      razorpayOrderId: z.string().min(1),
      razorpayPaymentId: z.string().min(1),
      razorpaySignature: z.string().min(1),
    }),
  ),
  async (req, res, next) => {
    try {
      const data = await verifyShopCheckoutPayment({ userId: customerId(req), ...req.body });
      return ok(res, data);
    } catch (err) {
      return next(err);
    }
  },
);

export const accountOrdersRouter = Router();
accountOrdersRouter.use(requireCustomer);

accountOrdersRouter.get("/", validate(paginationQuerySchema, "query"), async (req, res, next) => {
  try {
    const result = await listOrdersForUser(customerId(req), req.query as never);
    return ok(res, result);
  } catch (err) {
    return next(err);
  }
});

accountOrdersRouter.get(
  "/:orderCode",
  validate(z.object({ orderCode: z.string().min(1) }), "params"),
  async (req, res, next) => {
    try {
      return ok(res, await getOrderForUser(customerId(req), param(req, "orderCode")));
    } catch (err) {
      return next(err);
    }
  },
);

accountOrdersRouter.post(
  "/:orderCode/retry-payment",
  validate(z.object({ orderCode: z.string().min(1) }), "params"),
  async (req, res, next) => {
    try {
      return ok(res, await retryShopPayment(customerId(req), param(req, "orderCode")));
    } catch (err) {
      return next(err);
    }
  },
);

accountOrdersRouter.post(
  "/:orderCode/cancel-payment",
  validate(z.object({ orderCode: z.string().min(1) }), "params"),
  async (req, res, next) => {
    try {
      const order = await getOrderForUser(customerId(req), param(req, "orderCode"));
      await markOrderPaymentCancelled(order.id);
      return ok(res, await getOrderForUser(customerId(req), param(req, "orderCode")));
    } catch (err) {
      return next(err);
    }
  },
);

accountOrdersRouter.post(
  "/:orderCode/reorder",
  validate(z.object({ orderCode: z.string().min(1) }), "params"),
  async (req, res, next) => {
    try {
      return ok(res, await reorderFromOrder(customerId(req), param(req, "orderCode")));
    } catch (err) {
      return next(err);
    }
  },
);

export const adminOrdersRouter = Router();
adminOrdersRouter.use(
  require("../../middleware/auth").requireAdmin,
  require("../../middleware/auth").requireRoles("SUPER_ADMIN", "OPERATIONS")
);

adminOrdersRouter.get(
  "/",
  validate(paginationQuerySchema.extend({
    search: z.string().optional(),
    status: z.enum(["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]).optional(),
    paymentStatus: z.enum(["NOT_REQUIRED", "PENDING", "PAID", "FAILED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"]).optional(),
    followUp: z.enum(["NOT_REQUIRED", "REQUIRED", "CONTACTED", "CONFIRMED", "COMPLETED", "REQUIRED_ANY"]).optional(),
    registryId: z.string().optional(),
    registryOnly: z.enum(["true", "false"]).optional(),
    shopOnly: z.enum(["true", "false"]).optional(),
    packageOnly: z.enum(["true", "false"]).optional(),
  }), "query"),
  async (req, res, next) => {
    try {
      const { adminListOrders } = require("./orders.service");
      const q = req.query as { registryOnly?: string; shopOnly?: string; packageOnly?: string };
      const result = await adminListOrders({
        ...req.query,
        registryOnly: q.registryOnly === "true",
        shopOnly: q.shopOnly === "true",
        packageOnly: q.packageOnly === "true",
      });
      return ok(res, result);
    } catch (err) {
      return next(err);
    }
  }
);

adminOrdersRouter.get(
  "/:id",
  validate(z.object({ id: z.string() }), "params"),
  async (req, res, next) => {
    try {
      const { adminGetOrder } = require("./orders.service");
      return ok(res, await adminGetOrder(param(req, "id")));
    } catch (err) {
      return next(err);
    }
  }
);

adminOrdersRouter.patch(
  "/:id/items/:itemId/fulfillment",
  validate(z.object({ id: z.string(), itemId: z.string() }), "params"),
  validate(z.object({ status: z.string().nullable() }), "body"),
  async (req, res, next) => {
    try {
      const { adminUpdateOrderItemFulfillment } = require("./orders.service");
      return ok(res, await adminUpdateOrderItemFulfillment(param(req, "id"), param(req, "itemId"), req.body.status));
    } catch (err) {
      return next(err);
    }
  }
);

adminOrdersRouter.patch(
  "/:id/status",
  validate(z.object({ id: z.string() }), "params"),
  validate(z.object({ status: z.enum(["PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]) }), "body"),
  async (req, res, next) => {
    try {
      const { adminUpdateOrderStatus } = require("./orders.service");
      return ok(res, await adminUpdateOrderStatus(param(req, "id"), req.body.status));
    } catch (err) {
      return next(err);
    }
  },
);

adminOrdersRouter.patch(
  "/:id/ops",
  validate(z.object({ id: z.string() }), "params"),
  validate(
    z.object({
      customizationFollowUpStatus: z.enum(["NOT_REQUIRED", "REQUIRED", "CONTACTED", "CONFIRMED", "COMPLETED"]).optional(),
      adminNotes: z.string().optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const { adminUpdateOrderOps } = require("./orders.service");
      return ok(res, await adminUpdateOrderOps(param(req, "id"), req.body));
    } catch (err) {
      return next(err);
    }
  },
);
