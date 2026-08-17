"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listWishlist = listWishlist;
exports.addToWishlist = addToWishlist;
exports.removeFromWishlist = removeFromWishlist;
exports.isProductWishlisted = isProductWishlisted;
const prisma_1 = require("../../db/prisma");
const errors_1 = require("../../lib/errors");
const wishlistInclude = {
    product: {
        include: {
            images: { include: { media: true }, orderBy: { displayOrder: "asc" }, take: 1 },
            inventory: true,
        },
    },
};
function shapeWishlistItem(item) {
    return {
        id: item.id,
        productId: item.productId,
        title: item.product.title,
        slug: item.product.slug,
        priceInPaise: item.product.priceInPaise,
        image: item.product.images[0]?.media ?? null,
        isActive: item.product.isActive,
        stockStatus: item.product.inventory?.statusFlag ?? "OUT_OF_STOCK",
        addedAt: item.addedAt.toISOString(),
    };
}
async function listWishlist(userId) {
    const items = await prisma_1.prisma.wishlistItem.findMany({ where: { userId }, include: wishlistInclude, orderBy: { addedAt: "desc" } });
    return items.map(shapeWishlistItem);
}
async function addToWishlist(userId, productId) {
    const product = await prisma_1.prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!product)
        throw new errors_1.NotFoundError("Product not found");
    await prisma_1.prisma.wishlistItem.upsert({
        where: { userId_productId: { userId, productId } },
        create: { userId, productId },
        update: {},
    });
    return listWishlist(userId);
}
async function removeFromWishlist(userId, productId) {
    await prisma_1.prisma.wishlistItem.deleteMany({ where: { userId, productId } });
    return listWishlist(userId);
}
async function isProductWishlisted(userId, productId) {
    const item = await prisma_1.prisma.wishlistItem.findUnique({ where: { userId_productId: { userId, productId } } });
    return item !== null;
}
//# sourceMappingURL=wishlist.service.js.map