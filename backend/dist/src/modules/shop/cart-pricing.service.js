"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeQuote = computeQuote;
const settings_1 = require("../../lib/settings");
async function computeQuote(lines) {
    const shapedLines = lines.map((l) => ({
        productId: l.productId,
        unitPriceInPaise: l.unitPriceInPaise,
        personalizationCostInPaise: l.personalizationCostInPaise ?? 0,
        quantity: l.quantity,
        lineTotalInPaise: (l.unitPriceInPaise + (l.personalizationCostInPaise ?? 0)) * l.quantity,
    }));
    const subtotalInPaise = shapedLines.reduce((sum, l) => sum + l.lineTotalInPaise, 0);
    const shipping = await (0, settings_1.computeShippingForSubtotal)(subtotalInPaise);
    const gstPercent = await (0, settings_1.getGstPercent)();
    const taxable = subtotalInPaise + shipping.shippingInPaise;
    const gstInPaise = (0, settings_1.gstOn)(taxable, gstPercent);
    return {
        subtotalInPaise,
        shippingInPaise: shipping.shippingInPaise,
        shippingWaived: shipping.shippingWaived,
        freeShippingThresholdInPaise: shipping.freeShippingThresholdInPaise,
        amountUntilFreeShippingInPaise: shipping.amountUntilFreeShippingInPaise,
        gstPercent,
        gstInPaise,
        totalInPaise: taxable + gstInPaise,
        lines: shapedLines,
    };
}
//# sourceMappingURL=cart-pricing.service.js.map