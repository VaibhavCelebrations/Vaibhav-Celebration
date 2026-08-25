"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = __importDefault(require("node:crypto"));
const vitest_1 = require("vitest");
vitest_1.vi.mock("../../config/env", () => ({
    env: {
        NODE_ENV: "test",
        RAZORPAY_KEY_SECRET: "test_secret_key",
        RAZORPAY_WEBHOOK_SECRET: "whsec_test",
    },
}));
vitest_1.vi.mock("../../lib/logger", () => ({
    logger: { warn: vitest_1.vi.fn(), error: vitest_1.vi.fn(), info: vitest_1.vi.fn() },
}));
const client_1 = require("./client");
(0, vitest_1.describe)("Razorpay signature verification", () => {
    (0, vitest_1.it)("accepts a valid checkout HMAC", () => {
        const razorpayOrderId = "order_abc";
        const razorpayPaymentId = "pay_xyz";
        const razorpaySignature = node_crypto_1.default
            .createHmac("sha256", "test_secret_key")
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest("hex");
        (0, vitest_1.expect)((0, client_1.verifyCheckoutPaymentSignature)({ razorpayOrderId, razorpayPaymentId, razorpaySignature })).toBe(true);
    });
    (0, vitest_1.it)("rejects a tampered checkout signature", () => {
        (0, vitest_1.expect)((0, client_1.verifyCheckoutPaymentSignature)({
            razorpayOrderId: "order_abc",
            razorpayPaymentId: "pay_xyz",
            razorpaySignature: "deadbeef",
        })).toBe(false);
    });
    (0, vitest_1.it)("accepts mock checkout orders without HMAC", () => {
        (0, vitest_1.expect)((0, client_1.verifyCheckoutPaymentSignature)({
            razorpayOrderId: "order_mock_1",
            razorpayPaymentId: "pay_1",
            razorpaySignature: "anything",
        })).toBe(true);
    });
    (0, vitest_1.it)("accepts a valid webhook HMAC", () => {
        const rawBody = JSON.stringify({ event: "payment.captured" });
        const signature = node_crypto_1.default.createHmac("sha256", "whsec_test").update(rawBody).digest("hex");
        (0, vitest_1.expect)((0, client_1.verifyWebhookSignature)(rawBody, signature)).toBe(true);
    });
});
//# sourceMappingURL=client.test.js.map