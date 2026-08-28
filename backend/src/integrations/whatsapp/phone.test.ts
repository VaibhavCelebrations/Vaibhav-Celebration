import { describe, expect, it } from "vitest";
import { normalizeWhatsAppPhone } from "./phone";

describe("normalizeWhatsAppPhone", () => {
  it("normalizes a 10-digit local number to 91XXXXXXXXXX", () => {
    expect(normalizeWhatsAppPhone("9876543210")).toBe("919876543210");
  });

  it("normalizes a number with spaces/dashes/parens", () => {
    expect(normalizeWhatsAppPhone("+91 98765-43210")).toBe("919876543210");
  });

  it("keeps an already-E.164 12-digit Indian number as-is", () => {
    expect(normalizeWhatsAppPhone("919876543210")).toBe("919876543210");
  });

  it("strips a leading 0 (STD-style) and prefixes 91", () => {
    expect(normalizeWhatsAppPhone("09876543210")).toBe("919876543210");
  });

  it("accepts a plausible international number outside the India-specific rules", () => {
    expect(normalizeWhatsAppPhone("14155552671")).toBe("14155552671");
  });

  it("rejects an empty string", () => {
    expect(normalizeWhatsAppPhone("")).toBeNull();
  });

  it("rejects a too-short number", () => {
    expect(normalizeWhatsAppPhone("12345")).toBeNull();
  });

  it("rejects a too-long number", () => {
    expect(normalizeWhatsAppPhone("1234567890123456")).toBeNull();
  });

  it("rejects non-numeric garbage", () => {
    expect(normalizeWhatsAppPhone("abc-def")).toBeNull();
  });
});
