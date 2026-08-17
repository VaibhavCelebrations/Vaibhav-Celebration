"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wishlistRouter = exports.cartRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const params_1 = require("../../lib/params");
const response_1 = require("../../lib/response");
const customer_auth_1 = require("../../middleware/customer-auth");
const validate_1 = require("../../middleware/validate");
const cart_service_1 = require("./cart.service");
const wishlist_service_1 = require("./wishlist.service");
function customerId(req) {
    return req.customer.sub;
}
// ─── Cart ─────────────────────────────────────────────────────────────────────
exports.cartRouter = (0, express_1.Router)();
exports.cartRouter.use(customer_auth_1.requireCustomer);
exports.cartRouter.get("/", async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, cart_service_1.getCart)(customerId(req)));
    }
    catch (err) {
        return next(err);
    }
});
exports.cartRouter.post("/items", (0, validate_1.validate)(zod_1.z.object({
    productId: zod_1.z.string().min(1),
    quantity: zod_1.z.number().int().positive().max(999),
    personalizationValues: zod_1.z.unknown().optional(),
})), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, cart_service_1.addCartItem)(customerId(req), req.body));
    }
    catch (err) {
        return next(err);
    }
});
exports.cartRouter.patch("/items/:productId", (0, validate_1.validate)(zod_1.z.object({ productId: zod_1.z.string().min(1) }), "params"), (0, validate_1.validate)(zod_1.z.object({ quantity: zod_1.z.number().int().nonnegative().max(999) })), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, cart_service_1.updateCartItemQuantity)(customerId(req), (0, params_1.param)(req, "productId"), req.body.quantity));
    }
    catch (err) {
        return next(err);
    }
});
exports.cartRouter.delete("/items/:productId", (0, validate_1.validate)(zod_1.z.object({ productId: zod_1.z.string().min(1) }), "params"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, cart_service_1.removeCartItem)(customerId(req), (0, params_1.param)(req, "productId")));
    }
    catch (err) {
        return next(err);
    }
});
exports.cartRouter.delete("/", async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, cart_service_1.clearCart)(customerId(req)));
    }
    catch (err) {
        return next(err);
    }
});
// ─── Wishlist ─────────────────────────────────────────────────────────────────
exports.wishlistRouter = (0, express_1.Router)();
exports.wishlistRouter.use(customer_auth_1.requireCustomer);
exports.wishlistRouter.get("/", async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, wishlist_service_1.listWishlist)(customerId(req)));
    }
    catch (err) {
        return next(err);
    }
});
exports.wishlistRouter.post("/:productId", (0, validate_1.validate)(zod_1.z.object({ productId: zod_1.z.string().min(1) }), "params"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, wishlist_service_1.addToWishlist)(customerId(req), (0, params_1.param)(req, "productId")));
    }
    catch (err) {
        return next(err);
    }
});
exports.wishlistRouter.delete("/:productId", (0, validate_1.validate)(zod_1.z.object({ productId: zod_1.z.string().min(1) }), "params"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, wishlist_service_1.removeFromWishlist)(customerId(req), (0, params_1.param)(req, "productId")));
    }
    catch (err) {
        return next(err);
    }
});
//# sourceMappingURL=shop.routes.js.map