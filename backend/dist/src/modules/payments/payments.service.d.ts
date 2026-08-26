export declare function createPaymentOrder(input: {
    orderCode?: string;
    eventRegistrationId?: string;
}): Promise<{
    razorpayOrderId: string | null;
    amountInPaise: number;
    razorpayKeyId: string | null;
    alreadyPaid: boolean;
}>;
export declare function handleRazorpayWebhook(rawBody: string, signature: string | undefined): Promise<{
    handled: boolean;
    type?: undefined;
    id?: undefined;
    duplicate?: undefined;
} | {
    handled: boolean;
    type: string;
    id: string;
    duplicate: boolean;
} | {
    handled: boolean;
    duplicate: boolean;
    type?: undefined;
    id?: undefined;
} | {
    handled: boolean;
    type: string;
    id: string;
    duplicate?: undefined;
}>;
export declare function deliverInvoice(invoiceId: string): Promise<{
    id: string;
    deletedAt: Date | null;
    orderId: string | null;
    customerId: string;
    invoiceNumber: string;
    linkedType: import(".prisma/client").$Enums.InvoiceLinkedType;
    subtotalInPaise: number;
    gstInPaise: number;
    totalInPaise: number;
    pdfUrl: string | null;
    emailSentAt: Date | null;
    emailSendStatus: string | null;
    whatsappSentAt: Date | null;
    whatsappSendStatus: string | null;
    whatsappMessageId: string | null;
    issuedAt: Date;
}>;
export declare function listInvoices(filters: {
    search?: string;
    from?: string;
    to?: string;
    customerId?: string;
    page: number;
    pageSize: number;
}): Promise<{
    total: number;
    items: ({
        customer: {
            email: string;
            phone: string;
            fullName: string;
        };
        order: {
            orderCode: string;
        } | null;
    } & {
        id: string;
        deletedAt: Date | null;
        orderId: string | null;
        customerId: string;
        invoiceNumber: string;
        linkedType: import(".prisma/client").$Enums.InvoiceLinkedType;
        subtotalInPaise: number;
        gstInPaise: number;
        totalInPaise: number;
        pdfUrl: string | null;
        emailSentAt: Date | null;
        emailSendStatus: string | null;
        whatsappSentAt: Date | null;
        whatsappSendStatus: string | null;
        whatsappMessageId: string | null;
        issuedAt: Date;
    })[];
}>;
export declare function getInvoiceByNumber(invoiceNumber: string): Promise<{
    customer: {
        id: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        phone: string;
        fullName: string;
    };
    order: {
        status: import(".prisma/client").$Enums.OrderStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
        razorpayOrderId: string | null;
        razorpayPaymentId: string | null;
        eventDate: Date | null;
        invoiceNumber: string | null;
        subtotalInPaise: number;
        gstInPaise: number;
        totalInPaise: number;
        emailSendStatus: string | null;
        whatsappSentAt: Date | null;
        whatsappSendStatus: string | null;
        whatsappMessageId: string | null;
        orderCode: string;
        userId: string;
        kind: import(".prisma/client").$Enums.OrderKind;
        customizationFollowUpStatus: import(".prisma/client").$Enums.CustomizationFollowUpStatus;
        adminNotes: string | null;
        shippingAddress: import("@prisma/client/runtime/library").JsonValue;
        contactEmail: string;
        contactPhone: string;
        eventDetails: import("@prisma/client/runtime/library").JsonValue | null;
        invoicePdfUrl: string | null;
        confirmationEmailSentAt: Date | null;
        placedAt: Date;
        registryId: string | null;
    } | null;
} & {
    id: string;
    deletedAt: Date | null;
    orderId: string | null;
    customerId: string;
    invoiceNumber: string;
    linkedType: import(".prisma/client").$Enums.InvoiceLinkedType;
    subtotalInPaise: number;
    gstInPaise: number;
    totalInPaise: number;
    pdfUrl: string | null;
    emailSentAt: Date | null;
    emailSendStatus: string | null;
    whatsappSentAt: Date | null;
    whatsappSendStatus: string | null;
    whatsappMessageId: string | null;
    issuedAt: Date;
}>;
export declare function exportInvoicesCsv(from?: string, to?: string): Promise<string>;
export declare function listPaymentEvents(filters: {
    search?: string;
    page: number;
    pageSize: number;
}): Promise<{
    total: number;
    items: {
        id: string;
        razorpayOrderId: string | null;
        razorpayPaymentId: string | null;
        eventKey: string;
        eventType: string;
        processedAt: Date;
        payload: import("@prisma/client/runtime/library").JsonValue | null;
    }[];
}>;
