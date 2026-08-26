import type { NotificationResult } from "../notifications/types";
type MailPayload = {
    to: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: Array<{
        filename: string;
        contentType?: string;
        /** Prefer Buffer content for CDN-hosted PDFs; path is for local files only. */
        content?: Buffer;
        path?: string;
    }>;
};
export declare function isSmtpConfigured(): boolean;
export declare function sendEmail(payload: MailPayload): Promise<NotificationResult>;
export declare function otpEmailHtml(otp: string, referenceCode: string): string;
export declare function invoiceEmailHtml(input: {
    invoiceNumber: string;
    guestName: string;
    totalInPaise: number;
}): string;
export declare function consultationAckHtml(name: string): string;
export declare function welcomeEmailHtml(name: string): string;
export declare function verifyEmailHtml(name: string, verifyUrl: string): string;
/** Reset link validity is enforced server-side by PASSWORD_RESET_TOKEN_TTL_MINUTES (default 10 min). */
export declare function passwordResetEmailHtml(name: string, resetUrl: string, ttlMinutes: number): string;
export declare function passwordChangedEmailHtml(name: string): string;
export declare function orderConfirmationHtml(input: {
    name: string;
    orderCode: string;
    totalInPaise: number;
    items: Array<{
        title: string;
        quantity: number;
    }>;
    invoiceNumber?: string | null;
    customizationFollowUp?: boolean;
}): string;
export {};
