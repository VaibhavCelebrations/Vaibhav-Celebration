import { describe, expect, it } from "vitest";
import { envSchema } from "./env";

/** Minimal set of required (non-optional, no-default) vars so we can test WhatsApp-specific fields in isolation. */
const REQUIRED_BASE = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  JWT_ACCESS_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
  JWT_CUSTOMER_ACCESS_SECRET: "c".repeat(32),
};

describe("env WhatsApp configuration", () => {
  it("defaults WHATSAPP_PROVIDER to mock when unset", () => {
    const result = envSchema.safeParse(REQUIRED_BASE);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.WHATSAPP_PROVIDER).toBe("mock");
    }
  });

  it("accepts WHATSAPP_PROVIDER=meta", () => {
    const result = envSchema.safeParse({ ...REQUIRED_BASE, WHATSAPP_PROVIDER: "meta" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.WHATSAPP_PROVIDER).toBe("meta");
  });

  it("rejects an invalid WHATSAPP_PROVIDER value (e.g. the old 'none')", () => {
    const result = envSchema.safeParse({ ...REQUIRED_BASE, WHATSAPP_PROVIDER: "none" });
    expect(result.success).toBe(false);
  });

  it("leaves WHATSAPP_ENABLED false when unset (missing Meta token/phone-number-id/app-secret is not fatal)", () => {
    const result = envSchema.safeParse(REQUIRED_BASE);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.WHATSAPP_ENABLED).toBe(false);
      expect(result.data.WHATSAPP_META_ACCESS_TOKEN).toBeUndefined();
      expect(result.data.WHATSAPP_META_PHONE_NUMBER_ID).toBeUndefined();
      expect(result.data.WHATSAPP_APP_SECRET).toBeUndefined();
    }
  });

  it("transforms WHATSAPP_ENABLED='true' string to boolean true", () => {
    const result = envSchema.safeParse({ ...REQUIRED_BASE, WHATSAPP_ENABLED: "true" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.WHATSAPP_ENABLED).toBe(true);
  });

  it("defaults WHATSAPP_META_API_VERSION to v21.0 when unset", () => {
    const result = envSchema.safeParse(REQUIRED_BASE);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.WHATSAPP_META_API_VERSION).toBe("v21.0");
  });

  it("defaults PHONE_VERIFICATION_TOKEN_TTL_MINUTES to 30", () => {
    const result = envSchema.safeParse(REQUIRED_BASE);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.PHONE_VERIFICATION_TOKEN_TTL_MINUTES).toBe(30);
  });

  it("defaults TEST_WHATSAPP_SEND to false, never true unless explicitly set", () => {
    const result = envSchema.safeParse(REQUIRED_BASE);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.TEST_WHATSAPP_SEND).toBe(false);
  });
});
