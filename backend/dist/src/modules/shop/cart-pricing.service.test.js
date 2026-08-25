"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const cart_pricing_service_1 = require("./cart-pricing.service");
const settings_1 = require("../../lib/settings");
vitest_1.vi.mock("../../lib/settings", async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        getGstPercent: async () => 18,
        getFreeShippingThresholdInPaise: async () => 299_900,
        getShippingFeeInPaise: async () => 19_900,
        computeShippingForSubtotal: async (subtotalInPaise) => {
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
(0, vitest_1.describe)("gstOn", () => {
    (0, vitest_1.it)("rounds GST on paise", () => {
        (0, vitest_1.expect)((0, settings_1.gstOn)(10000, 18)).toBe(1800);
    });
});
(0, vitest_1.describe)("computeQuote", () => {
    (0, vitest_1.it)("includes personalization in the taxable subtotal", async () => {
        const quote = await (0, cart_pricing_service_1.computeQuote)([
            { productId: "a", unitPriceInPaise: 10_000, quantity: 2, personalizationCostInPaise: 2_000 },
            { productId: "b", unitPriceInPaise: 5_000, quantity: 1 },
        ]);
        (0, vitest_1.expect)(quote.subtotalInPaise).toBe(29_000);
        (0, vitest_1.expect)(quote.shippingInPaise).toBe(19_900);
        (0, vitest_1.expect)(quote.shippingWaived).toBe(false);
        (0, vitest_1.expect)(quote.gstInPaise).toBe((0, settings_1.gstOn)(29_000 + 19_900, 18));
        (0, vitest_1.expect)(quote.totalInPaise).toBe(quote.subtotalInPaise + quote.shippingInPaise + quote.gstInPaise);
        (0, vitest_1.expect)(quote.lines[0]?.lineTotalInPaise).toBe(24_000);
    });
    (0, vitest_1.it)("waives shipping when subtotal meets the free-delivery threshold", async () => {
        const quote = await (0, cart_pricing_service_1.computeQuote)([{ productId: "a", unitPriceInPaise: 300_000, quantity: 1 }]);
        (0, vitest_1.expect)(quote.shippingWaived).toBe(true);
        (0, vitest_1.expect)(quote.shippingInPaise).toBe(0);
        (0, vitest_1.expect)(quote.amountUntilFreeShippingInPaise).toBe(0);
        (0, vitest_1.expect)(quote.gstInPaise).toBe((0, settings_1.gstOn)(300_000, 18));
        (0, vitest_1.expect)(quote.totalInPaise).toBe(300_000 + quote.gstInPaise);
    });
    (0, vitest_1.it)("does not trust omitted personalization as a charge", async () => {
        const quote = await (0, cart_pricing_service_1.computeQuote)([{ productId: "a", unitPriceInPaise: 1000, quantity: 1 }]);
        (0, vitest_1.expect)(quote.lines[0]?.personalizationCostInPaise).toBe(0);
        (0, vitest_1.expect)(quote.subtotalInPaise).toBe(1000);
    });
});
//# sourceMappingURL=cart-pricing.service.test.js.map