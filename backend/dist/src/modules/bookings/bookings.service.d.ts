import { BookingStatus, PaymentStatus } from "@prisma/client";
import { type QuoteOptionInput } from "../pricing/pricing.service";
export type CreateBookingInput = {
    themeId: string;
    packageId: string;
    eventDate: string;
    selectedOptions?: QuoteOptionInput[];
    guestName: string;
    guestEmail: string;
    guestPhone: string;
};
export declare function createBooking(input: CreateBookingInput): Promise<{
    bookingCode: string;
    razorpayOrderId: string;
    razorpayKeyId: string | null;
    amountInPaise: number;
    currency: string;
    booking: {
        theme: {
            title: string;
            slug: string;
        };
        package: {
            title: string;
            slug: string;
        };
        customer: {
            id: string;
            fullName: string;
        };
        customizations: {
            id: string;
            bookingId: string;
            packageServiceItemId: string;
            quantity: number;
            unitPriceInPaise: number;
        }[];
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
    };
    quote: import("../pricing/pricing.service").QuoteResult;
}>;
export declare function getBookingByCode(bookingCode: string): Promise<{
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
export declare function getCheckoutSummary(bookingCode: string): Promise<{
    bookingCode: string;
    status: import(".prisma/client").$Enums.BookingStatus;
    paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
    eventDate: Date;
    theme: {
        id: string;
        title: string;
        slug: string;
    };
    package: {
        id: string;
        title: string;
        slug: string;
        includedServices: {
            label: string;
        }[];
    };
    customizations: {
        label: string;
        quantity: number;
        unitPriceInPaise: number;
        lineTotalInPaise: number;
    }[];
    pricing: {
        basePriceInPaise: number;
        customizationTotalInPaise: number;
        gstInPaise: number;
        totalPriceInPaise: number;
    };
    guest: {
        name: string;
        email: string;
        phone: string;
    };
    razorpayOrderId: string | null;
}>;
export declare function cancelBooking(bookingCode: string): Promise<{
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
export declare function adminUpdateBookingStatus(id: string, status: BookingStatus): Promise<{
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
export declare function listAdminBookings(filters: {
    search?: string;
    status?: BookingStatus;
    paymentStatus?: PaymentStatus;
    themeId?: string;
    packageId?: string;
    from?: string;
    to?: string;
    page: number;
    pageSize: number;
}): Promise<{
    total: number;
    items: ({
        theme: {
            title: string;
            slug: string;
        };
        package: {
            title: string;
            slug: string;
        };
        customer: {
            email: string;
            phone: string;
            fullName: string;
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
}>;
export declare function getCalendarBookings(view: "day" | "week" | "month", date: string): Promise<{
    view: "week" | "day" | "month";
    from: Date;
    to: Date;
    items: ({
        theme: {
            title: string;
        };
        package: {
            title: string;
        };
        customer: {
            phone: string;
            fullName: string;
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
}>;
export declare function notifyBookingConfirmed(bookingCode: string): Promise<void>;
