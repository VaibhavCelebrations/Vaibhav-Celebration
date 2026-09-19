import crypto from "node:crypto";
import { describe, expect, it, vi, beforeEach } from "vitest";

const envMock = vi.hoisted(() => ({
  WHATSAPP_ENABLED: false,
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: "test_verify_token",
  WHATSAPP_APP_SECRET: "test_app_secret",
  NODE_ENV: "test",
  WHATSAPP_WELCOME_ENABLED: false,
}));

vi.mock("../../config/env", () => ({ env: envMock }));
vi.mock("../../lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("../../db/prisma", () => ({
  prisma: {
    order: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn() },
    invoice: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    whatsAppWebhookEvent: { create: vi.fn(), update: vi.fn() },
  },
}));

import { prisma } from "../../db/prisma";
import {
  applyWebhookStatusUpdate,
  parseAndVerifyWebhookPost,
  parseMetaStatusUpdates,
  processWhatsAppWebhookUpdates,
  verifyWebhookChallenge,
} from "./whatsapp.service";

describe("verifyWebhookChallenge", () => {
  beforeEach(() => {
    envMock.WHATSAPP_WEBHOOK_VERIFY_TOKEN = "test_verify_token";
  });

  it("succeeds with correct mode + token, echoing the challenge", () => {
    const result = verifyWebhookChallenge({ mode: "subscribe", verifyToken: "test_verify_token", challenge: "1234" });
    expect(result).toEqual({ ok: true, challenge: "1234" });
  });

  it("fails with the wrong verify token", () => {
    expect(verifyWebhookChallenge({ mode: "subscribe", verifyToken: "wrong", challenge: "1234" }).ok).toBe(false);
  });

  it("fails with the wrong mode", () => {
    expect(verifyWebhookChallenge({ mode: "unsubscribe", verifyToken: "test_verify_token", challenge: "1234" }).ok).toBe(false);
  });

  it("fails when the verify token is not configured server-side", () => {
    envMock.WHATSAPP_WEBHOOK_VERIFY_TOKEN = "";
    expect(verifyWebhookChallenge({ mode: "subscribe", verifyToken: "", challenge: "1234" }).ok).toBe(false);
  });
});

describe("parseMetaStatusUpdates", () => {
  it("extracts status updates with timestamp and error details", () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [
                  { id: "wamid.1", status: "delivered", timestamp: "1710000000" },
                  { id: "wamid.2", status: "read", timestamp: "1710000050" },
                  {
                    id: "wamid.3",
                    status: "failed",
                    timestamp: "1710000060",
                    errors: [{ code: 131026, title: "Message Undeliverable", message: "Failed to deliver" }],
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const updates = parseMetaStatusUpdates(payload);
    expect(updates).toHaveLength(3);
    expect(updates[0]).toMatchObject({
      providerMessageId: "wamid.1",
      status: "DELIVERED",
      timestamp: new Date(1710000000000),
    });
    expect(updates[1]).toMatchObject({
      providerMessageId: "wamid.2",
      status: "READ",
      timestamp: new Date(1710000050000),
    });
    expect(updates[2]).toMatchObject({
      providerMessageId: "wamid.3",
      status: "FAILED",
      timestamp: new Date(1710000060000),
      error: "[131026] Message Undeliverable: Failed to deliver",
    });
  });

  it("returns an empty array for null/non-object payloads", () => {
    expect(parseMetaStatusUpdates(null)).toEqual([]);
    expect(parseMetaStatusUpdates("not an object")).toEqual([]);
    expect(parseMetaStatusUpdates(42)).toEqual([]);
  });

  it("returns an empty array when entry/changes/statuses are missing or malformed", () => {
    expect(parseMetaStatusUpdates({})).toEqual([]);
    expect(parseMetaStatusUpdates({ entry: "not-an-array" })).toEqual([]);
    expect(parseMetaStatusUpdates({ entry: [{ changes: "nope" }] })).toEqual([]);
    expect(parseMetaStatusUpdates({ entry: [{ changes: [{ value: {} }] }] })).toEqual([]);
  });

  it("skips individual malformed status entries without throwing", () => {
    const payload = { entry: [{ changes: [{ value: { statuses: [{ id: 123, status: "sent" }, { status: "sent" }, { id: "wamid.ok", status: "sent" }] } }] }] };
    expect(parseMetaStatusUpdates(payload)).toMatchObject([{ providerMessageId: "wamid.ok", status: "SENT" }]);
  });

  it("ignores an incoming-message event shape (no statuses array) — never throws on unknown event types", () => {
    const payload = { entry: [{ changes: [{ value: { messages: [{ from: "919876543210", text: { body: "hi" } }] } }] }] };
    expect(parseMetaStatusUpdates(payload)).toEqual([]);
  });
});

describe("parseAndVerifyWebhookPost", () => {
  it("rejects an invalid signature", () => {
    const result = parseAndVerifyWebhookPost("{}", "sha256=deadbeef");
    expect(result).toEqual({ signatureValid: false });
  });

  it("accepts a valid signature and parses status updates", () => {
    const payload = { entry: [{ changes: [{ value: { statuses: [{ id: "wamid.1", status: "sent" }] } }] }] };
    const rawBody = JSON.stringify(payload);
    const signature = "sha256=" + crypto.createHmac("sha256", envMock.WHATSAPP_APP_SECRET).update(rawBody).digest("hex");
    const result = parseAndVerifyWebhookPost(rawBody, signature);
    expect(result.signatureValid).toBe(true);
    if (result.signatureValid && !result.malformed) {
      expect(result.updates).toMatchObject([{ providerMessageId: "wamid.1", status: "SENT" }]);
    }
  });

  it("accepts a valid signature over malformed (non-JSON) body — answers 200-able, not a throw", () => {
    const rawBody = "{not valid json";
    const signature = "sha256=" + crypto.createHmac("sha256", envMock.WHATSAPP_APP_SECRET).update(rawBody).digest("hex");
    const result = parseAndVerifyWebhookPost(rawBody, signature);
    expect(result).toEqual({ signatureValid: true, malformed: true });
  });
});

describe("applyWebhookStatusUpdate and processWhatsAppWebhookUpdates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates Order with delivered and read timestamps", async () => {
    const orderMock = {
      id: "ord_1",
      whatsappSendStatus: "SENT",
      whatsappSentAt: new Date("2026-09-19T10:00:00Z"),
      whatsappDeliveredAt: null,
      whatsappReadAt: null,
    };
    vi.mocked(prisma.order.findFirst).mockResolvedValue(orderMock as any);
    vi.mocked(prisma.invoice.findFirst).mockResolvedValue(null);

    const deliveredDate = new Date("2026-09-19T10:01:00Z");
    await applyWebhookStatusUpdate({
      providerMessageId: "wamid.del",
      status: "DELIVERED",
      timestamp: deliveredDate,
    });

    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: "ord_1" },
      data: {
        whatsappSendStatus: "DELIVERED",
        whatsappDeliveredAt: deliveredDate,
      },
    });
  });

  it("updates Order with error details when status is FAILED", async () => {
    const orderMock = {
      id: "ord_2",
      whatsappSendStatus: "SENT",
      whatsappSentAt: new Date("2026-09-19T10:00:00Z"),
      whatsappDeliveredAt: null,
      whatsappReadAt: null,
    };
    vi.mocked(prisma.order.findFirst).mockResolvedValue(orderMock as any);
    vi.mocked(prisma.invoice.findFirst).mockResolvedValue(null);

    await applyWebhookStatusUpdate({
      providerMessageId: "wamid.fail",
      status: "FAILED",
      error: "[131026] Message Undeliverable",
    });

    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: "ord_2" },
      data: {
        whatsappSendStatus: "FAILED",
        whatsappError: "[131026] Message Undeliverable",
      },
    });
  });

  it("deduplicates events in processWhatsAppWebhookUpdates via WhatsAppWebhookEvent", async () => {
    vi.mocked(prisma.whatsAppWebhookEvent.create).mockResolvedValue({ id: "evt_1" } as any);
    vi.mocked(prisma.order.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.invoice.findFirst).mockResolvedValue(null);

    await processWhatsAppWebhookUpdates([
      { providerMessageId: "wamid.dup", status: "DELIVERED" },
    ]);

    expect(prisma.whatsAppWebhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventKey: "status:wamid.dup:DELIVERED",
        providerMessageId: "wamid.dup",
        status: "DELIVERED",
      }),
    });
    expect(prisma.whatsAppWebhookEvent.update).toHaveBeenCalledWith({
      where: { id: "evt_1" },
      data: expect.objectContaining({ processed: true }),
    });
  });
});
