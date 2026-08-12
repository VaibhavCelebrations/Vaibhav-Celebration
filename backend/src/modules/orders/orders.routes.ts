import { Router } from "express";
import { z } from "zod";
import { param } from "../../lib/params";
import { ok, paginationMeta } from "../../lib/response";
import { requireCustomer, type CustomerAuthenticatedRequest } from "../../middleware/customer-auth";
import { idempotency } from "../../middleware/idempotency";
import { validate } from "../../middleware/validate";
import { paginationQuerySchema } from "../../lib/validators";
import { createOrderFromCart, getCheckoutQuote, getOrderForUser, listOrdersForUser } from "./orders.service";

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

export const adminOrdersRouter = Router();
adminOrdersRouter.use(
  require("../../middleware/auth").requireAdmin,
  require("../../middleware/auth").requireRoles("SUPER_ADMIN", "OPERATIONS")
);

adminOrdersRouter.get(
  "/",
  validate(paginationQuerySchema.extend({
    search: z.string().optional(),
    status: z.enum(["PENDING_PAYMENT", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED", "FAILED"]).optional(),
  }), "query"),
  async (req, res, next) => {
    try {
      const { adminListOrders } = require("./orders.service");
      return ok(res, await adminListOrders(req.query));
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
