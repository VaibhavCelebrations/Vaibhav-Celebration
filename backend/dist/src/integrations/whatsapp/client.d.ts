import type { NotificationResult } from "../notifications/types";
export type WhatsAppSendResult = NotificationResult & {
    providerMessageId?: string;
};
export declare const WHATSAPP_TEMPLATES: {
    readonly orderConfirmation: "order_confirmation";
    readonly invoiceDelivery: "invoice_delivery";
};
/** India-first E.164 digits: 10-digit local → 91XXXXXXXXXX */
export declare function normalizeWhatsAppPhone(raw: string): string | null;
export declare function sendWhatsAppMessage(input: {
    toPhone: string;
    templateName: string;
    body: string;
    mediaUrl?: string;
    bodyParameters?: string[];
}): Promise<WhatsAppSendResult>;
export declare function verifyMetaWebhookSignature(rawBody: string, signatureHeader: string | undefined): boolean;
export type MetaStatusUpdate = {
    providerMessageId: string;
    status: "SENT" | "DELIVERED" | "READ" | "FAILED";
};
export declare function parseMetaStatusUpdates(payload: unknown): MetaStatusUpdate[];
