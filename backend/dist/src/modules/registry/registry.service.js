"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRegistriesForOwner = listRegistriesForOwner;
exports.createRegistry = createRegistry;
exports.getRegistryForOwner = getRegistryForOwner;
exports.updateRegistry = updateRegistry;
exports.addRegistryItem = addRegistryItem;
exports.deleteRegistryItem = deleteRegistryItem;
exports.getPublicRegistry = getPublicRegistry;
exports.giftRegistryItem = giftRegistryItem;
exports.adminListRegistries = adminListRegistries;
exports.adminGetRegistry = adminGetRegistry;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
const env_1 = require("../../config/env");
const errors_1 = require("../../lib/errors");
const sequences_1 = require("../../lib/sequences");
const orders_service_1 = require("../orders/orders.service");
const registryItemInclude = {
    internalProduct: { include: { images: { include: { media: true }, take: 1, orderBy: { displayOrder: "asc" } }, inventory: true } },
};
function shapeItem(item) {
    const title = item.internalProduct?.title ?? item.manualTitle ?? "Gift item";
    const priceInPaise = item.internalProduct?.priceInPaise ?? item.manualPriceInPaise ?? null;
    const internalMedia = item.internalProduct?.images[0]?.media;
    const image = internalMedia
        ? { url: internalMedia.url, altText: internalMedia.altText }
        : item.manualImageUrl
            ? { url: item.manualImageUrl, altText: null }
            : null;
    return {
        id: item.id,
        sourceType: item.sourceType,
        title,
        priceInPaise,
        image,
        externalUrl: item.externalUrl,
        internalProductId: item.internalProductId,
        internalProductSlug: item.internalProduct?.slug ?? null,
        canGiftDirectly: item.sourceType === client_1.GiftLinkSourceType.INTERNAL_PRODUCT && item.status === client_1.GiftItemStatus.AVAILABLE,
        inStock: item.internalProduct ? (item.internalProduct.inventory?.quantityAvailable ?? 0) > 0 : true,
        status: item.status,
        displayOrder: item.displayOrder,
    };
}
function shapeRegistry(registry) {
    return {
        id: registry.id,
        registryCode: registry.registryCode,
        childOrPersonName: registry.childOrPersonName,
        celebrationDetails: registry.celebrationDetails,
        photoMediaId: registry.photoMediaId,
        status: registry.status,
        activatedAt: registry.activatedAt.toISOString(),
        expiresAt: registry.expiresAt.toISOString(),
        ownerUserId: registry.ownerUserId,
        shareUrl: `${env_1.env.FRONTEND_URL}/registry/${registry.registryCode}`,
    };
}
async function effectiveStatus(registry) {
    if (registry.status === client_1.RegistryStatus.ACTIVE && registry.expiresAt < new Date()) {
        await prisma_1.prisma.giftRegistry.update({ where: { id: registry.id }, data: { status: client_1.RegistryStatus.EXPIRED } });
        return client_1.RegistryStatus.EXPIRED;
    }
    return registry.status;
}
// ─── Owner-facing (requireCustomer) ──────────────────────────────────────────
async function listRegistriesForOwner(userId) {
    const rows = await prisma_1.prisma.giftRegistry.findMany({ where: { ownerUserId: userId }, orderBy: { createdAt: "desc" } });
    return rows.map(shapeRegistry);
}
async function createRegistry(userId, input) {
    const registryCode = await (0, sequences_1.nextRegistryCode)();
    const passwordHash = await bcryptjs_1.default.hash(input.password, 12);
    const expiresAt = new Date(Date.now() + env_1.env.GIFT_REGISTRY_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
    const registry = await prisma_1.prisma.giftRegistry.create({
        data: {
            registryCode,
            passwordHash,
            ownerUserId: userId,
            bookingId: input.bookingId,
            childOrPersonName: input.childOrPersonName,
            celebrationDetails: input.celebrationDetails,
            photoMediaId: input.photoMediaId,
            shippingAddress: (input.shippingAddress ?? null),
            expiresAt,
        },
    });
    return shapeRegistry(registry);
}
async function assertOwner(userId, registryId) {
    const registry = await prisma_1.prisma.giftRegistry.findFirst({ where: { id: registryId } });
    if (!registry)
        throw new errors_1.NotFoundError("Registry not found");
    if (registry.ownerUserId !== userId)
        throw new errors_1.ForbiddenError("You do not own this registry");
    return registry;
}
async function getRegistryForOwner(userId, registryId) {
    const registry = await assertOwner(userId, registryId);
    const items = await prisma_1.prisma.giftRegistryItem.findMany({
        where: { registryId },
        include: registryItemInclude,
        orderBy: { displayOrder: "asc" },
    });
    return { ...shapeRegistry(registry), items: items.map(shapeItem) };
}
async function updateRegistry(userId, registryId, input) {
    await assertOwner(userId, registryId);
    const registry = await prisma_1.prisma.giftRegistry.update({
        where: { id: registryId },
        data: {
            childOrPersonName: input.childOrPersonName,
            celebrationDetails: input.celebrationDetails,
            photoMediaId: input.photoMediaId,
            shippingAddress: input.shippingAddress,
            status: input.status,
        },
    });
    return shapeRegistry(registry);
}
async function addRegistryItem(userId, registryId, input) {
    await assertOwner(userId, registryId);
    if (input.sourceType === client_1.GiftLinkSourceType.INTERNAL_PRODUCT && !input.internalProductId) {
        throw new errors_1.ValidationError("internalProductId is required for internal product items");
    }
    if (input.sourceType === client_1.GiftLinkSourceType.EXTERNAL_LINK && !input.externalUrl && !input.manualTitle) {
        throw new errors_1.ValidationError("Provide at least a title or a link for external gift items");
    }
    const maxOrder = await prisma_1.prisma.giftRegistryItem.aggregate({ where: { registryId }, _max: { displayOrder: true } });
    const item = await prisma_1.prisma.giftRegistryItem.create({
        data: {
            registryId,
            sourceType: input.sourceType,
            externalUrl: input.externalUrl,
            manualTitle: input.manualTitle,
            manualImageUrl: input.manualImageUrl,
            manualPriceInPaise: input.manualPriceInPaise,
            internalProductId: input.internalProductId,
            displayOrder: (maxOrder._max.displayOrder ?? 0) + 1,
        },
        include: registryItemInclude,
    });
    return shapeItem(item);
}
async function deleteRegistryItem(userId, registryId, itemId) {
    await assertOwner(userId, registryId);
    const result = await prisma_1.prisma.giftRegistryItem.deleteMany({ where: { id: itemId, registryId } });
    if (!result.count)
        throw new errors_1.NotFoundError("Registry item not found");
}
// ─── Public share view (registryCode + password) ─────────────────────────────
async function getPublicRegistry(registryCode, password) {
    const registry = await prisma_1.prisma.giftRegistry.findFirst({ where: { registryCode } });
    if (!registry)
        throw new errors_1.NotFoundError("Registry not found");
    const valid = await bcryptjs_1.default.compare(password, registry.passwordHash);
    if (!valid)
        throw new errors_1.UnauthorizedError("Incorrect registry password");
    const status = await effectiveStatus(registry);
    if (status !== client_1.RegistryStatus.ACTIVE) {
        throw new errors_1.ForbiddenError(status === client_1.RegistryStatus.EXPIRED ? "This registry has expired" : "This registry is closed");
    }
    const items = await prisma_1.prisma.giftRegistryItem.findMany({
        where: { registryId: registry.id },
        include: registryItemInclude,
        orderBy: { displayOrder: "asc" },
    });
    return {
        registryCode: registry.registryCode,
        childOrPersonName: registry.childOrPersonName,
        celebrationDetails: registry.celebrationDetails,
        photoMediaId: registry.photoMediaId,
        expiresAt: registry.expiresAt.toISOString(),
        items: items.map(shapeItem),
    };
}
/**
 * Authenticated gifting: a signed-in gifter purchases an INTERNAL_PRODUCT
 * registry item through the exact same order/payment pipeline as regular
 * shop checkout (createDirectOrder → Razorpay → webhook → markOrderPaid),
 * so backend-only pricing and inventory guarantees apply here too.
 */
async function giftRegistryItem(gifterUserId, registryCode, itemId, password, input) {
    const registry = await prisma_1.prisma.giftRegistry.findFirst({ where: { registryCode } });
    if (!registry)
        throw new errors_1.NotFoundError("Registry not found");
    const valid = await bcryptjs_1.default.compare(password, registry.passwordHash);
    if (!valid)
        throw new errors_1.UnauthorizedError("Incorrect registry password");
    const status = await effectiveStatus(registry);
    if (status !== client_1.RegistryStatus.ACTIVE)
        throw new errors_1.ForbiddenError("This registry is no longer accepting gifts");
    const item = await prisma_1.prisma.giftRegistryItem.findFirst({ where: { id: itemId, registryId: registry.id } });
    if (!item)
        throw new errors_1.NotFoundError("Registry item not found");
    if (item.sourceType !== client_1.GiftLinkSourceType.INTERNAL_PRODUCT || !item.internalProductId) {
        throw new errors_1.ValidationError("This item is an external link — purchase it directly from the linked store");
    }
    if (item.status !== client_1.GiftItemStatus.AVAILABLE) {
        throw new errors_1.ValidationError("This item has already been gifted by someone else");
    }
    const order = await (0, orders_service_1.createDirectOrder)(gifterUserId, {
        productId: item.internalProductId,
        quantity: 1,
        shippingAddress: input.shippingAddress,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
    });
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.giftRegistryItem.update({ where: { id: item.id }, data: { status: client_1.GiftItemStatus.RESERVED } }),
        prisma_1.prisma.giftRegistryContribution.create({
            data: { registryItemId: item.id, gifterUserId, orderId: order.orderId },
        }),
    ]);
    return order;
}
// ─── Admin (read-only operational visibility) ────────────────────────────────
async function adminListRegistries(q) {
    const { parsePagination } = await Promise.resolve().then(() => __importStar(require("../../lib/response")));
    const { page, pageSize, skip, take } = parsePagination(q);
    const where = q.search
        ? {
            OR: [
                { registryCode: { contains: q.search, mode: "insensitive" } },
                { childOrPersonName: { contains: q.search, mode: "insensitive" } },
            ],
        }
        : {};
    const [rows, total] = await Promise.all([
        prisma_1.prisma.giftRegistry.findMany({
            where,
            include: { ownerUser: { select: { name: true, email: true } }, _count: { select: { items: true } } },
            orderBy: { createdAt: "desc" },
            skip,
            take,
        }),
        prisma_1.prisma.giftRegistry.count({ where }),
    ]);
    return {
        items: rows.map((r) => ({ ...shapeRegistry(r), owner: r.ownerUser, itemCount: r._count.items })),
        total,
        page,
        pageSize,
    };
}
async function adminGetRegistry(id) {
    const registry = await prisma_1.prisma.giftRegistry.findFirst({ where: { id }, include: { ownerUser: { select: { name: true, email: true } } } });
    if (!registry)
        throw new errors_1.NotFoundError("Registry not found");
    const items = await prisma_1.prisma.giftRegistryItem.findMany({
        where: { registryId: id },
        include: { ...registryItemInclude, contributions: { include: { gifterUser: { select: { name: true, email: true } } } } },
        orderBy: { displayOrder: "asc" },
    });
    return {
        ...shapeRegistry(registry),
        owner: registry.ownerUser,
        items: items.map((i) => ({
            ...shapeItem(i),
            contributions: i.contributions.map((c) => ({ id: c.id, gifter: c.gifterUser, orderId: c.orderId, createdAt: c.createdAt.toISOString() })),
        })),
    };
}
//# sourceMappingURL=registry.service.js.map