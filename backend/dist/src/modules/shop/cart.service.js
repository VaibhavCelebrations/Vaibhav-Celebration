"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCart = getCart;
exports.addCartItem = addCartItem;
exports.updateCartItemQuantity = updateCartItemQuantity;
exports.removeCartItem = removeCartItem;
exports.clearCart = clearCart;
const prisma_1 = require("../../db/prisma");
const errors_1 = require("../../lib/errors");
const cart_pricing_service_1 = require("./cart-pricing.service");
const registry_qty_1 = require("../registry/registry-qty");
const cartItemInclude = {
    product: { include: { images: { include: { media: true }, orderBy: { displayOrder: "asc" }, take: 1 }, inventory: true } },
};
async function getOrCreateCart(userId) {
    const existing = await prisma_1.prisma.cart.findUnique({ where: { userId } });
    if (existing)
        return existing;
    return prisma_1.prisma.cart.create({ data: { userId } });
}
function shapeCartItem(item, registryMeta) {
    const personalizationCostInPaise = item.personalizationSelected ? item.product.personalizationCostInPaise : 0;
    return {
        id: item.id,
        productId: item.productId,
        registryItemId: item.registryItemId || null,
        title: item.product.title,
        slug: item.product.slug,
        unitPriceInPaise: item.product.priceInPaise,
        quantity: item.quantity,
        personalizationValues: item.personalizationValues,
        personalizationSelected: item.personalizationSelected,
        personalizationCostInPaise,
        personalizationEnabled: item.product.personalizationEnabled,
        image: item.product.images[0]?.media ?? null,
        isActive: item.product.isActive,
        stockAvailable: item.product.inventory?.quantityAvailable ?? 0,
        stockStatus: item.product.inventory?.statusFlag ?? "OUT_OF_STOCK",
        maxOrderQuantity: registryMeta ? Math.min(item.product.maxOrderQuantity ?? registryMeta.available, registryMeta.available) : item.product.maxOrderQuantity,
        registry: registryMeta
            ? {
                registryCode: registryMeta.registryCode,
                giftTitle: registryMeta.title,
                recipientName: registryMeta.recipientName,
            }
            : null,
    };
}
async function getCart(userId) {
    const cart = await getOrCreateCart(userId);
    const items = await prisma_1.prisma.cartItem.findMany({ where: { cartId: cart.id }, include: cartItemInclude, orderBy: { addedAt: "asc" } });
    const registryIds = items.map((i) => i.registryItemId).filter(Boolean);
    const registryItems = registryIds.length
        ? await prisma_1.prisma.giftRegistryItem.findMany({
            where: { id: { in: registryIds } },
            include: { registry: true, internalProduct: true },
        })
        : [];
    const registryMap = new Map(registryItems.map((r) => [r.id, r]));
    const shaped = items.map((item) => {
        const registryItem = item.registryItemId ? registryMap.get(item.registryItemId) : undefined;
        return shapeCartItem(item, registryItem
            ? {
                registryCode: registryItem.registry.registryCode,
                title: registryItem.internalProduct?.title ?? registryItem.manualTitle ?? "Registry gift",
                recipientName: registryItem.registry.ownerDisplayName ?? registryItem.registry.childOrPersonName,
                available: (0, registry_qty_1.availableToReserve)(registryItem) + item.quantity,
            }
            : null);
    });
    const quote = await (0, cart_pricing_service_1.computeQuote)(shaped
        .filter((i) => i.isActive)
        .map((i) => ({
        productId: i.productId,
        unitPriceInPaise: i.unitPriceInPaise,
        quantity: i.quantity,
        personalizationCostInPaise: i.personalizationCostInPaise,
    })));
    return { items: shaped, quote, itemCount: shaped.reduce((sum, i) => sum + i.quantity, 0) };
}
async function assertPurchasable(productId, requestedQuantity) {
    const product = await prisma_1.prisma.product.findFirst({
        where: { id: productId, deletedAt: null },
        include: { inventory: true },
    });
    if (!product || !product.isActive)
        throw new errors_1.NotFoundError("Product not found or unavailable");
    // Shop / retail checkout allows qty 1+. Package builder still uses
    // product.minOrderQuantity for per-child event quotes.
    if (requestedQuantity < 1) {
        throw new errors_1.ValidationError("Quantity must be at least 1");
    }
    if (product.maxOrderQuantity && requestedQuantity > product.maxOrderQuantity) {
        throw new errors_1.ValidationError(`Maximum order quantity for this product is ${product.maxOrderQuantity}`);
    }
    const available = product.inventory?.quantityAvailable ?? 0;
    if (available < requestedQuantity) {
        throw new errors_1.ValidationError(`Only ${available} left in stock`, { available });
    }
    return product;
}
function hasPersonalizationValues(values) {
    if (Array.isArray(values) && values.length > 0)
        return true;
    if (values && typeof values === "object" && Object.keys(values).length > 0)
        return true;
    return false;
}
async function addCartItem(userId, input) {
    const cart = await getOrCreateCart(userId);
    const registryItemId = input.registryItemId ?? "";
    const existing = await prisma_1.prisma.cartItem.findUnique({
        where: { cartId_productId_registryItemId: { cartId: cart.id, productId: input.productId, registryItemId } },
    });
    const nextQuantity = (existing?.quantity ?? 0) + input.quantity;
    const product = await assertPurchasable(input.productId, nextQuantity);
    if (registryItemId) {
        const registryItem = await prisma_1.prisma.giftRegistryItem.findFirst({
            where: { id: registryItemId, internalProductId: input.productId },
            include: { registry: true },
        });
        if (!registryItem)
            throw new errors_1.ValidationError("Registry gift not found");
        const alreadyInCart = existing?.quantity ?? 0;
        if ((0, registry_qty_1.availableToReserve)(registryItem) < nextQuantity - alreadyInCart) {
            throw new errors_1.ValidationError("Not enough remaining quantity on this registry gift");
        }
    }
    const wantsPersonalization = hasPersonalizationValues(input.personalizationValues) || existing?.personalizationSelected;
    const selected = Boolean(product.personalizationEnabled && wantsPersonalization);
    const cost = selected ? product.personalizationCostInPaise : 0;
    const values = input.personalizationValues ?? existing?.personalizationValues ?? null;
    await prisma_1.prisma.cartItem.upsert({
        where: { cartId_productId_registryItemId: { cartId: cart.id, productId: input.productId, registryItemId } },
        create: {
            cartId: cart.id,
            productId: input.productId,
            registryItemId,
            quantity: input.quantity,
            personalizationValues: values,
            personalizationSelected: selected,
            personalizationCostSnapshot: cost,
        },
        update: {
            quantity: nextQuantity,
            personalizationValues: values,
            personalizationSelected: selected,
            personalizationCostSnapshot: cost,
        },
    });
    return getCart(userId);
}
async function findCartLine(cartId, key) {
    return prisma_1.prisma.cartItem.findFirst({
        where: { cartId, OR: [{ id: key }, { productId: key, registryItemId: "" }] },
    });
}
async function updateCartItemQuantity(userId, productId, quantity) {
    const cart = await getOrCreateCart(userId);
    const existing = await findCartLine(cart.id, productId);
    if (!existing)
        throw new errors_1.NotFoundError("Item not found in cart");
    if (quantity <= 0) {
        await prisma_1.prisma.cartItem.delete({ where: { id: existing.id } });
        return getCart(userId);
    }
    await assertPurchasable(existing.productId, quantity);
    if (existing.registryItemId) {
        const registryItem = await prisma_1.prisma.giftRegistryItem.findFirst({ where: { id: existing.registryItemId } });
        if (registryItem && (0, registry_qty_1.availableToReserve)(registryItem) + existing.quantity < quantity) {
            throw new errors_1.ValidationError("Not enough remaining quantity on this registry gift");
        }
    }
    await prisma_1.prisma.cartItem.update({ where: { id: existing.id }, data: { quantity } });
    return getCart(userId);
}
async function removeCartItem(userId, productId) {
    const cart = await getOrCreateCart(userId);
    const existing = await findCartLine(cart.id, productId);
    if (existing)
        await prisma_1.prisma.cartItem.delete({ where: { id: existing.id } });
    else
        await prisma_1.prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
    return getCart(userId);
}
async function clearCart(userId) {
    const cart = await getOrCreateCart(userId);
    await prisma_1.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return getCart(userId);
}
//# sourceMappingURL=cart.service.js.map