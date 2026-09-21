import { describe, expect, it } from "vitest";
import {
  buildInvoiceDeliveryMessage,
  buildOrderConfirmationMessage,
  buildPhoneOtpMessage,
  buildWelcomeMessage,
  WHATSAPP_TEMPLATES,
} from "./templates";

describe("template builders", () => {
  it("phone OTP verification message contains 6-digit OTP code as body parameter", () => {
    const msg = buildPhoneOtpMessage("123456");
    expect(msg.templateName).toBe(WHATSAPP_TEMPLATES.phoneOtpVerification.name);
    expect(msg.bodyParameters).toEqual(["123456"]);
  });

  it("phone OTP verification message includes copy-code button when enabled", () => {
    const msg = buildPhoneOtpMessage("654321", { hasCopyCodeButton: true });
    expect(msg.buttons).toEqual([
      {
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: [{ type: "text", text: "654321" }],
      },
    ]);
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
