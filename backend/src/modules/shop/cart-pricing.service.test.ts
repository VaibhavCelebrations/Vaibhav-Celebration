import { describe, expect, it, vi } from "vitest";
import { computeQuote } from "./cart-pricing.service";
import { gstOn } from "../../lib/settings";

vi.mock("../../lib/settings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/settings")>();
  return {
    ...actual,
    getGstPercent: async () => 18,
  };
});

describe("gstOn", () => {
  it("rounds GST on paise", () => {
    expect(gstOn(10000, 18)).toBe(1800);
  });
});

describe("computeQuote", () => {
  it("includes personalization in the taxable subtotal", async () => {
    const quote = await computeQuote([
      { productId: "a", unitPriceInPaise: 10_000, quantity: 2, personalizationCostInPaise: 2_000 },
      { productId: "b", unitPriceInPaise: 5_000, quantity: 1 },
    ]);
    expect(quote.subtotalInPaise).toBe(29_000);
    expect(quote.gstInPaise).toBe(gstOn(29_000, 18));
    expect(quote.totalInPaise).toBe(quote.subtotalInPaise + quote.gstInPaise);
    expect(quote.lines[0]?.lineTotalInPaise).toBe(24_000);
  });

  it("does not trust omitted personalization as a charge", async () => {
    const quote = await computeQuote([{ productId: "a", unitPriceInPaise: 1000, quantity: 1 }]);
    expect(quote.lines[0]?.personalizationCostInPaise).toBe(0);
    expect(quote.subtotalInPaise).toBe(1000);
  });
});
