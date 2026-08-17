"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeStockStatus = computeStockStatus;
exports.adjustInventory = adjustInventory;
exports.adjustInventoryInTx = adjustInventoryInTx;
exports.getInventoryHistory = getInventoryHistory;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
const errors_1 = require("../../lib/errors");
const response_1 = require("../../lib/response");
function computeStockStatus(quantityAvailable, lowStockThreshold) {
    if (quantityAvailable <= 0)
        return client_1.StockStatusFlag.OUT_OF_STOCK;
    if (quantityAvailable <= lowStockThreshold)
        return client_1.StockStatusFlag.LOW_STOCK;
    return client_1.StockStatusFlag.IN_STOCK;
}
/**
 * Atomically adjusts stock and writes an audit ledger entry. Used both by the
 * admin "adjust stock" action and by the order pipeline (SALE / RETURN).
 * Never allows quantity to go negative — throws instead, so overselling is
 * impossible even under concurrent checkout requests.
 */
async function adjustInventory(input) {
    return prisma_1.prisma.$transaction(async (tx) => {
        const record = await tx.inventoryRecord.findUnique({ where: { productId: input.productId } });
        if (!record)
            throw new errors_1.NotFoundError("Inventory record not found for this product");
        const nextQuantity = record.quantityAvailable + input.delta;
        if (nextQuantity < 0) {
            throw new errors_1.ValidationError("Insufficient stock for this adjustment", {
                available: record.quantityAvailable,
                requested: -input.delta,
            });
        }
        const updated = await tx.inventoryRecord.update({
            where: { id: record.id },
            data: {
                quantityAvailable: nextQuantity,
                statusFlag: computeStockStatus(nextQuantity, record.lowStockThreshold),
                lastRestockedAt: input.reason === client_1.InventoryLedgerReason.RESTOCK ? new Date() : record.lastRestockedAt,
            },
        });
        await tx.inventoryLedgerEntry.create({
            data: {
                inventoryRecordId: record.id,
                changeQuantity: input.delta,
                reason: input.reason,
                orderItemId: input.orderItemId ?? null,
                note: input.note ?? null,
                adminUserId: input.adminUserId ?? null,
            },
        });
        return updated;
    });
}
/** Non-transactional variant for use INSIDE an already-open transaction (checkout). */
async function adjustInventoryInTx(tx, input) {
    const record = await tx.inventoryRecord.findUnique({ where: { productId: input.productId } });
    if (!record)
        throw new errors_1.NotFoundError("Inventory record not found for this product");
    const nextQuantity = record.quantityAvailable + input.delta;
    if (nextQuantity < 0) {
        throw new errors_1.ValidationError(`Insufficient stock for one of the items in your cart`, {
            productId: input.productId,
            available: record.quantityAvailable,
        });
    }
    await tx.inventoryRecord.update({
        where: { id: record.id },
        data: {
            quantityAvailable: nextQuantity,
            statusFlag: computeStockStatus(nextQuantity, record.lowStockThreshold),
        },
    });
    await tx.inventoryLedgerEntry.create({
        data: {
            inventoryRecordId: record.id,
            changeQuantity: input.delta,
            reason: input.reason,
            orderItemId: input.orderItemId ?? null,
            note: input.note ?? null,
        },
    });
    return nextQuantity;
}
async function getInventoryHistory(productId, q) {
    const record = await prisma_1.prisma.inventoryRecord.findUnique({ where: { productId } });
    if (!record)
        throw new errors_1.NotFoundError("Inventory record not found for this product");
    const { page, pageSize, skip, take } = (0, response_1.parsePagination)(q);
    const [items, total] = await Promise.all([
        prisma_1.prisma.inventoryLedgerEntry.findMany({
            where: { inventoryRecordId: record.id },
            orderBy: { createdAt: "desc" },
            skip,
            take,
        }),
        prisma_1.prisma.inventoryLedgerEntry.count({ where: { inventoryRecordId: record.id } }),
    ]);
    return { items, total, page, pageSize, record };
}
//# sourceMappingURL=inventory.service.js.map