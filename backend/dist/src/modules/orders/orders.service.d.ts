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
    }[];
}>;
/**
 * Creates the order atomically from the user's server-side cart, then
 * clears it. The Razorpay order is created just after the DB transaction —
 * if that external call fails the shop order still exists in
 * PENDING_PAYMENT and can be retried without re-reserving stock twice.
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
    gstInPaise: number;
    razorpayOrderId: string | null;
    razorpayPaymentId: string | null;
    invoiceNumber: string | null;
    subtotalInPaise: number;
    totalInPaise: number;
    shippingAddress: import("@prisma/client/runtime/library").JsonValue;
    userId: string;
    orderCode: string;
    contactEmail: string;
    contactPhone: string;
    invoicePdfUrl: string | null;
    placedAt: Date;
}>;
/** Called from the Razorpay webhook on payment.captured — marks paid, invoices, and emails the customer. */
export declare function markOrderPaid(orderId: string, razorpayPaymentId: string | undefined): Promise<{
    status: import(".prisma/client").$Enums.OrderStatus;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    gstInPaise: number;
    razorpayOrderId: string | null;
    razorpayPaymentId: string | null;
    invoiceNumber: string | null;
    subtotalInPaise: number;
    totalInPaise: number;
    shippingAddress: import("@prisma/client/runtime/library").JsonValue;
    userId: string;
    orderCode: string;
    contactEmail: string;
    contactPhone: string;
    invoicePdfUrl: string | null;
    placedAt: Date;
}>;
export declare function findOrderByRazorpayOrderId(razorpayOrderId: string): Promise<{
    status: import(".prisma/client").$Enums.OrderStatus;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    gstInPaise: number;
    razorpayOrderId: string | null;
    razorpayPaymentId: string | null;
    invoiceNumber: string | null;
    subtotalInPaise: number;
    totalInPaise: number;
    shippingAddress: import("@prisma/client/runtime/library").JsonValue;
    userId: string;
    orderCode: string;
    contactEmail: string;
    contactPhone: string;
    invoicePdfUrl: string | null;
    placedAt: Date;
} | null>;
export declare function listOrdersForUser(userId: string, q: {
    page?: number;
    pageSize?: number;
}): Promise<{
    items: {
        id: string;
        orderCode: string;
        status: import(".prisma/client").$Enums.OrderStatus;
        subtotalInPaise: number;
        gstInPaise: number;
        totalInPaise: number;
        shippingAddress: unknown;
        contactEmail: string;
        contactPhone: string;
        invoicePdfUrl: string | null;
        placedAt: string;
        createdAt: string;
        items: {
            id: string;
            productId: string;
            title: string;
            slug: string;
            quantity: number;
            unitPriceInPaise: number;
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
export declare function getOrderForUser(userId: string, orderCode: string): Promise<{
    id: string;
    orderCode: string;
    status: import(".prisma/client").$Enums.OrderStatus;
    subtotalInPaise: number;
    gstInPaise: number;
    totalInPaise: number;
    shippingAddress: unknown;
    contactEmail: string;
    contactPhone: string;
    invoicePdfUrl: string | null;
    placedAt: string;
    createdAt: string;
    items: {
        id: string;
        productId: string;
        title: string;
        slug: string;
        quantity: number;
        unitPriceInPaise: number;
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
}): Promise<{
    meta: import("../../lib/response").PaginationMeta;
    data: {
        id: string;
        orderCode: string;
        status: import(".prisma/client").$Enums.OrderStatus;
        totalInPaise: number;
        createdAt: string;
        customerName: string;
        customerEmail: string;
        customerPhone: string;
        itemCount: number;
        hasPersonalization: boolean;
    }[];
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
    status: import(".prisma/client").$Enums.OrderStatus;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    gstInPaise: number;
    razorpayOrderId: string | null;
    razorpayPaymentId: string | null;
    invoiceNumber: string | null;
    subtotalInPaise: number;
    totalInPaise: number;
    shippingAddress: import("@prisma/client/runtime/library").JsonValue;
    userId: string;
    orderCode: string;
    contactEmail: string;
    contactPhone: string;
    invoicePdfUrl: string | null;
    placedAt: Date;
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
    status: import(".prisma/client").$Enums.OrderStatus;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    gstInPaise: number;
    razorpayOrderId: string | null;
    razorpayPaymentId: string | null;
    invoiceNumber: string | null;
    subtotalInPaise: number;
    totalInPaise: number;
    shippingAddress: import("@prisma/client/runtime/library").JsonValue;
    userId: string;
    orderCode: string;
    contactEmail: string;
    contactPhone: string;
    invoicePdfUrl: string | null;
    placedAt: Date;
}>;
