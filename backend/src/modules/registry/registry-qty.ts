import { GiftContributionStatus, GiftItemStatus, Prisma } from "@prisma/client";
import { ConflictError, ValidationError } from "../../lib/errors";

export function remainingQuantity(item: { quantityDesired: number; quantityPurchased: number }): number {
  return Math.max(0, item.quantityDesired - item.quantityPurchased);
}

export function availableToReserve(item: {
  quantityDesired: number;
  quantityPurchased: number;
  quantityReserved: number;
}): number {
  return Math.max(0, item.quantityDesired - item.quantityPurchased - item.quantityReserved);
}

export function derivedItemStatus(item: { quantityDesired: number; quantityPurchased: number }): GiftItemStatus {
  if (item.quantityPurchased >= item.quantityDesired && item.quantityDesired > 0) return GiftItemStatus.PURCHASED;
  if (item.quantityPurchased > 0) return GiftItemStatus.PARTIALLY_PURCHASED;
  return GiftItemStatus.AVAILABLE;
}

export async function reserveRegistryItemQty(
  tx: Prisma.TransactionClient,
  registryItemId: string,
  quantity: number,
): Promise<void> {
  if (quantity <= 0) throw new ValidationError("Quantity must be at least 1");
  await tx.$queryRaw`SELECT id FROM "GiftRegistryItem" WHERE id = ${registryItemId} FOR UPDATE`;
  const item = await tx.giftRegistryItem.findUnique({ where: { id: registryItemId } });
  if (!item) throw new ValidationError("Registry gift not found");
  if (availableToReserve(item) < quantity) {
    throw new ConflictError("REGISTRY_QTY_UNAVAILABLE", "This gift no longer has enough remaining quantity");
  }
  const nextPurchased = item.quantityPurchased;
  const nextReserved = item.quantityReserved + quantity;
  await tx.giftRegistryItem.update({
    where: { id: item.id },
    data: {
      quantityReserved: nextReserved,
      status: derivedItemStatus({ quantityDesired: item.quantityDesired, quantityPurchased: nextPurchased }),
    },
  });
}

export async function releaseRegistryReservationsForOrder(tx: Prisma.TransactionClient, orderId: string): Promise<void> {
  const contributions = await tx.giftRegistryContribution.findMany({
    where: { orderId, status: GiftContributionStatus.PENDING },
  });
  for (const contribution of contributions) {
    await tx.$queryRaw`SELECT id FROM "GiftRegistryItem" WHERE id = ${contribution.registryItemId} FOR UPDATE`;
    const item = await tx.giftRegistryItem.findUnique({ where: { id: contribution.registryItemId } });
    if (!item) continue;
    const nextReserved = Math.max(0, item.quantityReserved - contribution.quantity);
    await tx.giftRegistryItem.update({
      where: { id: item.id },
      data: {
        quantityReserved: nextReserved,
        status: derivedItemStatus(item),
      },
    });
    await tx.giftRegistryContribution.update({
      where: { id: contribution.id },
      data: { status: GiftContributionStatus.RELEASED },
    });
  }
}

export async function fulfillRegistryContributionsForOrder(tx: Prisma.TransactionClient, orderId: string): Promise<void> {
  const contributions = await tx.giftRegistryContribution.findMany({
    where: { orderId, status: { in: [GiftContributionStatus.PENDING, GiftContributionStatus.PAID] } },
  });
  for (const contribution of contributions) {
    if (contribution.status === GiftContributionStatus.PAID) continue;
    await tx.$queryRaw`SELECT id FROM "GiftRegistryItem" WHERE id = ${contribution.registryItemId} FOR UPDATE`;
    const item = await tx.giftRegistryItem.findUnique({ where: { id: contribution.registryItemId } });
    if (!item) continue;
    const nextPurchased = item.quantityPurchased + contribution.quantity;
    const nextReserved = Math.max(0, item.quantityReserved - contribution.quantity);
    await tx.giftRegistryItem.update({
      where: { id: item.id },
      data: {
        quantityPurchased: nextPurchased,
        quantityReserved: nextReserved,
        status: derivedItemStatus({ quantityDesired: item.quantityDesired, quantityPurchased: nextPurchased }),
      },
    });
    await tx.giftRegistryContribution.update({
      where: { id: contribution.id },
      data: { status: GiftContributionStatus.PAID },
    });
  }
}

export async function confirmExternalPurchase(
  tx: Prisma.TransactionClient,
  registryItemId: string,
  quantity: number,
): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "GiftRegistryItem" WHERE id = ${registryItemId} FOR UPDATE`;
  const item = await tx.giftRegistryItem.findUnique({ where: { id: registryItemId } });
  if (!item) throw new ValidationError("Registry gift not found");
  if (remainingQuantity(item) < quantity) {
    throw new ConflictError("REGISTRY_QTY_UNAVAILABLE", "This gift no longer has enough remaining quantity");
  }
  const nextPurchased = item.quantityPurchased + quantity;
  await tx.giftRegistryItem.update({
    where: { id: item.id },
    data: {
      quantityPurchased: nextPurchased,
      status: derivedItemStatus({ quantityDesired: item.quantityDesired, quantityPurchased: nextPurchased }),
    },
  });
}

export async function reverseExternalPurchase(
  tx: Prisma.TransactionClient,
  contributionId: string,
): Promise<void> {
  const contribution = await tx.giftRegistryContribution.findUnique({ where: { id: contributionId } });
  if (!contribution || contribution.status !== GiftContributionStatus.CONFIRMED_EXTERNAL) {
    throw new ValidationError("This confirmation cannot be reversed");
  }
  await tx.$queryRaw`SELECT id FROM "GiftRegistryItem" WHERE id = ${contribution.registryItemId} FOR UPDATE`;
  const item = await tx.giftRegistryItem.findUnique({ where: { id: contribution.registryItemId } });
  if (item) {
    const nextPurchased = Math.max(0, item.quantityPurchased - contribution.quantity);
    await tx.giftRegistryItem.update({
      where: { id: item.id },
      data: {
        quantityPurchased: nextPurchased,
        status: derivedItemStatus({ quantityDesired: item.quantityDesired, quantityPurchased: nextPurchased }),
      },
    });
  }
  await tx.giftRegistryContribution.update({
    where: { id: contribution.id },
    data: { status: GiftContributionStatus.RELEASED },
  });
}
