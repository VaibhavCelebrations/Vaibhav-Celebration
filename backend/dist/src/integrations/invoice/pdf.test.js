"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const pdf_1 = require("./pdf");
(0, vitest_1.describe)("letterhead invoice overlay", () => {
    (0, vitest_1.it)("produces a PDF using the packaged letterhead", async () => {
        const buf = await (0, pdf_1.renderInvoicePdfBuffer)({
            invoiceNumber: "INVOICE-TEST-0001",
            orderCode: "VBC-OR-2026-000001",
            guestName: "Test Guest",
            guestEmail: "guest@example.com",
            guestPhone: "9876543210",
            lineItems: [{ label: "Theme package", amountInPaise: 100000 }],
            subtotalInPaise: 100000,
            shippingInPaise: 19900,
            shippingWaived: false,
            gstPercent: 18,
            gstInPaise: 21582,
            totalInPaise: 141482,
            issuedAt: new Date("2026-08-16"),
        });
        (0, vitest_1.expect)(buf.subarray(0, 4).toString()).toBe("%PDF");
        (0, vitest_1.expect)(buf.length).toBeGreaterThan(1000);
    });
    (0, vitest_1.it)("renders free shipping on the invoice", async () => {
        const buf = await (0, pdf_1.renderInvoicePdfBuffer)({
            invoiceNumber: "INVOICE-TEST-0002",
            guestName: "Free Ship Guest",
            guestEmail: "guest@example.com",
            guestPhone: "9876543210",
            lineItems: [{ label: "Gift box", amountInPaise: 300000 }],
            subtotalInPaise: 300000,
            shippingInPaise: 0,
            shippingWaived: true,
            gstPercent: 18,
            gstInPaise: 54000,
            totalInPaise: 354000,
            issuedAt: new Date("2026-08-20"),
        });
        (0, vitest_1.expect)(buf.subarray(0, 4).toString()).toBe("%PDF");
    });
});
//# sourceMappingURL=pdf.test.js.map