import { env } from "../../../config/env";
import { logger } from "../../../lib/logger";
import { classifyHttpError, classifyNetworkError, malformedResponseError } from "../errors";
import type { SendTemplateMessageInput, WhatsAppProvider, WhatsAppSendOutcome } from "../provider.types";

const REQUEST_TIMEOUT_MS = 10_000;

type MetaMessagesResponse = {
  messages?: Array<{ id: string }>;
  error?: { message?: string; code?: number; type?: string };
};

function graphUrl(path: string): string {
  const version = env.WHATSAPP_META_API_VERSION || "v21.0";
  return `https://graph.facebook.com/${version}/${path.replace(/^\//, "")}`;
}

/**
 * Real Meta WhatsApp Cloud API provider. Always sends from
 * WHATSAPP_META_PHONE_NUMBER_ID (the Meta-issued Phone Number ID) — never
 * WHATSAPP_BUSINESS_NUMBER, which is display-only. The access token is used
 * only in the Authorization header and is never included in any log line.
 */
export class MetaWhatsAppProvider implements WhatsAppProvider {
  readonly name = "meta" as const;

  async sendTemplateMessage(input: Omit<SendTemplateMessageInput, "document">): Promise<WhatsAppSendOutcome> {
    return this.send(input);
  }

  async sendDocumentTemplateMessage(input: SendTemplateMessageInput): Promise<WhatsAppSendOutcome> {
    return this.send(input);
  }

  private async send(input: Partial<SendTemplateMessageInput>): Promise<WhatsAppSendOutcome> {
    const parameters = (input.bodyParameters ?? []).map((text) => ({
      type: "text" as const,
      text: String(text).slice(0, 1024),
    }));

    const components: unknown[] = [{ type: "body", parameters }];
    if (input.document) {
      components.unshift({
        type: "header",
        parameters: [{ type: "document", document: { link: input.document.url, filename: input.document.filename } }],
      });
    }

    const body = {
      messaging_product: "whatsapp",
      to: input.toPhoneE164,
      type: "template",
      template: {
        name: input.templateName,
        language: { code: input.languageCode ?? "en" },
        components,
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const logContext = {
      provider: "meta",
      to: input.toPhoneE164,
      template: input.templateName,
      hasDocument: Boolean(input.document),
      phoneNumberIdConfigured: Boolean(env.WHATSAPP_META_PHONE_NUMBER_ID),
    };

    try {
      const res = await fetch(graphUrl(`${env.WHATSAPP_META_PHONE_NUMBER_ID}/messages`), {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_META_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      let json: MetaMessagesResponse;
      try {
        json = (await res.json()) as MetaMessagesResponse;
      } catch (parseErr) {
        logger.error({ ...logContext, status: res.status }, "WhatsApp Meta response was not valid JSON");
        throw malformedResponseError(parseErr instanceof Error ? parseErr.message : "invalid JSON");
      }

      if (!res.ok) {
        logger.error({ ...logContext, status: res.status, metaError: json.error?.message, metaErrorCode: json.error?.code }, "WhatsApp Meta send failed");
        throw classifyHttpError(res.status, json.error);
      }

      const providerMessageId = json.messages?.[0]?.id;
      if (!providerMessageId) {
        logger.error({ ...logContext, status: res.status }, "WhatsApp Meta response missing message id");
        throw malformedResponseError("missing messages[0].id");
      }

      logger.info({ ...logContext, providerMessageId }, "WhatsApp Meta send succeeded");
      return { status: "SENT", providerMessageId };
    } catch (error) {
      if ((error as { name?: string }).name === "WhatsAppSendError") throw error;
      logger.error({ ...logContext, err: error instanceof Error ? error.message : error }, "WhatsApp Meta send threw");
      throw classifyNetworkError(error);
    } finally {
      clearTimeout(timeout);
    }
  }
}
