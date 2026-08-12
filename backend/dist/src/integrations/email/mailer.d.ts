type MailPayload = {
    to: string;
    subject: string;
    html: string;
    text?: string;
};
export declare function sendEmail(payload: MailPayload): Promise<{
    sent: boolean;
    skipped?: boolean;
}>;
export declare function otpEmailHtml(otp: string, referenceCode: string): string;
export declare function bookingConfirmationHtml(input: {
    bookingCode: string;
    guestName: string;
    eventDate: string;
    themeTitle: string;
    packageTitle: string;
    totalInPaise: number;
}): string;
export declare function invoiceEmailHtml(input: {
    invoiceNumber: string;
    guestName: string;
    totalInPaise: number;
    pdfUrl?: string | null;
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
}): string;
export {};
