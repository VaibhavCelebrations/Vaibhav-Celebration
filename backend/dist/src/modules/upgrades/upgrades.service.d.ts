import { PaymentStatus } from "@prisma/client";
export declare const GIFT_REGISTRY_ELIGIBLE_SLUGS: readonly ["premium", "luxe"];
export declare const GIFT_REGISTRY_PRICE_IN_PAISE = 50000;
export declare function isGiftRegistryMatrixService(svc: {
    slug?: string | null;
    category?: string | null;
    label?: string | null;
}): boolean;
/** Restore Gift Registry as an included Signature/Grand extra service with a ₹500 customize price. */
export declare function ensureGiftRegistryService(): Promise<{
    id: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    category: import(".prisma/client").$Enums.ExtraServiceCategory | null;
    slug: string | null;
    displayOrder: number;
    description: string | null;
    label: string;
    requirements: string | null;
    customizationPriceInPaise: number;
    pricingMode: import(".prisma/client").$Enums.PricingMode | null;
    locationScope: import(".prisma/client").$Enums.LocationScope;
    choiceCount: number | null;
}>;
export declare function getRegistryAccess(userId: string): Promise<{
    canAccess: boolean;
    paidUpgradeCount: number;
    registryCount: number;
    pendingSetups: {
        orderCode: string;
        packageTitle: string;
        themeTitle: string | null;
    }[];
    availablePurchases: Array<{
        orderCode: string;
        packageTitle: string;
        themeTitle: string | null;
        priceInPaise: number;
        gstInPaise: number;
        totalInPaise: number;
    }>;
}>;
export type GiftRegistryUpgradeState = {
    eligible: boolean;
    registryId: string | null;
    registryTitle: string | null;
};
export declare function giftRegistryStateForPackageOrder(input: {
    orderId: string;
    userId: string;
    packageSlug: string;
    paymentStatus: PaymentStatus;
    sourcedRegistries?: Array<{
        id: string;
        title: string | null;
    }>;
    lineItems?: any;
}): Promise<GiftRegistryUpgradeState | null>;
export declare function assertGiftRegistryEntitlement(userId: string, sourceOrderCode: string): Promise<{
    packageOrder: ({
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
        lines: {
            id: string;
            label: string;
            orderPackageId: string;
            packageServiceItemId: string | null;
            sku: string | null;
            section: string | null;
            quantity: number;
            unitPriceInPaise: number;
        }[];
    } & {
        id: string;
        createdAt: Date;
        themeId: string;
        packageId: string;
        orderId: string;
        basePriceInPaise: number;
        customizationTotalInPaise: number;
        guestCount: number | null;
        location: string | null;
        builderInput: import("@prisma/client/runtime/library").JsonValue | null;
        quoteSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
    }) | null;
} & {
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
}>;
