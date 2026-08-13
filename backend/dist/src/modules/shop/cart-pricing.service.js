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
    const gstPercent = await (0, settings_1.getGstPercent)();
    const gstInPaise = (0, settings_1.gstOn)(subtotalInPaise, gstPercent);
    return {
        subtotalInPaise,
        gstPercent,
        gstInPaise,
        totalInPaise: subtotalInPaise + gstInPaise,
        lines: shapedLines,
    };
}
//# sourceMappingURL=cart-pricing.service.js.map