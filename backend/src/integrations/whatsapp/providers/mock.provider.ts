import crypto from "crypto";
import { logger } from "../../../lib/logger";
import type { SendTemplateMessageInput, WhatsAppProvider, WhatsAppSendOutcome } from "../provider.types";

/**
 * Simulates WhatsApp sends for local development, CI, and tests — no
 * network call is ever made. The returned status is intentionally
 * `"SENT"` (a real, valid application status) but the providerMessageId is
 * always prefixed `mock_` and every log line is tagged `simulated: true`, so
 * a simulated send can never be mistaken for a real Meta delivery when
 * inspecting the database or logs.
 */
export class MockWhatsAppProvider implements WhatsAppProvider {
  readonly name = "mock" as const;

  async sendTemplateMessage(input: Omit<SendTemplateMessageInput, "document">): Promise<WhatsAppSendOutcome> {
    return this.simulateSend(input);
  }

  async sendDocumentTemplateMessage(input: SendTemplateMessageInput): Promise<WhatsAppSendOutcome> {
    return this.simulateSend(input);
  }

  private simulateSend(input: Partial<SendTemplateMessageInput>): WhatsAppSendOutcome {
    const providerMessageId = `mock_${crypto.randomUUID()}`;
    logger.info(
      {
        simulated: true,
        provider: "mock",
        to: input.toPhoneE164,
        template: input.templateName,
        hasDocument: Boolean(input.document),
        mockMessageId: providerMessageId,
      },
      "WhatsApp send simulated (mock provider) — no real message was sent",
    );
    return { status: "SIMULATED_SENT", providerMessageId };
  }
}
