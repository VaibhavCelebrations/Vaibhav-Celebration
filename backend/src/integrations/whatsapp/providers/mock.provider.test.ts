import { describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { MockWhatsAppProvider } from "./mock.provider";

describe("MockWhatsAppProvider", () => {
  it("never calls fetch / makes a real network request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const provider = new MockWhatsAppProvider();
    await provider.sendTemplateMessage({ toPhoneE164: "919876543210", templateName: "order_confirmation", languageCode: "en", bodyParameters: ["VBC-1"] });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("returns a SIMULATED_SENT status distinct from any real Meta status", async () => {
    const provider = new MockWhatsAppProvider();
    const outcome = await provider.sendTemplateMessage({ toPhoneE164: "919876543210", templateName: "order_confirmation", languageCode: "en", bodyParameters: ["VBC-1"] });
    expect(outcome.status).toBe("SIMULATED_SENT");
  });

  it("generates a mock_-prefixed message id so it can never be mistaken for a real Meta id", async () => {
    const provider = new MockWhatsAppProvider();
    const outcome = await provider.sendTemplateMessage({ toPhoneE164: "919876543210", templateName: "order_confirmation", languageCode: "en", bodyParameters: ["VBC-1"] });
    expect(outcome.providerMessageId).toMatch(/^mock_/);
  });

  it("supports the document-template path the same way", async () => {
    const provider = new MockWhatsAppProvider();
    const outcome = await provider.sendDocumentTemplateMessage({
      toPhoneE164: "919876543210",
      templateName: "invoice_delivery",
      languageCode: "en",
      bodyParameters: ["INV-1", "100.00"],
      document: { url: "https://example.com/invoice.pdf", filename: "invoice.pdf" },
    });
    expect(outcome.status).toBe("SIMULATED_SENT");
    expect(outcome.providerMessageId).toMatch(/^mock_/);
  });
});
