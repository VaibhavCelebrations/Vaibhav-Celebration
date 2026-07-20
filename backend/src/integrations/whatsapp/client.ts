import { env } from "../../config/env";
import { logger } from "../../lib/logger";

export type WhatsAppSendResult = {
  sent: boolean;
  skipped?: boolean;
  providerMessageId?: string;
  status?: string;
};

/**
 * Feature-flagged WhatsApp adapter (Document 02 §6.2 / Doc 05 5.1).
 * Swap provider implementation without changing call sites.
 */
export async function sendWhatsAppMessage(input: {
  toPhone: string;
  templateName: string;
  body: string;
  mediaUrl?: string;
}): Promise<WhatsAppSendResult> {
  if (!env.WHATSAPP_ENABLED || env.WHATSAPP_PROVIDER === "none") {
    logger.info(
      { to: input.toPhone, template: input.templateName },
      "WhatsApp skipped — disabled or provider=none",
    );
    return { sent: false, skipped: true, status: "SKIPPED_DISABLED" };
  }

  // Providers wired when credentials land; Phase 1 ships the interface + flag.
  if (env.WHATSAPP_PROVIDER === "twilio") {
    logger.info({ to: input.toPhone }, "WhatsApp Twilio send stub — configure TWILIO_* credentials");
    return { sent: false, skipped: true, status: "SKIPPED_NOT_CONFIGURED" };
  }

  if (env.WHATSAPP_PROVIDER === "meta") {
    logger.info({ to: input.toPhone }, "WhatsApp Meta Cloud API stub — configure Meta tokens");
    return { sent: false, skipped: true, status: "SKIPPED_NOT_CONFIGURED" };
  }

  return { sent: false, skipped: true, status: "SKIPPED_UNKNOWN_PROVIDER" };
}
