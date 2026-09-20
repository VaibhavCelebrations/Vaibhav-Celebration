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
  orderStatusUpdate: { name: "order_status_update", languageCode: "en" },
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

/**
 * Maps an OrderStatus value to a short human-readable label and a brief
 * customer-facing sentence used in the WhatsApp body parameters.
 * Kept in sync with ORDER_STATUS_LABELS in mailer.ts.
 */
const WA_STATUS_LABELS: Record<string, { label: string; message: string }> = {
  PROCESSING: {
    label: "Processing",
    message: "Our team is now preparing your order for dispatch.",
  },
  READY_TO_SHIP: {
    label: "Ready to Ship",
    message: "Your order is packed and will be handed to our courier very soon.",
  },
  SHIPPED: {
    label: "Shipped",
    message: "Your order is on its way! Keep an eye out for the delivery.",
  },
  DELIVERED: {
    label: "Delivered",
    message: "Your order has been successfully delivered. Enjoy!",
  },
  CANCELLED: {
    label: "Cancelled",
    message: "Your order has been cancelled. Contact us if you need assistance.",
  },
  REFUNDED: {
    label: "Refunded",
    message: "Your refund has been initiated and may take 3-7 business days.",
  },
};

/**
 * Builds the order_status_update WhatsApp template message.
 * Body parameters order: [customerName, orderCode, statusLabel, statusMessage]
 */
export function buildOrderStatusUpdateMessage(input: {
  customerName: string;
  orderCode: string;
  status: string;
}): BuiltMessage {
  const template = WHATSAPP_TEMPLATES.orderStatusUpdate;
  const statusInfo = WA_STATUS_LABELS[input.status] ?? {
    label: input.status,
    message: "Your order status has been updated.",
  };
  return {
    templateName: template.name,
    languageCode: template.languageCode,
    bodyParameters: [input.customerName, input.orderCode, statusInfo.label, statusInfo.message],
  };
}
