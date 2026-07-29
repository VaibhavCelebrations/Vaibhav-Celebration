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
export declare function sendWhatsAppMessage(input: {
    toPhone: string;
    templateName: string;
    body: string;
    mediaUrl?: string;
}): Promise<WhatsAppSendResult>;
