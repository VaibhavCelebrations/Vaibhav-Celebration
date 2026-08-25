"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WHATSAPP_TEMPLATES = void 0;
exports.normalizeWhatsAppPhone = normalizeWhatsAppPhone;
exports.sendWhatsAppMessage = sendWhatsAppMessage;
exports.verifyMetaWebhookSignature = verifyMetaWebhookSignature;
exports.parseMetaStatusUpdates = parseMetaStatusUpdates;
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../../config/env");
const logger_1 = require("../../lib/logger");
exports.WHATSAPP_TEMPLATES = {
    orderConfirmation: "order_confirmation",
    invoiceDelivery: "invoice_delivery",
};
/** India-first E.164 digits: 10-digit local → 91XXXXXXXXXX */
function normalizeWhatsAppPhone(raw) {
    const digits = raw.replace(/\D/g, "");
    if (!digits)
        return null;
    if (digits.length === 10)
        return `91${digits}`;
    if (digits.length === 12 && digits.startsWith("91"))
        return digits;
    if (digits.length === 11 && digits.startsWith("0"))
        return `91${digits.slice(1)}`;
    if (digits.length >= 8 && digits.length <= 15)
        return digits;
    return null;
}
function graphUrl(path) {
    const version = env_1.env.WHATSAPP_META_API_VERSION || "v21.0";
    return `https://graph.facebook.com/${version}/${path.replace(/^\//, "")}`;
}
function isMetaConfigured() {
    return Boolean(env_1.env.WHATSAPP_ENABLED &&
        env_1.env.WHATSAPP_PROVIDER === "meta" &&
        env_1.env.WHATSAPP_META_ACCESS_TOKEN &&
        env_1.env.WHATSAPP_META_PHONE_NUMBER_ID);
}
async function sendWhatsAppMessage(input) {
    if (!env_1.env.WHATSAPP_ENABLED || env_1.env.WHATSAPP_PROVIDER === "none") {
        logger_1.logger.info({ template: input.templateName }, "WhatsApp skipped — disabled");
        return { channel: "whatsapp", sent: false, skipped: true, status: "SKIPPED" };
    }
    if (env_1.env.WHATSAPP_PROVIDER !== "meta" || !isMetaConfigured()) {
        logger_1.logger.warn({ template: input.templateName }, "WhatsApp skipped — Meta Cloud API not configured");
        return { channel: "whatsapp", sent: false, skipped: true, status: "SKIPPED" };
    }
    const to = normalizeWhatsAppPhone(input.toPhone);
    if (!to) {
        return { channel: "whatsapp", sent: false, status: "FAILED", error: "invalid_phone" };
    }
    const parameters = (input.bodyParameters?.length
        ? input.bodyParameters
        : [input.body]).map((text) => ({ type: "text", text: String(text).slice(0, 1024) }));
    const template = {
        name: input.templateName,
        language: { code: "en" },
        components: [{ type: "body", parameters }],
    };
    if (input.mediaUrl) {
        template.components.unshift({
            type: "header",
            parameters: [{ type: "document", document: { link: input.mediaUrl, filename: "invoice.pdf" } }],
        });
    }
    try {
        const res = await fetch(graphUrl(`${env_1.env.WHATSAPP_META_PHONE_NUMBER_ID}/messages`), {
            method: "POST",
            headers: {
                Authorization: `Bearer ${env_1.env.WHATSAPP_META_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to,
                type: "template",
                template,
            }),
        });
        const json = (await res.json());
        if (!res.ok) {
            logger_1.logger.error({ status: res.status, error: json.error?.message }, "WhatsApp Meta send failed");
            return {
                channel: "whatsapp",
                sent: false,
                status: "FAILED",
                error: json.error?.message ?? `http_${res.status}`,
            };
        }
        const providerMessageId = json.messages?.[0]?.id;
        return { channel: "whatsapp", sent: true, status: "SENT", providerMessageId };
    }
    catch (error) {
        logger_1.logger.error({ err: error }, "WhatsApp Meta send threw");
        return {
            channel: "whatsapp",
            sent: false,
            status: "FAILED",
            error: error instanceof Error ? error.message : "send_failed",
        };
    }
}
function verifyMetaWebhookSignature(rawBody, signatureHeader) {
    if (!env_1.env.WHATSAPP_APP_SECRET) {
        return env_1.env.NODE_ENV !== "production";
    }
    if (!signatureHeader?.startsWith("sha256="))
        return false;
    const expected = crypto_1.default.createHmac("sha256", env_1.env.WHATSAPP_APP_SECRET).update(rawBody).digest("hex");
    const received = signatureHeader.slice("sha256=".length);
    try {
        return crypto_1.default.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
    }
    catch {
        return false;
    }
}
function parseMetaStatusUpdates(payload) {
    const root = payload;
    const out = [];
    for (const entry of root.entry ?? []) {
        for (const change of entry.changes ?? []) {
            for (const status of change.value?.statuses ?? []) {
                const mapped = status.status === "delivered"
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
//# sourceMappingURL=client.js.map