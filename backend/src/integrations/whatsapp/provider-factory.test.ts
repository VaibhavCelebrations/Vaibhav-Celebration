import { describe, expect, it, vi, beforeEach } from "vitest";

const envMock = vi.hoisted(() => ({
  WHATSAPP_PROVIDER: "mock" as "meta" | "mock",
  WHATSAPP_META_ACCESS_TOKEN: undefined as string | undefined,
  WHATSAPP_META_PHONE_NUMBER_ID: undefined as string | undefined,
}));

vi.mock("../../config/env", () => ({ env: envMock }));
vi.mock("../../lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { getWhatsAppProvider, isMetaConfigured, resetWhatsAppProviderCache } from "./provider-factory";

describe("getWhatsAppProvider", () => {
  beforeEach(() => {
    resetWhatsAppProviderCache();
    envMock.WHATSAPP_PROVIDER = "mock";
    envMock.WHATSAPP_META_ACCESS_TOKEN = undefined;
    envMock.WHATSAPP_META_PHONE_NUMBER_ID = undefined;
  });

  it("resolves the mock provider when WHATSAPP_PROVIDER=mock", () => {
    expect(getWhatsAppProvider().name).toBe("mock");
  });

  it("resolves the meta provider when configured and WHATSAPP_PROVIDER=meta", () => {
    envMock.WHATSAPP_PROVIDER = "meta";
    envMock.WHATSAPP_META_ACCESS_TOKEN = "token";
    envMock.WHATSAPP_META_PHONE_NUMBER_ID = "phone_id";
    expect(getWhatsAppProvider().name).toBe("meta");
  });

  it("falls back to mock when WHATSAPP_PROVIDER=meta but credentials are incomplete", () => {
    envMock.WHATSAPP_PROVIDER = "meta";
    envMock.WHATSAPP_META_ACCESS_TOKEN = undefined;
    envMock.WHATSAPP_META_PHONE_NUMBER_ID = "phone_id";
    expect(getWhatsAppProvider().name).toBe("mock");
  });

  it("caches the resolved provider across calls until reset", () => {
    const first = getWhatsAppProvider();
    const second = getWhatsAppProvider();
    expect(first).toBe(second);
  });
});

describe("isMetaConfigured", () => {
  beforeEach(() => {
    envMock.WHATSAPP_META_ACCESS_TOKEN = undefined;
    envMock.WHATSAPP_META_PHONE_NUMBER_ID = undefined;
  });

  it("is false when access token is missing", () => {
    envMock.WHATSAPP_META_PHONE_NUMBER_ID = "phone_id";
    expect(isMetaConfigured()).toBe(false);
  });

  it("is false when phone number id is missing", () => {
    envMock.WHATSAPP_META_ACCESS_TOKEN = "token";
    expect(isMetaConfigured()).toBe(false);
  });

  it("is true when both are set", () => {
    envMock.WHATSAPP_META_ACCESS_TOKEN = "token";
    envMock.WHATSAPP_META_PHONE_NUMBER_ID = "phone_id";
    expect(isMetaConfigured()).toBe(true);
  });
});
