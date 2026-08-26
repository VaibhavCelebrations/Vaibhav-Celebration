import { describe, expect, it, vi } from "vitest";
import { computeQuote } from "./cart-pricing.service";
import { gstOn } from "../../lib/settings";

vi.mock("../../lib/settings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/settings")>();
  return {
    ...actual,
    getGstPercent: async () => 18,
    getFreeShippingThresholdInPaise: async () => 299_900,
    getShippingFeeInPaise: async () => 19_900,
    computeShippingForSubtotal: async (subtotalInPaise: number) => {
      const freeShippingThresholdInPaise = 299_900;
      const fee = 19_900;
      const shippingWaived = subtotalInPaise >= freeShippingThresholdInPaise;
      return {
        shippingInPaise: shippingWaived ? 0 : fee,
        shippingWaived,
        freeShippingThresholdInPaise,
        amountUntilFreeShippingInPaise: Math.max(0, freeShippingThresholdInPaise - subtotalInPaise),
      };
    },
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
    expect(quote.shippingInPaise).toBe(19_900);
    expect(quote.shippingWaived).toBe(false);
    expect(quote.gstInPaise).toBe(gstOn(29_000 + 19_900, 18));
    expect(quote.totalInPaise).toBe(quote.subtotalInPaise + quote.shippingInPaise + quote.gstInPaise);
    expect(quote.lines[0]?.lineTotalInPaise).toBe(24_000);
  });

  it("waives shipping when subtotal meets the free-delivery threshold", async () => {
    const quote = await computeQuote([{ productId: "a", unitPriceInPaise: 300_000, quantity: 1 }]);
    expect(quote.shippingWaived).toBe(true);
    expect(quote.shippingInPaise).toBe(0);
    expect(quote.amountUntilFreeShippingInPaise).toBe(0);
    expect(quote.gstInPaise).toBe(gstOn(300_000, 18));
    expect(quote.totalInPaise).toBe(300_000 + quote.gstInPaise);
  });

  it("does not trust omitted personalization as a charge", async () => {
    const quote = await computeQuote([{ productId: "a", unitPriceInPaise: 1000, quantity: 1 }]);
    expect(quote.lines[0]?.personalizationCostInPaise).toBe(0);
    expect(quote.subtotalInPaise).toBe(1000);
  });

  it("includes extra merchandise (event package) in the free-shipping subtotal", async () => {
    const shopOnly = await computeQuote([{ productId: "a", unitPriceInPaise: 50_000, quantity: 1 }]);
    expect(shopOnly.shippingWaived).toBe(false);
    expect(shopOnly.shippingInPaise).toBe(19_900);

    const combined = await computeQuote([{ productId: "a", unitPriceInPaise: 50_000, quantity: 1 }], 260_000);
    expect(combined.subtotalInPaise).toBe(310_000);
    expect(combined.shippingWaived).toBe(true);
    expect(combined.shippingInPaise).toBe(0);
    expect(combined.gstInPaise).toBe(gstOn(310_000, 18));
    expect(combined.totalInPaise).toBe(310_000 + combined.gstInPaise);
  });
});
