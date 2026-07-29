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
export {};
