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
    order: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    invoice: { findFirst: vi.fn(), update: vi.fn() },
  },
}));

import { parseAndVerifyWebhookPost, parseMetaStatusUpdates, verifyWebhookChallenge } from "./whatsapp.service";

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
  it("extracts status updates from a well-formed payload", () => {
    const payload = {
      entry: [{ changes: [{ value: { statuses: [{ id: "wamid.1", status: "delivered" }, { id: "wamid.2", status: "read" }] } }] }],
    };
    expect(parseMetaStatusUpdates(payload)).toEqual([
      { providerMessageId: "wamid.1", status: "DELIVERED" },
      { providerMessageId: "wamid.2", status: "READ" },
    ]);
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
    expect(parseMetaStatusUpdates(payload)).toEqual([{ providerMessageId: "wamid.ok", status: "SENT" }]);
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
    expect(result).toEqual({ signatureValid: true, malformed: false, updates: [{ providerMessageId: "wamid.1", status: "SENT" }] });
  });

  it("accepts a valid signature over malformed (non-JSON) body — answers 200-able, not a throw", () => {
    const rawBody = "{not valid json";
    const signature = "sha256=" + crypto.createHmac("sha256", envMock.WHATSAPP_APP_SECRET).update(rawBody).digest("hex");
    const result = parseAndVerifyWebhookPost(rawBody, signature);
    expect(result).toEqual({ signatureValid: true, malformed: true });
  });
});
