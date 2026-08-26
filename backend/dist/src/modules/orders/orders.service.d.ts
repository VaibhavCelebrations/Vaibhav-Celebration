import { CustomizationFollowUpStatus, OrderStatus, PaymentStatus } from "@prisma/client";
import { type BuilderLocation, type BuilderSelections } from "../builder/builder.service";
export type ShippingAddress = {
    fullName: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
};
/**
 * Re-validates the live cart (price + stock) and returns the authoritative
 * total that will be charged. The frontend renders exactly this — it never
 * computes GST or totals itself. Throws if the cart is empty or any line is
 * no longer purchasable, so the UI can surface a clear error before payment.
 */
export declare function getCheckoutQuote(userId: string): Promise<{
    quote: import("../shop/cart-pricing.service").CartQuote;
    items: {
        productId: string;
        title: string;
        quantity: number;
        unitPriceInPaise: number;
        personalizationCostInPaise: number;
        personalizationSelected: boolean;
        registryItemId: string | null;
    }[];
    registryCheckout: {
        registryCode: string;
        recipientName: string;
        shippingAddress: ShippingAddress;
    } | null;
}>;
/**
 * Create a PACKAGE celebration order from the builder quote.
 * Prices are always recomputed server-side — never trust the client total.
 */
export declare function createPackageOrder(userId: string, input: {
    eventDate: string;
    contactEmail: string;
    contactPhone: string;
    shippingAddress?: ShippingAddress;
    eventDetails?: {
        childName?: string;
        childAge?: string;
        venue?: string;
        guestCount?: number | string;
        notes?: string;
    };
    builder: {
        packageSlug: "standard" | "premium" | "luxe" | string;
        themeSlug: string;
        guestCount: number;
        location: BuilderLocation;
        selections: BuilderSelections;
    };
}): Promise<{
    orderId: string;
    orderCode: string;
    kind: "PACKAGE";
    totalInPaise: number;
    razorpayOrderId: string;
    razorpayKeyId: string | null;
    eventDate: string;
    packageTitle: string;
    themeTitle: string;
}>;
/**
 * Creates the order from the server cart. Cart is NOT cleared until payment
 * is verified — cancelled/failed Razorpay checkouts must not empty the cart.
 * Reuses an existing unpaid order when the cart contents still match.
 */
export declare function createOrderFromCart(userId: string, input: {
    shippingAddress: ShippingAddress;
    contactEmail: string;
    contactPhone: string;
}): Promise<{
    orderId: string;
    orderCode: string;
    totalInPaise: number;
    razorpayOrderId: string;
    razorpayKeyId: string | null;
}>;
/** Single-item order used by the gift-registry "gift this item" flow — bypasses the cart entirely. */
export declare function createDirectOrder(userId: string, input: {
    productId: string;
    quantity: number;
    shippingAddress: ShippingAddress;
    contactEmail: string;
    contactPhone: string;
    registryItemId?: string;
    registryId?: string;
    personalizationValues?: unknown;
    personalizationSelected?: boolean;
}): Promise<{
    orderId: string;
    orderCode: string;
    totalInPaise: number;
    razorpayOrderId: string;
    razorpayKeyId: string | null;
}>;
/** Restocks reserved inventory and cancels the order — used on payment.failed / manual cancellation. */
export declare function cancelOrderAndRestock(orderId: string, note?: string): Promise<{
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
/** Payment failed — keep reserved stock and cart; customer may retry the same order. */
export declare function markOrderPaymentFailed(orderId: string): Promise<{
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
export declare function markOrderPaymentCancelled(orderId: string): Promise<{
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
export declare function retryShopPayment(userId: string, orderCode: string): Promise<{
    orderId: string;
    orderCode: string;
    totalInPaise: number;
    razorpayOrderId: string;
    razorpayKeyId: string | null;
}>;
export declare function verifyShopCheckoutPayment(input: {
    userId: string;
    orderCode: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
}): Promise<{
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
/** Called from webhook or verified checkout callback — marks paid, invoices, notifies, clears purchased cart lines. */
export declare function markOrderPaid(orderId: string, razorpayPaymentId: string | undefined): Promise<{
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
export declare function findOrderByRazorpayOrderId(razorpayOrderId: string): Promise<{
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
} | null>;
export declare function listOrdersForUser(userId: string, q: {
    page?: number;
    pageSize?: number;
}): Promise<{
    items: {
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
    }[];
    total: number;
    page: number;
    pageSize: number;
}>;
export declare function getOrderByCode(orderCode: string): Promise<{
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
export declare function getOrderForUser(userId: string, orderCode: string): Promise<{
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
export declare function adminListOrders(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: import("@prisma/client").OrderStatus;
    paymentStatus?: PaymentStatus;
    followUp?: CustomizationFollowUpStatus | "REQUIRED_ANY";
    registryId?: string;
    registryOnly?: boolean;
    shopOnly?: boolean;
    packageOnly?: boolean;
}): Promise<{
    items: {
        id: string;
        orderCode: string;
        kind: import(".prisma/client").$Enums.OrderKind;
        status: import(".prisma/client").$Enums.OrderStatus;
        placedAt: Date;
        eventDate: Date | null;
        user: {
            name: string;
            email: string;
            phone: string | null;
        };
        totalInPaise: number;
        createdAt: string;
        customerName: string;
        customerEmail: string;
        customerPhone: string;
        itemCount: number;
        hasPersonalization: boolean;
        paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
        customizationFollowUpStatus: import(".prisma/client").$Enums.CustomizationFollowUpStatus;
        invoicePdfUrl: string | null;
        registryId: string | null;
        registryCode: string | null;
        packageTitle: string | null;
        themeTitle: string | null;
    }[];
    total: number;
    page: number;
    pageSize: number;
}>;
export declare function adminGetOrder(orderId: string): Promise<{
    items: {
        id: string;
        productId: string;
        title: string;
        sku: string;
        quantity: number;
        unitPriceInPaise: number;
        personalizationSelected: boolean;
        personalizationValues: import("@prisma/client/runtime/library").JsonValue;
        personalizationCostSnapshot: number;
        fulfillmentStatus: string | null;
        lineTotalInPaise: number;
        image: {
            type: string;
            cdnKey: string;
            sizeBytes: number | null;
            url: string;
            id: string;
            createdAt: Date;
            deletedAt: Date | null;
            altText: string | null;
            category: string | null;
            folder: string | null;
            width: number | null;
            height: number | null;
            uploadedByAdminUserId: string | null;
        } | null;
    }[];
    user: {
        name: string;
        email: string;
        phone: string | null;
    };
    registry: {
        id: string;
        registryCode: string;
        ownerDisplayName: string | null;
        childOrPersonName: string | null;
    } | null;
    packageOrder: ({
        theme: {
            title: string;
            slug: string;
        };
        package: {
            title: string;
            slug: string;
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
export declare function adminUpdateOrderItemFulfillment(orderId: string, itemId: string, status: string | null): Promise<{
    items: {
        id: string;
        productId: string;
        title: string;
        sku: string;
        quantity: number;
        unitPriceInPaise: number;
        personalizationSelected: boolean;
        personalizationValues: import("@prisma/client/runtime/library").JsonValue;
        personalizationCostSnapshot: number;
        fulfillmentStatus: string | null;
        lineTotalInPaise: number;
        image: {
            type: string;
            cdnKey: string;
            sizeBytes: number | null;
            url: string;
            id: string;
            createdAt: Date;
            deletedAt: Date | null;
            altText: string | null;
            category: string | null;
            folder: string | null;
            width: number | null;
            height: number | null;
            uploadedByAdminUserId: string | null;
        } | null;
    }[];
    user: {
        name: string;
        email: string;
        phone: string | null;
    };
    registry: {
        id: string;
        registryCode: string;
        ownerDisplayName: string | null;
        childOrPersonName: string | null;
    } | null;
    packageOrder: ({
        theme: {
            title: string;
            slug: string;
        };
        package: {
            title: string;
            slug: string;
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
export declare function adminUpdateOrderStatus(orderId: string, status: OrderStatus): Promise<{
    items: {
        id: string;
        productId: string;
        title: string;
        sku: string;
        quantity: number;
        unitPriceInPaise: number;
        personalizationSelected: boolean;
        personalizationValues: import("@prisma/client/runtime/library").JsonValue;
        personalizationCostSnapshot: number;
        fulfillmentStatus: string | null;
        lineTotalInPaise: number;
        image: {
            type: string;
            cdnKey: string;
            sizeBytes: number | null;
            url: string;
            id: string;
            createdAt: Date;
            deletedAt: Date | null;
            altText: string | null;
            category: string | null;
            folder: string | null;
            width: number | null;
            height: number | null;
            uploadedByAdminUserId: string | null;
        } | null;
    }[];
    user: {
        name: string;
        email: string;
        phone: string | null;
    };
    registry: {
        id: string;
        registryCode: string;
        ownerDisplayName: string | null;
        childOrPersonName: string | null;
    } | null;
    packageOrder: ({
        theme: {
            title: string;
            slug: string;
        };
        package: {
            title: string;
            slug: string;
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
export declare function adminUpdateOrderOps(orderId: string, data: {
    customizationFollowUpStatus?: CustomizationFollowUpStatus;
    adminNotes?: string;
}): Promise<{
    items: {
        id: string;
        productId: string;
        title: string;
        sku: string;
        quantity: number;
        unitPriceInPaise: number;
        personalizationSelected: boolean;
        personalizationValues: import("@prisma/client/runtime/library").JsonValue;
        personalizationCostSnapshot: number;
        fulfillmentStatus: string | null;
        lineTotalInPaise: number;
        image: {
            type: string;
            cdnKey: string;
            sizeBytes: number | null;
            url: string;
            id: string;
            createdAt: Date;
            deletedAt: Date | null;
            altText: string | null;
            category: string | null;
            folder: string | null;
            width: number | null;
            height: number | null;
            uploadedByAdminUserId: string | null;
        } | null;
    }[];
    user: {
        name: string;
        email: string;
        phone: string | null;
    };
    registry: {
        id: string;
        registryCode: string;
        ownerDisplayName: string | null;
        childOrPersonName: string | null;
    } | null;
    packageOrder: ({
        theme: {
            title: string;
            slug: string;
        };
        package: {
            title: string;
            slug: string;
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
export declare function reorderFromOrder(userId: string, orderCode: string): Promise<{
    items: {
        id: string;
        productId: string;
        registryItemId: string | null;
        title: string;
        slug: string;
        unitPriceInPaise: number;
        quantity: number;
        personalizationValues: unknown;
        personalizationSelected: boolean;
        personalizationCostInPaise: number;
        personalizationEnabled: boolean;
        image: {
            url: string;
            altText: string | null;
        } | null;
        isActive: boolean;
        stockAvailable: number;
        stockStatus: string;
        maxOrderQuantity: number | null;
        registry: {
            registryCode: string;
            giftTitle: string;
            recipientName: string | null;
        } | null;
    }[];
    quote: import("../shop/cart-pricing.service").CartQuote;
    itemCount: number;
}>;
