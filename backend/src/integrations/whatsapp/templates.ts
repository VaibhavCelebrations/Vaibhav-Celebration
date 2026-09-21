import { env } from "../../config/env";
import type { SendTemplateMessageInput, WhatsAppDocument } from "./provider.types";

/**
 * Centralized WhatsApp template registry. Template names, language codes,
 * and variable ordering live here ONLY — business modules (orders, payments,
 * customer-auth) never reference a raw Meta template name or build a
 * `components` payload themselves. Each of these must exist as an
 * Meta-approved message template before WHATSAPP_PROVIDER=meta is used.
 */
export const WHATSAPP_TEMPLATES = {
  phoneOtpVerification: {
    get name() {
      return env.WHATSAPP_PHONE_OTP_TEMPLATE || "phone_otp_verification";
    },
    languageCode: "en",
  },
  orderConfirmation: { name: "order_confirmation", languageCode: "en" },
  invoiceDelivery: { name: "invoice_delivery", languageCode: "en" },
  welcomeMessage: { name: "welcome_message", languageCode: "en" },
  orderStatusUpdate: { name: "order_status_update", languageCode: "en" },
} as const;

export type WhatsAppTemplateKey = keyof typeof WHATSAPP_TEMPLATES;

type BuiltMessage = Omit<SendTemplateMessageInput, "toPhoneE164">;

/**
 * Meta Authentication template OTP for customer phone verification.
 * Passes the 6-digit OTP as body parameter {{1}}.
 * Supports optional copy-code button component when WHATSAPP_AUTH_HAS_COPY_CODE_BUTTON=true.
 */
export function buildPhoneOtpMessage(otp: string, options?: { hasCopyCodeButton?: boolean }): BuiltMessage {
  const template = WHATSAPP_TEMPLATES.phoneOtpVerification;
  const hasButton = options?.hasCopyCodeButton ?? env.WHATSAPP_AUTH_HAS_COPY_CODE_BUTTON ?? false;

  const buttons = hasButton
    ? [
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: otp }],
        },
      ]
    : undefined;

  return {
    templateName: template.name,
    languageCode: template.languageCode,
    bodyParameters: [otp],
    buttons,
  };
}

export function buildOrderConfirmationMessage(input: {
  orderCode: string;
  amountFormatted: string;
  document?: WhatsAppDocument;
  includeGiftRegistrySetup?: boolean;
  guestLoginUrl?: string;
}): BuiltMessage {
  const template = WHATSAPP_TEMPLATES.orderConfirmation;
  // Meta-approved template order_confirmation has exactly 2 body parameters:
  // {{1}} = orderCode, {{2}} = amountFormatted
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
  trackingUrl?: string | null;
}): BuiltMessage {
  const template = WHATSAPP_TEMPLATES.orderStatusUpdate;
  const statusInfo = WA_STATUS_LABELS[input.status] ?? {
    label: input.status,
    message: "Your order status has been updated.",
  };
  
  let finalMessage = statusInfo.message;
  if (input.trackingUrl && input.status === "SHIPPED") {
    finalMessage += ` Track here: ${input.trackingUrl}`;
  }

  return {
    templateName: template.name,
    languageCode: template.languageCode,
    bodyParameters: [input.customerName, input.orderCode, statusInfo.label, finalMessage],
  };
}
