import { LeadSource, LeadStatus } from "@prisma/client";
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
    customerId: string | null;
    phone: string | null;
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
        customerId: string | null;
        phone: string | null;
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
    customerId: string | null;
    phone: string | null;
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
    invoices: {
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
    }[];
    bookings: ({
        theme: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            title: string;
            slug: string;
            shortDescription: string;
            storyDescription: string | null;
            audienceNote: string | null;
            heroImageId: string | null;
            displayOrder: number;
            seoTitle: string | null;
            seoDescription: string | null;
            ogImageId: string | null;
        };
        package: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            title: string;
            slug: string;
            displayOrder: number;
            description: string | null;
            displayName: string | null;
            priceInPaise: number;
            tierRank: number;
            isRecommended: boolean;
            badgeText: string | null;
            pricingUnit: string | null;
            hasGiftRegistry: boolean;
            isCustomizable: boolean;
            internalKey: string | null;
        };
    } & {
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
        customerId: string | null;
        eventDate: Date;
        phone: string;
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
        customerId: string | null;
        phone: string | null;
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
