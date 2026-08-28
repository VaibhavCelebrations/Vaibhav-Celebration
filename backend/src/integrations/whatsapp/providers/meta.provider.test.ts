import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../config/env", () => ({
  env: {
    WHATSAPP_META_API_VERSION: "v21.0",
    WHATSAPP_META_PHONE_NUMBER_ID: "123456",
    WHATSAPP_META_ACCESS_TOKEN: "test_token",
  },
}));

vi.mock("../../../lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { MetaWhatsAppProvider } from "./meta.provider";
import { WhatsAppSendError } from "../errors";

function mockFetchOnce(response: { ok: boolean; status?: number; json: () => Promise<unknown> }) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response as unknown as Response);
}

describe("MetaWhatsAppProvider", () => {
  let provider: MetaWhatsAppProvider;

  beforeEach(() => {
    provider = new MetaWhatsAppProvider();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends a plain template message and returns the real Meta message id", async () => {
    const fetchSpy = mockFetchOnce({ ok: true, status: 200, json: async () => ({ messages: [{ id: "wamid.real123" }] }) });
    const outcome = await provider.sendTemplateMessage({
      toPhoneE164: "919876543210",
      templateName: "order_confirmation",
      languageCode: "en",
      bodyParameters: ["VBC-1", "1000.00"],
    });
    expect(outcome).toEqual({ status: "SENT", providerMessageId: "wamid.real123" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toContain("123456/messages");
    expect(String(url)).not.toContain("undefined");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.to).toBe("919876543210");
    expect(body.template.name).toBe("order_confirmation");
  });

  it("attaches a document header when a document is provided", async () => {
    const fetchSpy = mockFetchOnce({ ok: true, status: 200, json: async () => ({ messages: [{ id: "wamid.doc1" }] }) });
    await provider.sendDocumentTemplateMessage({
      toPhoneE164: "919876543210",
      templateName: "invoice_delivery",
      languageCode: "en",
      bodyParameters: ["INV-1", "500.00"],
      document: { url: "https://example.com/invoice.pdf", filename: "invoice.pdf" },
    });
    const [, init] = fetchSpy.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.template.components[0].type).toBe("header");
    expect(body.template.components[0].parameters[0].document.link).toBe("https://example.com/invoice.pdf");
  });

  it("throws a retryable WhatsAppSendError on a 500 response", async () => {
    mockFetchOnce({ ok: false, status: 500, json: async () => ({ error: { message: "Server error" } }) });
    await expect(
      provider.sendTemplateMessage({ toPhoneE164: "919876543210", templateName: "x", languageCode: "en", bodyParameters: [] }),
    ).rejects.toMatchObject({ retryable: true });
  });

  it("throws a non-retryable WhatsAppSendError on a 400 invalid-parameter response", async () => {
    mockFetchOnce({ ok: false, status: 400, json: async () => ({ error: { message: "Invalid parameter", code: 100 } }) });
    await expect(
      provider.sendTemplateMessage({ toPhoneE164: "919876543210", templateName: "x", languageCode: "en", bodyParameters: [] }),
    ).rejects.toMatchObject({ retryable: false });
  });

  it("throws a retryable error when the response is not valid JSON", async () => {
    mockFetchOnce({ ok: true, status: 200, json: async () => { throw new SyntaxError("Unexpected token"); } });
    await expect(
      provider.sendTemplateMessage({ toPhoneE164: "919876543210", templateName: "x", languageCode: "en", bodyParameters: [] }),
    ).rejects.toBeInstanceOf(WhatsAppSendError);
  });

  it("throws a retryable error when fetch itself rejects (network failure)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("network down"));
    await expect(
      provider.sendTemplateMessage({ toPhoneE164: "919876543210", templateName: "x", languageCode: "en", bodyParameters: [] }),
    ).rejects.toMatchObject({ retryable: true, code: "NETWORK_ERROR" });
  });
});
