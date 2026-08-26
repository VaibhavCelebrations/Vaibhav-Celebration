import { GiftItemStatus, Prisma } from "@prisma/client";
export declare function remainingQuantity(item: {
    quantityDesired: number;
    quantityPurchased: number;
}): number;
export declare function availableToReserve(item: {
    quantityDesired: number;
    quantityPurchased: number;
    quantityReserved: number;
}): number;
export declare function derivedItemStatus(item: {
    quantityDesired: number;
    quantityPurchased: number;
}): GiftItemStatus;
export declare function reserveRegistryItemQty(tx: Prisma.TransactionClient, registryItemId: string, quantity: number): Promise<void>;
export declare function releaseRegistryReservationsForOrder(tx: Prisma.TransactionClient, orderId: string): Promise<void>;
export declare function fulfillRegistryContributionsForOrder(tx: Prisma.TransactionClient, orderId: string): Promise<void>;
export declare function confirmExternalPurchase(tx: Prisma.TransactionClient, registryItemId: string, quantity: number): Promise<void>;
export declare function reverseExternalPurchase(tx: Prisma.TransactionClient, contributionId: string): Promise<void>;
