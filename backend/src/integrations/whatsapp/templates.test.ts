import { describe, expect, it } from "vitest";
import {
  buildInvoiceDeliveryMessage,
  buildOrderConfirmationMessage,
  buildPhoneVerificationMessage,
  buildWelcomeMessage,
  WHATSAPP_TEMPLATES,
} from "./templates";

describe("template builders", () => {
  it("phone verification message contains only the opaque link, no PII", () => {
    const msg = buildPhoneVerificationMessage("https://vaibhavcelebrations.in/verify-phone?t=abc123");
    expect(msg.templateName).toBe(WHATSAPP_TEMPLATES.phoneVerification.name);
    expect(msg.bodyParameters).toEqual(["https://vaibhavcelebrations.in/verify-phone?t=abc123"]);
  });

  it("order confirmation message includes orderCode + amount, and an optional document", () => {
    const withoutDoc = buildOrderConfirmationMessage({ orderCode: "VBC-1001", amountFormatted: "1500.00" });
    expect(withoutDoc.bodyParameters).toEqual(["VBC-1001", "1500.00"]);
    expect(withoutDoc.document).toBeUndefined();

    const withDoc = buildOrderConfirmationMessage({
      orderCode: "VBC-1001",
      amountFormatted: "1500.00",
      document: { url: "https://cdn.example.com/inv.pdf", filename: "Invoice-VBC-1001.pdf" },
    });
    expect(withDoc.document?.filename).toBe("Invoice-VBC-1001.pdf");
  });

  it("invoice delivery message includes invoiceNumber + amount", () => {
    const msg = buildInvoiceDeliveryMessage({ invoiceNumber: "INV-2001", amountFormatted: "2500.00" });
    expect(msg.templateName).toBe(WHATSAPP_TEMPLATES.invoiceDelivery.name);
    expect(msg.bodyParameters).toEqual(["INV-2001", "2500.00"]);
  });

  it("welcome message includes the customer's name", () => {
    const msg = buildWelcomeMessage({ name: "Priya" });
    expect(msg.bodyParameters).toEqual(["Priya"]);
  });
});
