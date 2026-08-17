import { describe, expect, it } from "vitest";
import { renderInvoicePdfBuffer } from "./pdf";

describe("letterhead invoice overlay", () => {
  it("produces a PDF using the packaged letterhead", async () => {
    const buf = await renderInvoicePdfBuffer({
      invoiceNumber: "INVOICE-TEST-0001",
      orderCode: "VBC-OR-2026-000001",
      guestName: "Test Guest",
      guestEmail: "guest@example.com",
      guestPhone: "9876543210",
      lineItems: [{ label: "Theme package", amountInPaise: 100000 }],
      subtotalInPaise: 100000,
      gstInPaise: 18000,
      totalInPaise: 118000,
      issuedAt: new Date("2026-08-16"),
    });
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
    expect(buf.length).toBeGreaterThan(1000);
  });
});
