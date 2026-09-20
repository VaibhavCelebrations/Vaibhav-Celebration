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
  includeGiftRegistrySetup?: boolean;
  /** Present for guest checkouts — a link to the login page so the customer can access their new account. */
  guestLoginUrl?: string;
}): BuiltMessage {
  const template = WHATSAPP_TEMPLATES.orderConfirmation;
  const params = [input.orderCode, input.amountFormatted];

  // 3rd body parameter: gift registry instruction or guest login note (mutually exclusive priority)
  if (input.guestLoginUrl) {
    // Guest order: always tell them they have an account — registry info is in the email
    const loginNote = input.includeGiftRegistrySetup
      ? `Your account & Gift Registry setup instructions have been emailed to you. Log in: ${input.guestLoginUrl}`
      : `Your account credentials have been emailed to you. Log in to track your order: ${input.guestLoginUrl}`;
    params.push(loginNote);
  } else if (input.includeGiftRegistrySetup) {
    params.push(`Setup your Gift Registry by logging in: ${process.env.FRONTEND_URL}/account/registries`);
  }

  return {
    templateName: template.name,
    languageCode: template.languageCode,
    bodyParameters: params,
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
