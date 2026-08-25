"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRazorpayOrder = createRazorpayOrder;
exports.verifyWebhookSignature = verifyWebhookSignature;
exports.verifyCheckoutPaymentSignature = verifyCheckoutPaymentSignature;
exports.getRazorpayPublicKey = getRazorpayPublicKey;
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../../config/env");
const errors_1 = require("../../lib/errors");
const logger_1 = require("../../lib/logger");
function hasRealRazorpayKeys() {
    const id = env_1.env.RAZORPAY_KEY_ID ?? "";
    const secret = env_1.env.RAZORPAY_KEY_SECRET ?? "";
    if (!id || !secret)
        return false;
    // Treat example/placeholder values as unset so local/dev still works
    if (id.includes("xxxx") || secret.includes("xxxx"))
        return false;
    if (id.includes("your_") || secret.includes("your_"))
        return false;
    return true;
}
/**
 * Razorpay adapter. When keys are missing/placeholder (local/dev), returns a deterministic mock order
 * so booking/checkout flows remain testable without live credentials.
 */
async function createRazorpayOrder(input) {
    if (!hasRealRazorpayKeys()) {
        const id = `order_mock_${input.receipt.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20)}_${Date.now()}`;
        logger_1.logger.warn({ receipt: input.receipt }, "Razorpay mock order — keys not configured");
        return {
            id,
            amount: input.amountInPaise,
            currency: "INR",
            receipt: input.receipt,
            mock: true,
        };
    }
    const auth = Buffer.from(`${env_1.env.RAZORPAY_KEY_ID}:${env_1.env.RAZORPAY_KEY_SECRET}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            amount: input.amountInPaise,
            currency: "INR",
            receipt: input.receipt.slice(0, 40),
            notes: input.notes,
        }),
    });
    if (!res.ok) {
        const text = await res.text();
        logger_1.logger.error({ status: res.status, text }, "Razorpay order creation failed");
        throw new errors_1.AppError("PAYMENT_ORDER_FAILED", "Unable to create payment order", 502);
    }
    const data = (await res.json());
    return { ...data, mock: false };
}
function verifyWebhookSignature(rawBody, signature) {
    if (!env_1.env.RAZORPAY_WEBHOOK_SECRET) {
        if (env_1.env.NODE_ENV !== "production") {
            logger_1.logger.warn("Razorpay webhook signature skipped — WEBHOOK_SECRET unset");
            return true;
        }
        return false;
    }
    if (!signature)
        return false;
    const expected = crypto_1.default
        .createHmac("sha256", env_1.env.RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest("hex");
    try {
        return crypto_1.default.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    }
    catch {
        return false;
    }
}
/**
 * Checkout.js handler payload: HMAC-SHA256(order_id|payment_id, KEY_SECRET).
 * Mock orders (dev) skip cryptographic verification.
 */
function verifyCheckoutPaymentSignature(input) {
    if (input.razorpayOrderId.startsWith("order_mock_")) {
        return true;
    }
    const secret = env_1.env.RAZORPAY_KEY_SECRET ?? "";
    if (!secret || secret.includes("xxxx") || secret.includes("your_")) {
        return env_1.env.NODE_ENV !== "production";
    }
    const payload = `${input.razorpayOrderId}|${input.razorpayPaymentId}`;
    const expected = crypto_1.default.createHmac("sha256", secret).update(payload).digest("hex");
    try {
        return crypto_1.default.timingSafeEqual(Buffer.from(expected), Buffer.from(input.razorpaySignature));
    }
    catch {
        return false;
    }
}
function getRazorpayPublicKey() {
    return env_1.env.RAZORPAY_KEY_ID ?? null;
}
//# sourceMappingURL=client.js.map