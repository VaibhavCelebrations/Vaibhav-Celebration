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
const cartItemInclude = {
    product: { include: { images: { include: { media: true }, orderBy: { displayOrder: "asc" }, take: 1 }, inventory: true } },
};
async function getOrCreateCart(userId) {
    const existing = await prisma_1.prisma.cart.findUnique({ where: { userId } });
    if (existing)
        return existing;
    return prisma_1.prisma.cart.create({ data: { userId } });
}
function shapeCartItem(item) {
    return {
        id: item.id,
        productId: item.productId,
        title: item.product.title,
        slug: item.product.slug,
        unitPriceInPaise: item.product.priceInPaise,
        quantity: item.quantity,
        personalizationValues: item.personalizationValues,
        image: item.product.images[0]?.media ?? null,
        isActive: item.product.isActive,
        stockAvailable: item.product.inventory?.quantityAvailable ?? 0,
        stockStatus: item.product.inventory?.statusFlag ?? "OUT_OF_STOCK",
        maxOrderQuantity: item.product.maxOrderQuantity,
    };
}
async function getCart(userId) {
    const cart = await getOrCreateCart(userId);
    const items = await prisma_1.prisma.cartItem.findMany({ where: { cartId: cart.id }, include: cartItemInclude, orderBy: { addedAt: "asc" } });
    const shaped = items.map(shapeCartItem);
    const quote = await (0, cart_pricing_service_1.computeQuote)(shaped.filter((i) => i.isActive).map((i) => ({ productId: i.productId, unitPriceInPaise: i.unitPriceInPaise, quantity: i.quantity })));
    return { items: shaped, quote, itemCount: shaped.reduce((sum, i) => sum + i.quantity, 0) };
}
async function assertPurchasable(productId, requestedQuantity) {
    const product = await prisma_1.prisma.product.findFirst({
        where: { id: productId, deletedAt: null },
        include: { inventory: true },
    });
    if (!product || !product.isActive)
        throw new errors_1.NotFoundError("Product not found or unavailable");
    if (requestedQuantity < product.minOrderQuantity) {
        throw new errors_1.ValidationError(`Minimum order quantity for this product is ${product.minOrderQuantity}`);
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
async function addCartItem(userId, input) {
    const cart = await getOrCreateCart(userId);
    const existing = await prisma_1.prisma.cartItem.findUnique({ where: { cartId_productId: { cartId: cart.id, productId: input.productId } } });
    const nextQuantity = (existing?.quantity ?? 0) + input.quantity;
    await assertPurchasable(input.productId, nextQuantity);
    await prisma_1.prisma.cartItem.upsert({
        where: { cartId_productId: { cartId: cart.id, productId: input.productId } },
        create: {
            cartId: cart.id,
            productId: input.productId,
            quantity: input.quantity,
            personalizationValues: (input.personalizationValues ?? null),
        },
        update: {
            quantity: nextQuantity,
            personalizationValues: (input.personalizationValues ?? existing?.personalizationValues ?? null),
        },
    });
    return getCart(userId);
}
async function updateCartItemQuantity(userId, productId, quantity) {
    const cart = await getOrCreateCart(userId);
    const existing = await prisma_1.prisma.cartItem.findUnique({ where: { cartId_productId: { cartId: cart.id, productId } } });
    if (!existing)
        throw new errors_1.NotFoundError("Item not found in cart");
    if (quantity <= 0) {
        await prisma_1.prisma.cartItem.delete({ where: { id: existing.id } });
        return getCart(userId);
    }
    await assertPurchasable(productId, quantity);
    await prisma_1.prisma.cartItem.update({ where: { id: existing.id }, data: { quantity } });
    return getCart(userId);
}
async function removeCartItem(userId, productId) {
    const cart = await getOrCreateCart(userId);
    await prisma_1.prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
    return getCart(userId);
}
async function clearCart(userId) {
    const cart = await getOrCreateCart(userId);
    await prisma_1.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return getCart(userId);
}
//# sourceMappingURL=cart.service.js.map