export declare function createPaymentOrder(input: {
    bookingCode?: string;
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
} | {
    handled: boolean;
    type: string;
    id: string;
}>;
export declare function enqueueInvoiceForBooking(bookingId: string): Promise<{
    id: string;
    deletedAt: Date | null;
    customerId: string;
    gstInPaise: number;
    bookingId: string | null;
    invoiceNumber: string;
    linkedType: import(".prisma/client").$Enums.InvoiceLinkedType;
    orderId: string | null;
    subtotalInPaise: number;
    totalInPaise: number;
    pdfUrl: string | null;
    emailSentAt: Date | null;
    whatsappSentAt: Date | null;
    whatsappSendStatus: string | null;
    issuedAt: Date;
}>;
export declare function deliverInvoice(invoiceId: string): Promise<{
    id: string;
    deletedAt: Date | null;
    customerId: string;
    gstInPaise: number;
    bookingId: string | null;
    invoiceNumber: string;
    linkedType: import(".prisma/client").$Enums.InvoiceLinkedType;
    orderId: string | null;
    subtotalInPaise: number;
    totalInPaise: number;
    pdfUrl: string | null;
    emailSentAt: Date | null;
    whatsappSentAt: Date | null;
    whatsappSendStatus: string | null;
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
        booking: {
            status: import(".prisma/client").$Enums.BookingStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            themeId: string;
            packageId: string;
            bookingCode: string;
            customerId: string;
            eventDate: Date;
            paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
            basePriceInPaise: number;
            customizationTotalInPaise: number;
            gstInPaise: number;
            totalPriceInPaise: number;
            razorpayOrderId: string | null;
            razorpayPaymentId: string | null;
            guestEmail: string;
            guestPhone: string;
        } | null;
    } & {
        id: string;
        deletedAt: Date | null;
        customerId: string;
        gstInPaise: number;
        bookingId: string | null;
        invoiceNumber: string;
        linkedType: import(".prisma/client").$Enums.InvoiceLinkedType;
        orderId: string | null;
        subtotalInPaise: number;
        totalInPaise: number;
        pdfUrl: string | null;
        emailSentAt: Date | null;
        whatsappSentAt: Date | null;
        whatsappSendStatus: string | null;
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
    booking: {
        status: import(".prisma/client").$Enums.BookingStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        themeId: string;
        packageId: string;
        bookingCode: string;
        customerId: string;
        eventDate: Date;
        paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
        basePriceInPaise: number;
        customizationTotalInPaise: number;
        gstInPaise: number;
        totalPriceInPaise: number;
        razorpayOrderId: string | null;
        razorpayPaymentId: string | null;
        guestEmail: string;
        guestPhone: string;
    } | null;
} & {
    id: string;
    deletedAt: Date | null;
    customerId: string;
    gstInPaise: number;
    bookingId: string | null;
    invoiceNumber: string;
    linkedType: import(".prisma/client").$Enums.InvoiceLinkedType;
    orderId: string | null;
    subtotalInPaise: number;
    totalInPaise: number;
    pdfUrl: string | null;
    emailSentAt: Date | null;
    whatsappSentAt: Date | null;
    whatsappSendStatus: string | null;
    issuedAt: Date;
}>;
export declare function exportInvoicesCsv(from?: string, to?: string): Promise<string>;
