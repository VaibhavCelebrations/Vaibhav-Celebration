"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWhatsAppMessage = sendWhatsAppMessage;
const env_1 = require("../../config/env");
const logger_1 = require("../../lib/logger");
/**
 * Feature-flagged WhatsApp adapter (Document 02 §6.2 / Doc 05 5.1).
 * Swap provider implementation without changing call sites.
 */
async function sendWhatsAppMessage(input) {
    if (!env_1.env.WHATSAPP_ENABLED || env_1.env.WHATSAPP_PROVIDER === "none") {
        logger_1.logger.info({ to: input.toPhone, template: input.templateName }, "WhatsApp skipped — disabled or provider=none");
        return { sent: false, skipped: true, status: "SKIPPED_DISABLED" };
    }
    // Providers wired when credentials land; Phase 1 ships the interface + flag.
    if (env_1.env.WHATSAPP_PROVIDER === "twilio") {
        logger_1.logger.info({ to: input.toPhone }, "WhatsApp Twilio send stub — configure TWILIO_* credentials");
        return { sent: false, skipped: true, status: "SKIPPED_NOT_CONFIGURED" };
    }
    if (env_1.env.WHATSAPP_PROVIDER === "meta") {
        logger_1.logger.info({ to: input.toPhone }, "WhatsApp Meta Cloud API stub — configure Meta tokens");
        return { sent: false, skipped: true, status: "SKIPPED_NOT_CONFIGURED" };
    }
    return { sent: false, skipped: true, status: "SKIPPED_UNKNOWN_PROVIDER" };
}
//# sourceMappingURL=client.js.map