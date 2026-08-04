import { Router } from "express";
import { z } from "zod";
import { param } from "../../lib/params";
import { ok } from "../../lib/response";
import { requireCustomer, type CustomerAuthenticatedRequest } from "../../middleware/customer-auth";
import { validate } from "../../middleware/validate";
import { addCartItem, clearCart, getCart, removeCartItem, updateCartItemQuantity } from "./cart.service";
import { addToWishlist, listWishlist, removeFromWishlist } from "./wishlist.service";

function customerId(req: import("express").Request): string {
  return (req as CustomerAuthenticatedRequest).customer!.sub;
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export const cartRouter = Router();
cartRouter.use(requireCustomer);

cartRouter.get("/", async (req, res, next) => {
  try {
    return ok(res, await getCart(customerId(req)));
  } catch (err) {
    return next(err);
  }
});

cartRouter.post(
  "/items",
  validate(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().positive().max(999),
      personalizationValues: z.unknown().optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      return ok(res, await addCartItem(customerId(req), req.body));
    } catch (err) {
      return next(err);
    }
  },
);

cartRouter.patch(
  "/items/:productId",
  validate(z.object({ productId: z.string().min(1) }), "params"),
  validate(z.object({ quantity: z.number().int().nonnegative().max(999) })),
  async (req, res, next) => {
    try {
      return ok(res, await updateCartItemQuantity(customerId(req), param(req, "productId"), req.body.quantity));
    } catch (err) {
      return next(err);
    }
  },
);

cartRouter.delete("/items/:productId", validate(z.object({ productId: z.string().min(1) }), "params"), async (req, res, next) => {
  try {
    return ok(res, await removeCartItem(customerId(req), param(req, "productId")));
  } catch (err) {
    return next(err);
  }
});

cartRouter.delete("/", async (req, res, next) => {
  try {
    return ok(res, await clearCart(customerId(req)));
  } catch (err) {
    return next(err);
  }
});

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export const wishlistRouter = Router();
wishlistRouter.use(requireCustomer);

wishlistRouter.get("/", async (req, res, next) => {
  try {
    return ok(res, await listWishlist(customerId(req)));
  } catch (err) {
    return next(err);
  }
});

wishlistRouter.post("/:productId", validate(z.object({ productId: z.string().min(1) }), "params"), async (req, res, next) => {
  try {
    return ok(res, await addToWishlist(customerId(req), param(req, "productId")));
  } catch (err) {
    return next(err);
  }
});

wishlistRouter.delete("/:productId", validate(z.object({ productId: z.string().min(1) }), "params"), async (req, res, next) => {
  try {
    return ok(res, await removeFromWishlist(customerId(req), param(req, "productId")));
  } catch (err) {
    return next(err);
  }
});
