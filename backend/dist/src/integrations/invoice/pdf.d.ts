export type InvoicePdfInput = {
    invoiceNumber: string;
    orderCode?: string;
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    lineItems: Array<{
        label: string;
        amountInPaise: number;
    }>;
    subtotalInPaise: number;
    shippingInPaise?: number;
    shippingWaived?: boolean;
    gstPercent?: number;
    gstInPaise: number;
    totalInPaise: number;
    issuedAt: Date;
    paymentStatus?: string;
    paymentMethod?: string;
};
export declare function generateInvoicePdf(input: InvoicePdfInput): Promise<{
    url: string;
    cdnKey: string;
}>;
/** Fetch previously stored invoice PDF bytes for email attachment. */
export declare function fetchInvoicePdfBuffer(pdfUrl: string | null | undefined): Promise<Buffer | null>;
/** Render invoice PDF bytes (also used by tests). */
export declare function renderInvoicePdfBuffer(input: InvoicePdfInput): Promise<Buffer>;
