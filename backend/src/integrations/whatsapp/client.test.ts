import { describe, expect, it } from "vitest";
import { normalizeWhatsAppPhone, parseMetaStatusUpdates, verifyMetaWebhookSignature } from "./client";

describe("WhatsApp phone normalization", () => {
  it("prefixes 10-digit Indian numbers with 91", () => {
    expect(normalizeWhatsAppPhone("9876543210")).toBe("919876543210");
  });

  it("strips formatting", () => {
    expect(normalizeWhatsAppPhone("+91 98765-43210")).toBe("919876543210");
  });

  it("rejects empty input", () => {
    expect(normalizeWhatsAppPhone("abc")).toBeNull();
  });
});

describe("Meta webhook signature", () => {
  it("accepts unsigned payloads outside production when secret is unset", () => {
    expect(verifyMetaWebhookSignature("{}", undefined)).toBe(true);
  });
});

describe("Meta status parser", () => {
  it("maps delivered statuses", () => {
    const updates = parseMetaStatusUpdates({
      entry: [{ changes: [{ value: { statuses: [{ id: "wamid.1", status: "delivered" }] } }] }],
    });
    expect(updates).toEqual([{ providerMessageId: "wamid.1", status: "DELIVERED" }]);
  });
});
