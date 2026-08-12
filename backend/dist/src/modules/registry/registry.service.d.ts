import { GiftLinkSourceType } from "@prisma/client";
import type { ShippingAddress } from "../orders/orders.service";
export declare function listRegistriesForOwner(userId: string): Promise<{
    id: string;
    registryCode: string;
    childOrPersonName: string | null;
    celebrationDetails: string | null;
    photoMediaId: string | null;
    status: import(".prisma/client").$Enums.RegistryStatus;
    activatedAt: string;
    expiresAt: string;
    ownerUserId: string;
    shareUrl: string;
}[]>;
export declare function createRegistry(userId: string, input: {
    password: string;
    childOrPersonName?: string;
    celebrationDetails?: string;
    photoMediaId?: string;
    shippingAddress?: ShippingAddress;
    bookingId?: string;
}): Promise<{
    id: string;
    registryCode: string;
    childOrPersonName: string | null;
    celebrationDetails: string | null;
    photoMediaId: string | null;
    status: import(".prisma/client").$Enums.RegistryStatus;
    activatedAt: string;
    expiresAt: string;
    ownerUserId: string;
    shareUrl: string;
}>;
export declare function getRegistryForOwner(userId: string, registryId: string): Promise<{
    items: {
        id: string;
        sourceType: import(".prisma/client").$Enums.GiftLinkSourceType;
        title: string;
        priceInPaise: number | null;
        image: {
            url: string;
            altText: string | null;
        } | null;
        externalUrl: string | null;
        internalProductId: string | null;
        internalProductSlug: string | null;
        canGiftDirectly: boolean;
        inStock: boolean;
        status: import(".prisma/client").$Enums.GiftItemStatus;
        displayOrder: number;
    }[];
    id: string;
    registryCode: string;
    childOrPersonName: string | null;
    celebrationDetails: string | null;
    photoMediaId: string | null;
    status: import(".prisma/client").$Enums.RegistryStatus;
    activatedAt: string;
    expiresAt: string;
    ownerUserId: string;
    shareUrl: string;
}>;
export declare function updateRegistry(userId: string, registryId: string, input: {
    childOrPersonName?: string;
    celebrationDetails?: string;
    photoMediaId?: string;
    shippingAddress?: ShippingAddress;
    status?: "ACTIVE" | "CLOSED";
}): Promise<{
    id: string;
    registryCode: string;
    childOrPersonName: string | null;
    celebrationDetails: string | null;
    photoMediaId: string | null;
    status: import(".prisma/client").$Enums.RegistryStatus;
    activatedAt: string;
    expiresAt: string;
    ownerUserId: string;
    shareUrl: string;
}>;
export declare function addRegistryItem(userId: string, registryId: string, input: {
    sourceType: GiftLinkSourceType;
    externalUrl?: string;
    manualTitle?: string;
    manualImageUrl?: string;
    manualPriceInPaise?: number;
    internalProductId?: string;
}): Promise<{
    id: string;
    sourceType: import(".prisma/client").$Enums.GiftLinkSourceType;
    title: string;
    priceInPaise: number | null;
    image: {
        url: string;
        altText: string | null;
    } | null;
    externalUrl: string | null;
    internalProductId: string | null;
    internalProductSlug: string | null;
    canGiftDirectly: boolean;
    inStock: boolean;
    status: import(".prisma/client").$Enums.GiftItemStatus;
    displayOrder: number;
}>;
export declare function deleteRegistryItem(userId: string, registryId: string, itemId: string): Promise<void>;
export declare function getPublicRegistry(registryCode: string, password: string): Promise<{
    registryCode: string;
    childOrPersonName: string | null;
    celebrationDetails: string | null;
    photoMediaId: string | null;
    expiresAt: string;
    items: {
        id: string;
        sourceType: import(".prisma/client").$Enums.GiftLinkSourceType;
        title: string;
        priceInPaise: number | null;
        image: {
            url: string;
            altText: string | null;
        } | null;
        externalUrl: string | null;
        internalProductId: string | null;
        internalProductSlug: string | null;
        canGiftDirectly: boolean;
        inStock: boolean;
        status: import(".prisma/client").$Enums.GiftItemStatus;
        displayOrder: number;
    }[];
}>;
/**
 * Authenticated gifting: a signed-in gifter purchases an INTERNAL_PRODUCT
 * registry item through the exact same order/payment pipeline as regular
 * shop checkout (createDirectOrder → Razorpay → webhook → markOrderPaid),
 * so backend-only pricing and inventory guarantees apply here too.
 */
export declare function giftRegistryItem(gifterUserId: string, registryCode: string, itemId: string, password: string, input: {
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
export declare function adminListRegistries(q: {
    page?: number;
    pageSize?: number;
    search?: string;
}): Promise<{
    items: {
        owner: {
            name: string;
            email: string;
        };
        itemCount: number;
        id: string;
        registryCode: string;
        childOrPersonName: string | null;
        celebrationDetails: string | null;
        photoMediaId: string | null;
        status: import(".prisma/client").$Enums.RegistryStatus;
        activatedAt: string;
        expiresAt: string;
        ownerUserId: string;
        shareUrl: string;
    }[];
    total: number;
    page: number;
    pageSize: number;
}>;
export declare function adminGetRegistry(id: string): Promise<{
    owner: {
        name: string;
        email: string;
    };
    items: {
        contributions: {
            id: string;
            gifter: {
                name: string;
                email: string;
            };
            orderId: string | null;
            createdAt: string;
        }[];
        id: string;
        sourceType: import(".prisma/client").$Enums.GiftLinkSourceType;
        title: string;
        priceInPaise: number | null;
        image: {
            url: string;
            altText: string | null;
        } | null;
        externalUrl: string | null;
        internalProductId: string | null;
        internalProductSlug: string | null;
        canGiftDirectly: boolean;
        inStock: boolean;
        status: import(".prisma/client").$Enums.GiftItemStatus;
        displayOrder: number;
    }[];
    id: string;
    registryCode: string;
    childOrPersonName: string | null;
    celebrationDetails: string | null;
    photoMediaId: string | null;
    status: import(".prisma/client").$Enums.RegistryStatus;
    activatedAt: string;
    expiresAt: string;
    ownerUserId: string;
    shareUrl: string;
}>;
