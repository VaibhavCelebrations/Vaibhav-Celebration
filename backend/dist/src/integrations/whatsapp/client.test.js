"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const client_1 = require("./client");
(0, vitest_1.describe)("WhatsApp phone normalization", () => {
    (0, vitest_1.it)("prefixes 10-digit Indian numbers with 91", () => {
        (0, vitest_1.expect)((0, client_1.normalizeWhatsAppPhone)("9876543210")).toBe("919876543210");
    });
    (0, vitest_1.it)("strips formatting", () => {
        (0, vitest_1.expect)((0, client_1.normalizeWhatsAppPhone)("+91 98765-43210")).toBe("919876543210");
    });
    (0, vitest_1.it)("rejects empty input", () => {
        (0, vitest_1.expect)((0, client_1.normalizeWhatsAppPhone)("abc")).toBeNull();
    });
});
(0, vitest_1.describe)("Meta webhook signature", () => {
    (0, vitest_1.it)("accepts unsigned payloads outside production when secret is unset", () => {
        (0, vitest_1.expect)((0, client_1.verifyMetaWebhookSignature)("{}", undefined)).toBe(true);
    });
});
(0, vitest_1.describe)("Meta status parser", () => {
    (0, vitest_1.it)("maps delivered statuses", () => {
        const updates = (0, client_1.parseMetaStatusUpdates)({
            entry: [{ changes: [{ value: { statuses: [{ id: "wamid.1", status: "delivered" }] } }] }],
        });
        (0, vitest_1.expect)(updates).toEqual([{ providerMessageId: "wamid.1", status: "DELIVERED" }]);
    });
});
//# sourceMappingURL=client.test.js.map