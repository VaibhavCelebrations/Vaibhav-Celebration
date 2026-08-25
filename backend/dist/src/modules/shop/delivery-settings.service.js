"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeliverySettings = getDeliverySettings;
const settings_1 = require("../../lib/settings");
async function getDeliverySettings() {
    const [freeShippingThresholdInPaise, shippingFeeInPaise] = await Promise.all([
        (0, settings_1.getFreeShippingThresholdInPaise)(),
        (0, settings_1.getShippingFeeInPaise)(),
    ]);
    return { freeShippingThresholdInPaise, shippingFeeInPaise };
}
//# sourceMappingURL=delivery-settings.service.js.map