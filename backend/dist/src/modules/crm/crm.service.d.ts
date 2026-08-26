import { LeadSource, LeadStatus, type Prisma } from "@prisma/client";
export declare function createContactLead(input: {
    name: string;
    email?: string;
    phone?: string;
    message?: string;
    interestArea?: string;
}): Promise<{
    status: import(".prisma/client").$Enums.LeadStatus;
    message: string | null;
    name: string;
    id: string;
    email: string | null;
    createdAt: Date;
    deletedAt: Date | null;
    phone: string | null;
    customerId: string | null;
    source: import(".prisma/client").$Enums.LeadSource;
    interestArea: string | null;
    chatbotSessionId: string | null;
}>;
export declare function listLeads(filters: {
    search?: string;
    status?: LeadStatus;
    source?: LeadSource;
    page: number;
    pageSize: number;
}): Promise<{
    total: number;
    items: {
        status: import(".prisma/client").$Enums.LeadStatus;
        message: string | null;
        name: string;
        id: string;
        email: string | null;
        createdAt: Date;
        deletedAt: Date | null;
        phone: string | null;
        customerId: string | null;
        source: import(".prisma/client").$Enums.LeadSource;
        interestArea: string | null;
        chatbotSessionId: string | null;
    }[];
}>;
export declare function updateLeadStatus(id: string, status: LeadStatus): Promise<{
    status: import(".prisma/client").$Enums.LeadStatus;
    message: string | null;
    name: string;
    id: string;
    email: string | null;
    createdAt: Date;
    deletedAt: Date | null;
    phone: string | null;
    customerId: string | null;
    source: import(".prisma/client").$Enums.LeadSource;
    interestArea: string | null;
    chatbotSessionId: string | null;
}>;
export declare function listCustomers(filters: {
    search?: string;
    page: number;
    pageSize: number;
}): Promise<{
    total: number;
    items: {
        id: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        phone: string;
        fullName: string;
    }[];
}>;
export declare function getCustomer360(id: string): Promise<{
    invoices: ({
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
            shippingAddress: Prisma.JsonValue;
            contactEmail: string;
            contactPhone: string;
            eventDetails: Prisma.JsonValue | null;
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
    })[];
    notes: {
        id: string;
        createdAt: Date;
        customerId: string;
        authorAdminUserId: string;
        note: string;
    }[];
    consultations: {
        status: import(".prisma/client").$Enums.ConsultationStatus;
        name: string;
        id: string;
        email: string;
        createdAt: Date;
        deletedAt: Date | null;
        phone: string;
        customerId: string | null;
        eventDate: Date;
        childOrEventDetails: string | null;
        customRequirements: string | null;
        advanceNoticeDays: number;
        belowMinimumNotice: boolean;
    }[];
    leads: {
        status: import(".prisma/client").$Enums.LeadStatus;
        message: string | null;
        name: string;
        id: string;
        email: string | null;
        createdAt: Date;
        deletedAt: Date | null;
        phone: string | null;
        customerId: string | null;
        source: import(".prisma/client").$Enums.LeadSource;
        interestArea: string | null;
        chatbotSessionId: string | null;
    }[];
} & {
    id: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    phone: string;
    fullName: string;
}>;
export declare function addCustomerNote(input: {
    customerId: string;
    authorAdminUserId: string;
    note: string;
}): Promise<{
    id: string;
    createdAt: Date;
    customerId: string;
    authorAdminUserId: string;
    note: string;
}>;
