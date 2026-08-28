import crypto from "node:crypto";
import { describe, expect, it, vi, beforeEach } from "vitest";

const envMock = vi.hoisted(() => ({
  NODE_ENV: "test" as string,
  WHATSAPP_APP_SECRET: "test_app_secret" as string | undefined,
}));

vi.mock("../../config/env", () => ({ env: envMock }));

import { verifyMetaWebhookSignature } from "./signature";

describe("verifyMetaWebhookSignature", () => {
  beforeEach(() => {
    envMock.NODE_ENV = "test";
    envMock.WHATSAPP_APP_SECRET = "test_app_secret";
  });

  it("accepts a valid HMAC-SHA256 signature", () => {
    const rawBody = JSON.stringify({ entry: [] });
    const signature = "sha256=" + crypto.createHmac("sha256", "test_app_secret").update(rawBody).digest("hex");
    expect(verifyMetaWebhookSignature(rawBody, signature)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const rawBody = JSON.stringify({ entry: [] });
    const signature = "sha256=" + crypto.createHmac("sha256", "test_app_secret").update(rawBody).digest("hex");
    expect(verifyMetaWebhookSignature(JSON.stringify({ entry: ["tampered"] }), signature)).toBe(false);
  });

  it("rejects a missing signature header", () => {
    expect(verifyMetaWebhookSignature("{}", undefined)).toBe(false);
  });

  it("rejects a malformed signature header (no sha256= prefix)", () => {
    expect(verifyMetaWebhookSignature("{}", "abcdef")).toBe(false);
  });

  it("rejects a signature of the wrong length without throwing", () => {
    expect(verifyMetaWebhookSignature("{}", "sha256=deadbeef")).toBe(false);
  });

  it("dev bypass: accepts unsigned requests when secret is unset and not production", () => {
    envMock.WHATSAPP_APP_SECRET = undefined;
    envMock.NODE_ENV = "development";
    expect(verifyMetaWebhookSignature("{}", undefined)).toBe(true);
  });

  it("never bypasses in production even when secret is unset", () => {
    envMock.WHATSAPP_APP_SECRET = undefined;
    envMock.NODE_ENV = "production";
    expect(verifyMetaWebhookSignature("{}", undefined)).toBe(false);
  });
});
