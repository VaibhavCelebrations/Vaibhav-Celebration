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
export declare function getGuestOrder(orderCode: string): Promise<{
    id: string;
    orderCode: string;
    kind: import(".prisma/client").$Enums.OrderKind;
    status: import(".prisma/client").$Enums.OrderStatus;
    paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
    customizationFollowUpStatus: import(".prisma/client").$Enums.CustomizationFollowUpStatus;
    subtotalInPaise: number;
    gstInPaise: number;
    totalInPaise: number;
    shippingInPaise: number;
    shippingWaived: boolean;
    freeShippingThresholdSnapshotInPaise: number | null;
    shippingAddress: unknown;
    contactEmail: string;
    contactPhone: string;
    eventDate: string | null;
    eventDetails: {} | null;
    invoiceNumber: string | null;
    invoicePdfUrl: string | null;
    razorpayOrderId: string | null;
    canRetryPayment: boolean;
    canReorder: boolean;
    placedAt: string;
    createdAt: string;
    giftRegistry: import("../upgrades/upgrades.service").GiftRegistryUpgradeState | null;
    package: {
        title: string;
        slug: string;
        themeTitle: string;
        themeSlug: string;
        guestCount: number | null;
        location: string | null;
        lines: {
            id: string;
            label: string;
            sku: string | null;
            section: string | null;
            quantity: number;
            unitPriceInPaise: number;
            lineTotalInPaise: number;
        }[];
    } | null;
    items: {
        id: string;
        productId: string;
        title: string;
        slug: string;
        quantity: number;
        unitPriceInPaise: number;
        personalizationSelected: boolean;
        personalizationValues: {} | null;
        personalizationCostInPaise: number;
        lineTotalInPaise: number;
        image: {
            url: string;
            altText: string | null;
        } | null;
    }[];
}>;
