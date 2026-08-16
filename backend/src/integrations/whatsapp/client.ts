import crypto from "crypto";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import type { NotificationResult } from "../notifications/types";

export type WhatsAppSendResult = NotificationResult & {
  providerMessageId?: string;
};

export const WHATSAPP_TEMPLATES = {
  orderConfirmation: "order_confirmation",
  invoiceDelivery: "invoice_delivery",
} as const;

/** India-first E.164 digits: 10-digit local → 91XXXXXXXXXX */
export function normalizeWhatsAppPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  if (digits.length >= 8 && digits.length <= 15) return digits;
  return null;
}

function graphUrl(path: string) {
  const version = env.WHATSAPP_META_API_VERSION || "v21.0";
  return `https://graph.facebook.com/${version}/${path.replace(/^\//, "")}`;
}

function isMetaConfigured() {
  return Boolean(
    env.WHATSAPP_ENABLED &&
      env.WHATSAPP_PROVIDER === "meta" &&
      env.WHATSAPP_META_ACCESS_TOKEN &&
      env.WHATSAPP_META_PHONE_NUMBER_ID,
  );
}

export async function sendWhatsAppMessage(input: {
  toPhone: string;
  templateName: string;
  body: string;
  mediaUrl?: string;
  bodyParameters?: string[];
}): Promise<WhatsAppSendResult> {
  if (!env.WHATSAPP_ENABLED || env.WHATSAPP_PROVIDER === "none") {
    logger.info({ template: input.templateName }, "WhatsApp skipped — disabled");
    return { channel: "whatsapp", sent: false, skipped: true, status: "SKIPPED" };
  }

  if (env.WHATSAPP_PROVIDER !== "meta" || !isMetaConfigured()) {
    logger.warn({ template: input.templateName }, "WhatsApp skipped — Meta Cloud API not configured");
    return { channel: "whatsapp", sent: false, skipped: true, status: "SKIPPED" };
  }

  const to = normalizeWhatsAppPhone(input.toPhone);
  if (!to) {
    return { channel: "whatsapp", sent: false, status: "FAILED", error: "invalid_phone" };
  }

  const parameters = (input.bodyParameters?.length
    ? input.bodyParameters
    : [input.body]
  ).map((text) => ({ type: "text" as const, text: String(text).slice(0, 1024) }));

  const template: Record<string, unknown> = {
    name: input.templateName,
    language: { code: "en" },
    components: [{ type: "body", parameters }],
  };

  if (input.mediaUrl) {
    (template.components as unknown[]).unshift({
      type: "header",
      parameters: [{ type: "document", document: { link: input.mediaUrl, filename: "invoice.pdf" } }],
    });
  }

  try {
    const res = await fetch(graphUrl(`${env.WHATSAPP_META_PHONE_NUMBER_ID}/messages`), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_META_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template,
      }),
    });
    const json = (await res.json()) as {
      messages?: Array<{ id: string }>;
      error?: { message?: string };
    };
    if (!res.ok) {
      logger.error({ status: res.status, error: json.error?.message }, "WhatsApp Meta send failed");
      return {
        channel: "whatsapp",
        sent: false,
        status: "FAILED",
        error: json.error?.message ?? `http_${res.status}`,
      };
    }
    const providerMessageId = json.messages?.[0]?.id;
    return { channel: "whatsapp", sent: true, status: "SENT", providerMessageId };
  } catch (error) {
    logger.error({ err: error }, "WhatsApp Meta send threw");
    return {
      channel: "whatsapp",
      sent: false,
      status: "FAILED",
      error: error instanceof Error ? error.message : "send_failed",
    };
  }
}

export function verifyMetaWebhookSignature(rawBody: string, signatureHeader: string | undefined): boolean {
  if (!env.WHATSAPP_APP_SECRET) {
    return env.NODE_ENV !== "production";
  }
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", env.WHATSAPP_APP_SECRET).update(rawBody).digest("hex");
  const received = signatureHeader.slice("sha256=".length);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  } catch {
    return false;
  }
}

export type MetaStatusUpdate = {
  providerMessageId: string;
  status: "SENT" | "DELIVERED" | "READ" | "FAILED";
};

export function parseMetaStatusUpdates(payload: unknown): MetaStatusUpdate[] {
  const root = payload as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          statuses?: Array<{ id: string; status: string }>;
        };
      }>;
    }>;
  };
  const out: MetaStatusUpdate[] = [];
  for (const entry of root.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const status of change.value?.statuses ?? []) {
        const mapped =
          status.status === "delivered"
            ? "DELIVERED"
            : status.status === "read"
              ? "READ"
              : status.status === "failed"
                ? "FAILED"
                : "SENT";
        out.push({ providerMessageId: status.id, status: mapped });
      }
    }
  }
  return out;
}
