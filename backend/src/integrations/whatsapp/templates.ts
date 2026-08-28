import type { SendTemplateMessageInput, WhatsAppDocument } from "./provider.types";

/**
 * Centralized WhatsApp template registry. Template names, language codes,
 * and variable ordering live here ONLY — business modules (orders, payments,
 * customer-auth) never reference a raw Meta template name or build a
 * `components` payload themselves. Each of these must exist as an
 * Meta-approved message template before WHATSAPP_PROVIDER=meta is used.
 */
export const WHATSAPP_TEMPLATES = {
  phoneVerification: { name: "phone_verification", languageCode: "en" },
  orderConfirmation: { name: "order_confirmation", languageCode: "en" },
  invoiceDelivery: { name: "invoice_delivery", languageCode: "en" },
  welcomeMessage: { name: "welcome_message", languageCode: "en" },
} as const;

export type WhatsAppTemplateKey = keyof typeof WHATSAPP_TEMPLATES;

type BuiltMessage = Omit<SendTemplateMessageInput, "toPhoneE164">;

/** Verification link intentionally carries only an opaque token — no name/phone/order data in the URL (see customer-auth phone verification flow). */
export function buildPhoneVerificationMessage(verifyUrl: string): BuiltMessage {
  const template = WHATSAPP_TEMPLATES.phoneVerification;
  return {
    templateName: template.name,
    languageCode: template.languageCode,
    bodyParameters: [verifyUrl],
  };
}

export function buildOrderConfirmationMessage(input: {
  orderCode: string;
  amountFormatted: string;
  document?: WhatsAppDocument;
}): BuiltMessage {
  const template = WHATSAPP_TEMPLATES.orderConfirmation;
  return {
    templateName: template.name,
    languageCode: template.languageCode,
    bodyParameters: [input.orderCode, input.amountFormatted],
    document: input.document,
  };
}

export function buildInvoiceDeliveryMessage(input: {
  invoiceNumber: string;
  amountFormatted: string;
  document?: WhatsAppDocument;
}): BuiltMessage {
  const template = WHATSAPP_TEMPLATES.invoiceDelivery;
  return {
    templateName: template.name,
    languageCode: template.languageCode,
    bodyParameters: [input.invoiceNumber, input.amountFormatted],
    document: input.document,
  };
}

export function buildWelcomeMessage(input: { name: string }): BuiltMessage {
  const template = WHATSAPP_TEMPLATES.welcomeMessage;
  return {
    templateName: template.name,
    languageCode: template.languageCode,
    bodyParameters: [input.name],
  };
}
