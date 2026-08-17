import { InventoryLedgerReason, Prisma, StockStatusFlag } from "@prisma/client";
export declare function computeStockStatus(quantityAvailable: number, lowStockThreshold: number): StockStatusFlag;
/**
 * Atomically adjusts stock and writes an audit ledger entry. Used both by the
 * admin "adjust stock" action and by the order pipeline (SALE / RETURN).
 * Never allows quantity to go negative — throws instead, so overselling is
 * impossible even under concurrent checkout requests.
 */
export declare function adjustInventory(input: {
    productId: string;
    delta: number;
    reason: InventoryLedgerReason;
    note?: string;
    adminUserId?: string;
    orderItemId?: string;
}): Promise<{
    id: string;
    updatedAt: Date;
    productId: string;
    quantityAvailable: number;
    lowStockThreshold: number;
    statusFlag: import(".prisma/client").$Enums.StockStatusFlag;
    lastRestockedAt: Date | null;
}>;
/** Non-transactional variant for use INSIDE an already-open transaction (checkout). */
export declare function adjustInventoryInTx(tx: Prisma.TransactionClient, input: {
    productId: string;
    delta: number;
    reason: InventoryLedgerReason;
    note?: string;
    orderItemId?: string;
}): Promise<number>;
export declare function getInventoryHistory(productId: string, q: {
    page?: number;
    pageSize?: number;
}): Promise<{
    items: {
        id: string;
        createdAt: Date;
        adminUserId: string | null;
        note: string | null;
        inventoryRecordId: string;
        changeQuantity: number;
        reason: import(".prisma/client").$Enums.InventoryLedgerReason;
        orderItemId: string | null;
    }[];
    total: number;
    page: number;
    pageSize: number;
    record: {
        id: string;
        updatedAt: Date;
        productId: string;
        quantityAvailable: number;
        lowStockThreshold: number;
        statusFlag: import(".prisma/client").$Enums.StockStatusFlag;
        lastRestockedAt: Date | null;
    };
}>;
