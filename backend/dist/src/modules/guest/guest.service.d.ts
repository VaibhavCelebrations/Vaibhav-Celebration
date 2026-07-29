export declare function requestOtp(input: {
    referenceCode: string;
    referenceType: string;
    email: string;
}): Promise<{
    devOtp?: string | undefined;
    sent: boolean;
    expiresInMinutes: number;
}>;
export declare function verifyOtp(input: {
    referenceCode: string;
    otp: string;
}): Promise<{
    guestAccessToken: string;
    referenceCode: string;
    referenceType: string;
    expiresInMinutes: number;
}>;
export declare function getGuestBooking(bookingCode: string): Promise<{
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
        serviceItems: ({
            extraService: {
                id: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                displayOrder: number;
                description: string | null;
                label: string;
                requirements: string | null;
                customizationPriceInPaise: number;
            };
        } & {
            id: string;
            displayOrder: number;
            packageId: string;
            extraServiceId: string;
            isIncluded: boolean;
        })[];
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        title: string;
        slug: string;
        displayOrder: number;
        description: string | null;
        priceInPaise: number;
        tierRank: number;
        isRecommended: boolean;
        isCustomizable: boolean;
    };
    customer: {
        id: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        phone: string;
        fullName: string;
    };
    invoice: {
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
    } | null;
    customizations: ({
        packageServiceItem: {
            extraService: {
                id: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                displayOrder: number;
                description: string | null;
                label: string;
                requirements: string | null;
                customizationPriceInPaise: number;
            };
        } & {
            id: string;
            displayOrder: number;
            packageId: string;
            extraServiceId: string;
            isIncluded: boolean;
        };
    } & {
        id: string;
        bookingId: string;
        packageServiceItemId: string;
        quantity: number;
        unitPriceInPaise: number;
    })[];
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
}>;
