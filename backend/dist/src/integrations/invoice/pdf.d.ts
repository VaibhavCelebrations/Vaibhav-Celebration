export type InvoicePdfInput = {
    invoiceNumber: string;
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    lineItems: Array<{
        label: string;
        amountInPaise: number;
    }>;
    subtotalInPaise: number;
    gstInPaise: number;
    totalInPaise: number;
    issuedAt: Date;
};
export declare function generateInvoicePdf(input: InvoicePdfInput): Promise<{
    url: string;
    cdnKey: string;
}>;
