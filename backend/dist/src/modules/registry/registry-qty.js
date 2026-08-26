"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remainingQuantity = remainingQuantity;
exports.availableToReserve = availableToReserve;
exports.derivedItemStatus = derivedItemStatus;
exports.reserveRegistryItemQty = reserveRegistryItemQty;
exports.releaseRegistryReservationsForOrder = releaseRegistryReservationsForOrder;
exports.fulfillRegistryContributionsForOrder = fulfillRegistryContributionsForOrder;
exports.confirmExternalPurchase = confirmExternalPurchase;
exports.reverseExternalPurchase = reverseExternalPurchase;
const client_1 = require("@prisma/client");
const errors_1 = require("../../lib/errors");
function remainingQuantity(item) {
    return Math.max(0, item.quantityDesired - item.quantityPurchased);
}
function availableToReserve(item) {
    return Math.max(0, item.quantityDesired - item.quantityPurchased - item.quantityReserved);
}
function derivedItemStatus(item) {
    if (item.quantityPurchased >= item.quantityDesired && item.quantityDesired > 0)
        return client_1.GiftItemStatus.PURCHASED;
    if (item.quantityPurchased > 0)
        return client_1.GiftItemStatus.PARTIALLY_PURCHASED;
    return client_1.GiftItemStatus.AVAILABLE;
}
async function reserveRegistryItemQty(tx, registryItemId, quantity) {
    if (quantity <= 0)
        throw new errors_1.ValidationError("Quantity must be at least 1");
    await tx.$queryRaw `SELECT id FROM "GiftRegistryItem" WHERE id = ${registryItemId} FOR UPDATE`;
    const item = await tx.giftRegistryItem.findUnique({ where: { id: registryItemId } });
    if (!item)
        throw new errors_1.ValidationError("Registry gift not found");
    if (availableToReserve(item) < quantity) {
        throw new errors_1.ConflictError("REGISTRY_QTY_UNAVAILABLE", "This gift no longer has enough remaining quantity");
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
async function releaseRegistryReservationsForOrder(tx, orderId) {
    const contributions = await tx.giftRegistryContribution.findMany({
        where: { orderId, status: client_1.GiftContributionStatus.PENDING },
    });
    for (const contribution of contributions) {
        await tx.$queryRaw `SELECT id FROM "GiftRegistryItem" WHERE id = ${contribution.registryItemId} FOR UPDATE`;
        const item = await tx.giftRegistryItem.findUnique({ where: { id: contribution.registryItemId } });
        if (!item)
            continue;
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
            data: { status: client_1.GiftContributionStatus.RELEASED },
        });
    }
}
async function fulfillRegistryContributionsForOrder(tx, orderId) {
    const contributions = await tx.giftRegistryContribution.findMany({
        where: { orderId, status: { in: [client_1.GiftContributionStatus.PENDING, client_1.GiftContributionStatus.PAID] } },
    });
    for (const contribution of contributions) {
        if (contribution.status === client_1.GiftContributionStatus.PAID)
            continue;
        await tx.$queryRaw `SELECT id FROM "GiftRegistryItem" WHERE id = ${contribution.registryItemId} FOR UPDATE`;
        const item = await tx.giftRegistryItem.findUnique({ where: { id: contribution.registryItemId } });
        if (!item)
            continue;
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
            data: { status: client_1.GiftContributionStatus.PAID },
        });
    }
}
async function confirmExternalPurchase(tx, registryItemId, quantity) {
    await tx.$queryRaw `SELECT id FROM "GiftRegistryItem" WHERE id = ${registryItemId} FOR UPDATE`;
    const item = await tx.giftRegistryItem.findUnique({ where: { id: registryItemId } });
    if (!item)
        throw new errors_1.ValidationError("Registry gift not found");
    if (remainingQuantity(item) < quantity) {
        throw new errors_1.ConflictError("REGISTRY_QTY_UNAVAILABLE", "This gift no longer has enough remaining quantity");
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
async function reverseExternalPurchase(tx, contributionId) {
    const contribution = await tx.giftRegistryContribution.findUnique({ where: { id: contributionId } });
    if (!contribution || contribution.status !== client_1.GiftContributionStatus.CONFIRMED_EXTERNAL) {
        throw new errors_1.ValidationError("This confirmation cannot be reversed");
    }
    await tx.$queryRaw `SELECT id FROM "GiftRegistryItem" WHERE id = ${contribution.registryItemId} FOR UPDATE`;
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
        data: { status: client_1.GiftContributionStatus.RELEASED },
    });
}
//# sourceMappingURL=registry-qty.js.map