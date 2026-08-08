import { InventoryLedgerReason, Prisma, StockStatusFlag } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { parsePagination } from "../../lib/response";

export function computeStockStatus(quantityAvailable: number, lowStockThreshold: number): StockStatusFlag {
  if (quantityAvailable <= 0) return StockStatusFlag.OUT_OF_STOCK;
  if (quantityAvailable <= lowStockThreshold) return StockStatusFlag.LOW_STOCK;
  return StockStatusFlag.IN_STOCK;
}

/**
 * Atomically adjusts stock and writes an audit ledger entry. Used both by the
 * admin "adjust stock" action and by the order pipeline (SALE / RETURN).
 * Never allows quantity to go negative — throws instead, so overselling is
 * impossible even under concurrent checkout requests.
 */
export async function adjustInventory(input: {
  productId: string;
  delta: number;
  reason: InventoryLedgerReason;
  note?: string;
  adminUserId?: string;
  orderItemId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.inventoryRecord.findUnique({ where: { productId: input.productId } });
    if (!record) throw new NotFoundError("Inventory record not found for this product");

    const nextQuantity = record.quantityAvailable + input.delta;
    if (nextQuantity < 0) {
      throw new ValidationError("Insufficient stock for this adjustment", {
        available: record.quantityAvailable,
        requested: -input.delta,
      });
    }

    const updated = await tx.inventoryRecord.update({
      where: { id: record.id },
      data: {
        quantityAvailable: nextQuantity,
        statusFlag: computeStockStatus(nextQuantity, record.lowStockThreshold),
        lastRestockedAt: input.reason === InventoryLedgerReason.RESTOCK ? new Date() : record.lastRestockedAt,
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
export async function adjustInventoryInTx(
  tx: Prisma.TransactionClient,
  input: { productId: string; delta: number; reason: InventoryLedgerReason; note?: string; orderItemId?: string },
) {
  const record = await tx.inventoryRecord.findUnique({ where: { productId: input.productId } });
  if (!record) throw new NotFoundError("Inventory record not found for this product");

  const nextQuantity = record.quantityAvailable + input.delta;
  if (nextQuantity < 0) {
    throw new ValidationError(`Insufficient stock for one of the items in your cart`, {
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

export async function getInventoryHistory(productId: string, q: { page?: number; pageSize?: number }) {
  const record = await prisma.inventoryRecord.findUnique({ where: { productId } });
  if (!record) throw new NotFoundError("Inventory record not found for this product");
  const { page, pageSize, skip, take } = parsePagination(q);
  const [items, total] = await Promise.all([
    prisma.inventoryLedgerEntry.findMany({
      where: { inventoryRecordId: record.id },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.inventoryLedgerEntry.count({ where: { inventoryRecordId: record.id } }),
  ]);
  return { items, total, page, pageSize, record };
}
