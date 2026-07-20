import crypto from "crypto";
import { env } from "../../config/env";
import { AppError } from "../../lib/errors";
import { logger } from "../../lib/logger";

type CreateOrderInput = {
  amountInPaise: number;
  receipt: string;
  notes?: Record<string, string>;
};

type CreateOrderResult = {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  mock: boolean;
};

function hasRealRazorpayKeys() {
  const id = env.RAZORPAY_KEY_ID ?? "";
  const secret = env.RAZORPAY_KEY_SECRET ?? "";
  if (!id || !secret) return false;
  // Treat example/placeholder values as unset so local/dev still works
  if (id.includes("xxxx") || secret.includes("xxxx")) return false;
  if (id.includes("your_") || secret.includes("your_")) return false;
  return true;
}

/**
 * Razorpay adapter. When keys are missing/placeholder (local/dev), returns a deterministic mock order
 * so booking/checkout flows remain testable without live credentials.
 */
export async function createRazorpayOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  if (!hasRealRazorpayKeys()) {
    const id = `order_mock_${input.receipt.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20)}_${Date.now()}`;
    logger.warn({ receipt: input.receipt }, "Razorpay mock order — keys not configured");
    return {
      id,
      amount: input.amountInPaise,
      currency: "INR",
      receipt: input.receipt,
      mock: true,
    };
  }

  const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
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
    logger.error({ status: res.status, text }, "Razorpay order creation failed");
    throw new AppError("PAYMENT_ORDER_FAILED", "Unable to create payment order", 502);
  }

  const data = (await res.json()) as {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
  };

  return { ...data, mock: false };
}

export function verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    // Dev-only bypass when webhook secret unset
    if (env.NODE_ENV !== "production") {
      logger.warn("Razorpay webhook signature skipped — WEBHOOK_SECRET unset");
      return true;
    }
    return false;
  }
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function getRazorpayPublicKey() {
  return env.RAZORPAY_KEY_ID ?? null;
}
