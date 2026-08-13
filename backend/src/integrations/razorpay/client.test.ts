import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../config/env", () => ({
  env: {
    NODE_ENV: "test",
    RAZORPAY_KEY_SECRET: "test_secret_key",
    RAZORPAY_WEBHOOK_SECRET: "whsec_test",
  },
}));

vi.mock("../../lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { verifyCheckoutPaymentSignature, verifyWebhookSignature } from "./client";

describe("Razorpay signature verification", () => {
  it("accepts a valid checkout HMAC", () => {
    const razorpayOrderId = "order_abc";
    const razorpayPaymentId = "pay_xyz";
    const razorpaySignature = crypto
      .createHmac("sha256", "test_secret_key")
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");
    expect(
      verifyCheckoutPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }),
    ).toBe(true);
  });

  it("rejects a tampered checkout signature", () => {
    expect(
      verifyCheckoutPaymentSignature({
        razorpayOrderId: "order_abc",
        razorpayPaymentId: "pay_xyz",
        razorpaySignature: "deadbeef",
      }),
    ).toBe(false);
  });

  it("accepts mock checkout orders without HMAC", () => {
    expect(
      verifyCheckoutPaymentSignature({
        razorpayOrderId: "order_mock_1",
        razorpayPaymentId: "pay_1",
        razorpaySignature: "anything",
      }),
    ).toBe(true);
  });

  it("accepts a valid webhook HMAC", () => {
    const rawBody = JSON.stringify({ event: "payment.captured" });
    const signature = crypto.createHmac("sha256", "whsec_test").update(rawBody).digest("hex");
    expect(verifyWebhookSignature(rawBody, signature)).toBe(true);
  });
});
