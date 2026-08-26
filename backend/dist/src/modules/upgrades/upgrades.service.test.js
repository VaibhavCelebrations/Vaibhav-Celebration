"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const upgrades_service_1 = require("./upgrades.service");
(0, vitest_1.describe)("gift registry package service", () => {
    (0, vitest_1.it)("identifies the gift-registry extra service", () => {
        (0, vitest_1.expect)((0, upgrades_service_1.isGiftRegistryMatrixService)({ slug: "gift-registry" })).toBe(true);
        (0, vitest_1.expect)((0, upgrades_service_1.isGiftRegistryMatrixService)({ category: "GIFT_REGISTRY" })).toBe(true);
        (0, vitest_1.expect)((0, upgrades_service_1.isGiftRegistryMatrixService)({ label: "Gift Registry" })).toBe(true);
        (0, vitest_1.expect)((0, upgrades_service_1.isGiftRegistryMatrixService)({ slug: "digital-invite", label: "Digital Invite" })).toBe(false);
    });
    (0, vitest_1.it)("is included on Signature and Grand, with a fixed ₹500 customize price", () => {
        (0, vitest_1.expect)(upgrades_service_1.GIFT_REGISTRY_ELIGIBLE_SLUGS).toEqual(["premium", "luxe"]);
        (0, vitest_1.expect)(upgrades_service_1.GIFT_REGISTRY_PRICE_IN_PAISE).toBe(50_000);
    });
});
//# sourceMappingURL=upgrades.service.test.js.map