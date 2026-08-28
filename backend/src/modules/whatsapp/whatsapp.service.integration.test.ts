import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";

/**
 * Integration tests exercise the REAL Prisma client against the dev
 * database (mirrors packages-matrix.test.ts's convention) and the REAL mock
 * provider — only the validated `env` object is mocked (to force
 * WHATSAPP_ENABLED=true / WHATSAPP_PROVIDER=mock deterministically,
 * regardless of the local .env). This does NOT affect the database
 * connection: Prisma reads DATABASE_URL directly from process.env, which
 * dotenv has already populated before this file runs.
 *
 * All rows created here use a per-run unique suffix and are deleted in
 * afterAll, so this is safe to run repeatedly against a shared dev DB.
 */
const envMock = vi.hoisted(() => ({
  WHATSAPP_ENABLED: true,
  WHATSAPP_PROVIDER: "mock" as const,
  WHATSAPP_META_ACCESS_TOKEN: undefined,
  WHATSAPP_META_PHONE_NUMBER_ID: undefined,
  WHATSAPP_META_API_VERSION: "v21.0",
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: "test_verify_token",
  WHATSAPP_APP_SECRET: "test_app_secret",
  WHATSAPP_WELCOME_ENABLED: false,
  NODE_ENV: "test" as const,
}));

vi.mock("../../config/env", () => ({ env: envMock }));
vi.mock("../../lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { prisma } from "../../db/prisma";
import { applyWebhookStatusUpdate, sendInvoiceDeliveryWhatsapp, sendOrderConfirmationWhatsapp } from "./whatsapp.service";

const suffix = `wa_test_${Date.now()}`;
let userId: string;
let orderId: string;
let customerId: string;
let invoiceId: string;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      name: "WhatsApp Test User",
      email: `${suffix}@example.com`,
      passwordHash: "not_a_real_hash",
    },
  });
  userId = user.id;

  const order = await prisma.order.create({
    data: {
      orderCode: `VBC-${suffix}`,
      userId,
      subtotalInPaise: 100000,
      gstInPaise: 18000,
      totalInPaise: 118000,
      shippingAddress: { fullName: "Test", line1: "Test", city: "Jaipur", state: "Rajasthan", pincode: "302001", country: "India" },
      contactEmail: `${suffix}@example.com`,
      contactPhone: "9876543210",
      paymentStatus: "PAID",
      status: "PAID",
    },
  });
  orderId = order.id;

  const customer = await prisma.customer.create({
    data: { fullName: "WhatsApp Test Customer", email: `${suffix}@example.com`, phone: "9876543210" },
  });
  customerId = customer.id;

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: `INV-${suffix}`,
      linkedType: "ORDER",
      customerId,
      subtotalInPaise: 100000,
      gstInPaise: 18000,
      totalInPaise: 118000,
    },
  });
  invoiceId = invoice.id;
});

afterAll(async () => {
  await prisma.invoice.deleteMany({ where: { id: invoiceId } });
  await prisma.customer.deleteMany({ where: { id: customerId } });
  await prisma.order.deleteMany({ where: { id: orderId } });
  await prisma.user.deleteMany({ where: { id: userId } });
});

describe("sendOrderConfirmationWhatsapp (idempotency)", () => {
  it("claims the send and records a SIMULATED_SENT status with a mock message id", async () => {
    const outcome = await sendOrderConfirmationWhatsapp({
      id: orderId,
      orderCode: `VBC-${suffix}`,
      contactPhone: "9876543210",
      totalInPaise: 118000,
    });
    expect("skipped" in outcome).toBe(false);
    if (!("skipped" in outcome)) {
      expect(outcome.sent).toBe(true);
      expect(outcome.status).toBe("SIMULATED_SENT");
      expect(outcome.providerMessageId).toMatch(/^mock_/);
    }

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.whatsappSendStatus).toBe("SIMULATED_SENT");
    expect(order.whatsappMessageId).toMatch(/^mock_/);
  });

  it("skips a second concurrent-style call — only one send happens per order", async () => {
    const outcome = await sendOrderConfirmationWhatsapp({
      id: orderId,
      orderCode: `VBC-${suffix}`,
      contactPhone: "9876543210",
      totalInPaise: 118000,
    });
    expect(outcome).toEqual({ skipped: true });
  });
});

describe("sendInvoiceDeliveryWhatsapp", () => {
  it("sends and returns a SIMULATED_SENT outcome (admin resend — no claim gate)", async () => {
    const outcome = await sendInvoiceDeliveryWhatsapp({
      id: invoiceId,
      invoiceNumber: `INV-${suffix}`,
      totalInPaise: 118000,
      customerPhone: "9876543210",
    });
    expect(outcome.sent).toBe(true);
    expect(outcome.status).toBe("SIMULATED_SENT");
  });
});

describe("applyWebhookStatusUpdate (status monotonicity against real rows)", () => {
  it("advances the Order's status and never regresses it on a later, lower-ranked update", async () => {
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    const providerMessageId = order.whatsappMessageId!;

    await applyWebhookStatusUpdate({ providerMessageId, status: "DELIVERED" });
    let updated = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(updated.whatsappSendStatus).toBe("DELIVERED");

    await applyWebhookStatusUpdate({ providerMessageId, status: "READ" });
    updated = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(updated.whatsappSendStatus).toBe("READ");

    // A late/duplicate "sent" webhook must not regress an already-READ message.
    await applyWebhookStatusUpdate({ providerMessageId, status: "SENT" });
    updated = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(updated.whatsappSendStatus).toBe("READ");
  });

  it("is a no-op (does not throw) when no Order/Invoice matches the providerMessageId", async () => {
    await expect(applyWebhookStatusUpdate({ providerMessageId: "wamid.nonexistent.xyz", status: "SENT" })).resolves.toBeUndefined();
  });
});
