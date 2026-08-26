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
exports.archiveRegistry = archiveRegistry;
exports.previewExternalProduct = previewExternalProduct;
exports.addRegistryItem = addRegistryItem;
exports.updateRegistryItem = updateRegistryItem;
exports.reorderRegistryItems = reorderRegistryItems;
exports.deleteRegistryItem = deleteRegistryItem;
exports.reverseContribution = reverseContribution;
exports.getRegistrySeo = getRegistrySeo;
exports.getPublicRegistry = getPublicRegistry;
exports.giftRegistryItem = giftRegistryItem;
exports.confirmExternalGift = confirmExternalGift;
exports.adminListRegistries = adminListRegistries;
exports.adminGetRegistry = adminGetRegistry;
exports.adminUpdateRegistry = adminUpdateRegistry;
exports.adminListExtractions = adminListExtractions;
exports.adminRetryExtraction = adminRetryExtraction;
exports.adminOverrideExtraction = adminOverrideExtraction;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
const env_1 = require("../../config/env");
const storage_1 = require("../../integrations/media/storage");
const errors_1 = require("../../lib/errors");
const sequences_1 = require("../../lib/sequences");
const orders_service_1 = require("../orders/orders.service");
const upgrades_service_1 = require("../upgrades/upgrades.service");
const address_1 = require("./address");
const extract_service_1 = require("./extract.service");
const registry_qty_1 = require("./registry-qty");
const registryItemInclude = {
    internalProduct: {
        include: {
            images: { include: { media: true }, take: 1, orderBy: { displayOrder: "asc" } },
            inventory: true,
        },
    },
};
function itemStatus(item) {
    return (0, registry_qty_1.derivedItemStatus)(item);
}
function shapeItem(item) {
    const title = item.internalProduct?.title ?? item.manualTitle ?? "Gift item";
    const priceInPaise = item.internalProduct?.priceInPaise ?? item.manualPriceInPaise ?? null;
    const internalMedia = item.internalProduct?.images[0]?.media;
    const image = internalMedia
        ? { url: internalMedia.url, altText: internalMedia.altText }
        : item.manualImageUrl
            ? { url: item.manualImageUrl, altText: title }
            : null;
    const remaining = (0, registry_qty_1.remainingQuantity)(item);
    const available = (0, registry_qty_1.availableToReserve)(item);
    const status = itemStatus(item);
    return {
        id: item.id,
        sourceType: item.sourceType,
        title,
        description: item.description,
        notes: item.notes,
        priceInPaise,
        currency: item.currency || "INR",
        image,
        externalUrl: item.externalUrl,
        canonicalUrl: item.canonicalUrl,
        storeName: item.storeName,
        internalProductId: item.internalProductId,
        internalProductSlug: item.internalProduct?.slug ?? null,
        canGiftDirectly: item.sourceType === client_1.GiftLinkSourceType.INTERNAL_PRODUCT && available > 0,
        inStock: item.internalProduct ? (item.internalProduct.inventory?.quantityAvailable ?? 0) > 0 : true,
        status,
        quantityDesired: item.quantityDesired,
        quantityPurchased: item.quantityPurchased,
        quantityReserved: item.quantityReserved,
        remaining,
        available,
        priority: item.priority,
        displayOrder: item.displayOrder,
        extractionStatus: item.extractionStatus,
        extractionMethod: item.extractionMethod,
        extractionError: item.extractionError,
    };
}
function publicAddress(address) {
    if (!address)
        return null;
    return {
        recipientName: address.fullName,
        line1: address.line1,
        line2: address.line2 ?? null,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        country: address.country,
        formatted: (0, address_1.formatAddressText)(address),
    };
}
function shapeRegistry(registry, options) {
    const address = (0, address_1.parseShippingAddress)(registry.shippingAddress);
    return {
        id: registry.id,
        registryCode: registry.registryCode,
        title: registry.title || registry.childOrPersonName || `Registry ${registry.registryCode}`,
        occasion: registry.occasion,
        eventDate: registry.eventDate?.toISOString() ?? null,
        ownerDisplayName: registry.ownerDisplayName || registry.childOrPersonName,
        childOrPersonName: registry.childOrPersonName,
        celebrationDetails: registry.celebrationDetails,
        giftPreferences: registry.giftPreferences,
        photoMediaId: registry.photoMediaId,
        coverImageUrl: registry.coverImageUrl,
        visibility: registry.visibility,
        status: registry.status,
        viewCount: registry.viewCount,
        publishedAt: registry.publishedAt?.toISOString() ?? null,
        activatedAt: registry.activatedAt.toISOString(),
        expiresAt: registry.expiresAt.toISOString(),
        ownerUserId: registry.ownerUserId,
        shareUrl: `${env_1.env.FRONTEND_URL}/registry/${registry.registryCode}`,
        hasPassword: Boolean(registry.passwordHash),
        shippingAddress: publicAddress(address),
        contactEmail: options?.includePrivate ? registry.contactEmail : undefined,
        contactPhone: options?.includePrivate ? registry.contactPhone : undefined,
    };
}
async function effectiveStatus(registry) {
    if (registry.status === client_1.RegistryStatus.ACTIVE && registry.expiresAt < new Date()) {
        await prisma_1.prisma.giftRegistry.update({ where: { id: registry.id }, data: { status: client_1.RegistryStatus.EXPIRED } });
        return client_1.RegistryStatus.EXPIRED;
    }
    return registry.status;
}
function statsForItems(items) {
    const remaining = items.reduce((sum, i) => sum + (0, registry_qty_1.remainingQuantity)(i), 0);
    const purchased = items.reduce((sum, i) => sum + i.quantityPurchased, 0);
    const desired = items.reduce((sum, i) => sum + i.quantityDesired, 0);
    return {
        totalGifts: items.length,
        quantityDesired: desired,
        quantityPurchased: purchased,
        quantityRemaining: remaining,
        internalCount: items.filter((i) => i.sourceType === client_1.GiftLinkSourceType.INTERNAL_PRODUCT).length,
        externalCount: items.filter((i) => i.sourceType === client_1.GiftLinkSourceType.EXTERNAL_LINK).length,
    };
}
async function listRegistriesForOwner(userId) {
    const rows = await prisma_1.prisma.giftRegistry.findMany({
        where: { ownerUserId: userId, status: { not: client_1.RegistryStatus.ARCHIVED } },
        include: { items: true },
        orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => ({ ...shapeRegistry(r, { includePrivate: true }), stats: statsForItems(r.items) }));
}
async function createRegistry(userId, input) {
    const parent = await (0, upgrades_service_1.assertGiftRegistryEntitlement)(userId, input.sourceOrderCode);
    const existing = await prisma_1.prisma.giftRegistry.findFirst({
        where: { sourceOrderId: parent.id, ownerUserId: userId, status: { not: client_1.RegistryStatus.ARCHIVED } },
    });
    if (existing) {
        throw new errors_1.ValidationError("A gift registry already exists for this celebration");
    }
    const visibility = input.visibility ?? client_1.RegistryVisibility.UNLISTED;
    if (visibility === client_1.RegistryVisibility.PRIVATE && !input.password) {
        throw new errors_1.ValidationError("A password is required for private registries");
    }
    const registryCode = await (0, sequences_1.nextRegistryCode)();
    const passwordHash = input.password ? await bcryptjs_1.default.hash(input.password, 12) : null;
    const expiresAt = new Date(Date.now() + env_1.env.GIFT_REGISTRY_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
    const eventDate = input.eventDate
        ? new Date(input.eventDate)
        : parent.eventDate;
    const registry = await prisma_1.prisma.giftRegistry.create({
        data: {
            registryCode,
            passwordHash,
            ownerUserId: userId,
            sourceOrderId: parent.id,
            title: input.title,
            occasion: input.occasion,
            eventDate,
            ownerDisplayName: input.ownerDisplayName,
            contactEmail: input.contactEmail,
            contactPhone: input.contactPhone,
            childOrPersonName: input.childOrPersonName,
            celebrationDetails: input.celebrationDetails,
            giftPreferences: input.giftPreferences,
            photoMediaId: input.photoMediaId,
            coverImageUrl: input.coverImageUrl,
            shippingAddress: (input.shippingAddress ?? null),
            visibility,
            status: client_1.RegistryStatus.DRAFT,
            expiresAt,
        },
    });
    return shapeRegistry(registry, { includePrivate: true });
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
        include: {
            ...registryItemInclude,
            contributions: {
                where: { status: { in: [client_1.GiftContributionStatus.PAID, client_1.GiftContributionStatus.CONFIRMED_EXTERNAL, client_1.GiftContributionStatus.PENDING] } },
                include: { gifterUser: { select: { name: true, email: true } }, order: { select: { orderCode: true, status: true, paymentStatus: true } } },
                orderBy: { createdAt: "desc" },
            },
        },
        orderBy: [{ priority: "desc" }, { displayOrder: "asc" }],
    });
    const orders = await prisma_1.prisma.order.findMany({
        where: { registryId: registry.id, paymentStatus: "PAID" },
        select: { id: true, orderCode: true, totalInPaise: true, paymentStatus: true, status: true, placedAt: true, user: { select: { name: true, email: true } } },
        orderBy: { placedAt: "desc" },
        take: 50,
    });
    return {
        ...shapeRegistry(registry, { includePrivate: true }),
        stats: statsForItems(items),
        items: items.map((item) => ({
            ...shapeItem(item),
            contributions: item.contributions.map((c) => ({
                id: c.id,
                quantity: c.quantity,
                status: c.status,
                guestName: c.guestName ?? c.gifterUser?.name ?? null,
                guestEmail: c.guestEmail ?? c.gifterUser?.email ?? null,
                orderCode: c.order?.orderCode ?? null,
                createdAt: c.createdAt.toISOString(),
            })),
        })),
        orders,
    };
}
async function updateRegistry(userId, registryId, input) {
    const current = await assertOwner(userId, registryId);
    const visibility = input.visibility ?? current.visibility;
    let passwordHash;
    if (input.password)
        passwordHash = await bcryptjs_1.default.hash(input.password, 12);
    if (visibility === client_1.RegistryVisibility.PRIVATE && !current.passwordHash && !input.password) {
        throw new errors_1.ValidationError("A password is required for private registries");
    }
    const nextStatus = input.status;
    const registry = await prisma_1.prisma.giftRegistry.update({
        where: { id: registryId },
        data: {
            title: input.title,
            occasion: input.occasion,
            eventDate: input.eventDate === undefined ? undefined : input.eventDate ? new Date(input.eventDate) : null,
            ownerDisplayName: input.ownerDisplayName,
            contactEmail: input.contactEmail,
            contactPhone: input.contactPhone,
            childOrPersonName: input.childOrPersonName,
            celebrationDetails: input.celebrationDetails,
            giftPreferences: input.giftPreferences,
            photoMediaId: input.photoMediaId,
            coverImageUrl: input.coverImageUrl,
            shippingAddress: input.shippingAddress,
            visibility,
            passwordHash,
            status: nextStatus,
            publishedAt: nextStatus === client_1.RegistryStatus.ACTIVE && !current.publishedAt
                ? new Date()
                : nextStatus === client_1.RegistryStatus.DRAFT
                    ? null
                    : undefined,
        },
    });
    return shapeRegistry(registry, { includePrivate: true });
}
async function archiveRegistry(userId, registryId) {
    await assertOwner(userId, registryId);
    const registry = await prisma_1.prisma.giftRegistry.update({
        where: { id: registryId },
        data: { status: client_1.RegistryStatus.ARCHIVED, sourceOrderId: null },
    });
    return shapeRegistry(registry, { includePrivate: true });
}
async function previewExternalProduct(userId, url, force) {
    if (!userId)
        throw new errors_1.UnauthorizedError();
    return (0, extract_service_1.extractExternalProduct)(url, { force });
}
async function addRegistryItem(userId, registryId, input) {
    await assertOwner(userId, registryId);
    if (input.sourceType === client_1.GiftLinkSourceType.INTERNAL_PRODUCT && !input.internalProductId) {
        throw new errors_1.ValidationError("internalProductId is required for internal product items");
    }
    if (input.sourceType === client_1.GiftLinkSourceType.EXTERNAL_LINK && !input.externalUrl && !input.manualTitle) {
        throw new errors_1.ValidationError("Provide at least a title or a link for external gift items");
    }
    let extracted = null;
    if (input.sourceType === client_1.GiftLinkSourceType.EXTERNAL_LINK && input.externalUrl && !input.manualTitle) {
        extracted = await (0, extract_service_1.extractExternalProduct)(input.externalUrl);
    }
    else if (input.sourceType === client_1.GiftLinkSourceType.EXTERNAL_LINK && input.externalUrl) {
        extracted = await (0, extract_service_1.extractExternalProduct)(input.externalUrl).catch(() => null);
    }
    const maxOrder = await prisma_1.prisma.giftRegistryItem.aggregate({ where: { registryId }, _max: { displayOrder: true } });
    const quantityDesired = Math.max(1, input.quantityDesired ?? 1);
    const item = await prisma_1.prisma.giftRegistryItem.create({
        data: {
            registryId,
            sourceType: input.sourceType,
            externalUrl: input.externalUrl,
            canonicalUrl: extracted?.canonicalUrl ?? input.externalUrl,
            storeName: input.storeName ?? extracted?.storeName,
            description: input.description ?? extracted?.description,
            notes: input.notes,
            manualTitle: input.manualTitle ?? extracted?.title,
            manualImageUrl: input.manualImageUrl ?? extracted?.image,
            manualPriceInPaise: input.manualPriceInPaise ?? extracted?.priceInPaise,
            currency: input.currency ?? extracted?.currency ?? "INR",
            internalProductId: input.internalProductId,
            quantityDesired,
            priority: input.priority ?? 0,
            displayOrder: (maxOrder._max.displayOrder ?? 0) + 1,
            extractionStatus: extracted?.extractionStatus ?? (input.manualTitle ? client_1.ExtractionStatus.MANUAL : client_1.ExtractionStatus.MANUAL),
            extractionMethod: extracted?.extractionMethod,
            extractionError: extracted?.extractionError,
            extractedAt: extracted ? new Date() : null,
        },
        include: registryItemInclude,
    });
    return shapeItem(item);
}
async function updateRegistryItem(userId, registryId, itemId, input) {
    await assertOwner(userId, registryId);
    const existing = await prisma_1.prisma.giftRegistryItem.findFirst({ where: { id: itemId, registryId } });
    if (!existing)
        throw new errors_1.NotFoundError("Registry item not found");
    if (input.quantityDesired !== undefined && input.quantityDesired < existing.quantityPurchased) {
        throw new errors_1.ValidationError("Requested quantity cannot be below the amount already purchased");
    }
    const nextImage = input.manualImageUrl === undefined ? existing.manualImageUrl : input.manualImageUrl?.trim() || null;
    if (existing.manualImageUrl && existing.manualImageUrl !== nextImage) {
        await (0, storage_1.deleteRegistryHostedImage)(existing.manualImageUrl);
    }
    const updated = await prisma_1.prisma.giftRegistryItem.update({
        where: { id: itemId },
        data: {
            manualTitle: input.manualTitle,
            manualImageUrl: input.manualImageUrl === undefined ? undefined : nextImage,
            manualPriceInPaise: input.manualPriceInPaise === undefined ? undefined : input.manualPriceInPaise,
            currency: input.currency,
            storeName: input.storeName,
            description: input.description,
            notes: input.notes,
            quantityDesired: input.quantityDesired,
            priority: input.priority,
            displayOrder: input.displayOrder,
            externalUrl: input.externalUrl,
            status: input.quantityDesired !== undefined
                ? (0, registry_qty_1.derivedItemStatus)({ quantityDesired: input.quantityDesired, quantityPurchased: existing.quantityPurchased })
                : undefined,
        },
        include: registryItemInclude,
    });
    return shapeItem(updated);
}
async function reorderRegistryItems(userId, registryId, itemIds) {
    await assertOwner(userId, registryId);
    await prisma_1.prisma.$transaction(itemIds.map((id, index) => prisma_1.prisma.giftRegistryItem.updateMany({ where: { id, registryId }, data: { displayOrder: index + 1 } })));
    return { reordered: true };
}
async function deleteRegistryItem(userId, registryId, itemId) {
    await assertOwner(userId, registryId);
    const item = await prisma_1.prisma.giftRegistryItem.findFirst({ where: { id: itemId, registryId } });
    if (!item)
        throw new errors_1.NotFoundError("Registry item not found");
    if (item.quantityPurchased > 0) {
        throw new errors_1.ValidationError("This gift has purchases and cannot be deleted. Archive the note or reduce remaining quantity instead.");
    }
    await (0, storage_1.deleteRegistryHostedImage)(item.manualImageUrl);
    await prisma_1.prisma.giftRegistryItem.delete({ where: { id: itemId } });
}
async function reverseContribution(userId, registryId, contributionId) {
    await assertOwner(userId, registryId);
    const contribution = await prisma_1.prisma.giftRegistryContribution.findFirst({
        where: { id: contributionId, registryItem: { registryId } },
    });
    if (!contribution)
        throw new errors_1.NotFoundError("Contribution not found");
    await prisma_1.prisma.$transaction((tx) => (0, registry_qty_1.reverseExternalPurchase)(tx, contributionId));
    return { reversed: true };
}
async function loadPublicRegistry(registryCode, password) {
    const registry = await prisma_1.prisma.giftRegistry.findFirst({ where: { registryCode } });
    if (!registry)
        throw new errors_1.NotFoundError("Registry not found");
    const status = await effectiveStatus(registry);
    if (status === client_1.RegistryStatus.DRAFT || status === client_1.RegistryStatus.ARCHIVED) {
        throw new errors_1.NotFoundError("Registry not found");
    }
    if (status === client_1.RegistryStatus.EXPIRED)
        throw new errors_1.ForbiddenError("This registry has expired");
    if (status === client_1.RegistryStatus.CLOSED)
        throw new errors_1.ForbiddenError("This registry is closed");
    if (registry.visibility === client_1.RegistryVisibility.PRIVATE) {
        if (!password || !registry.passwordHash)
            throw new errors_1.UnauthorizedError("This registry requires a password");
        const valid = await bcryptjs_1.default.compare(password, registry.passwordHash);
        if (!valid)
            throw new errors_1.UnauthorizedError("Incorrect registry password");
    }
    return registry;
}
async function getRegistrySeo(registryCode) {
    const registry = await prisma_1.prisma.giftRegistry.findFirst({ where: { registryCode } });
    if (!registry)
        throw new errors_1.NotFoundError("Registry not found");
    const status = await effectiveStatus(registry);
    const shareable = (status === client_1.RegistryStatus.ACTIVE || status === client_1.RegistryStatus.CLOSED) &&
        registry.visibility !== client_1.RegistryVisibility.PRIVATE;
    const title = registry.title || registry.childOrPersonName || "Gift Registry";
    const description = registry.celebrationDetails ||
        `A gift registry for ${registry.ownerDisplayName || registry.childOrPersonName || "a celebration"} with Vaibhav Celebrations.`;
    return {
        registryCode: registry.registryCode,
        title: shareable ? title : "Private Gift Registry",
        description: shareable ? description.slice(0, 300) : "This gift registry is private.",
        image: shareable ? registry.coverImageUrl : null,
        indexable: shareable && registry.visibility === client_1.RegistryVisibility.PUBLIC,
        shareUrl: `${env_1.env.FRONTEND_URL}/registry/${registry.registryCode}`,
    };
}
async function getPublicRegistry(registryCode, password) {
    const registry = await loadPublicRegistry(registryCode, password);
    await prisma_1.prisma.giftRegistry.update({ where: { id: registry.id }, data: { viewCount: { increment: 1 } } });
    const items = await prisma_1.prisma.giftRegistryItem.findMany({
        where: { registryId: registry.id },
        include: registryItemInclude,
        orderBy: [{ priority: "desc" }, { displayOrder: "asc" }],
    });
    return {
        ...shapeRegistry(registry),
        items: items.map(shapeItem),
        stats: statsForItems(items),
    };
}
async function giftRegistryItem(gifterUserId, registryCode, itemId, input) {
    const registry = await loadPublicRegistry(registryCode, input.password);
    if ((await effectiveStatus(registry)) !== client_1.RegistryStatus.ACTIVE) {
        throw new errors_1.ForbiddenError("This registry is no longer accepting gifts");
    }
    const address = (0, address_1.parseShippingAddress)(registry.shippingAddress);
    if (!address)
        throw new errors_1.ValidationError("This registry does not have a delivery address yet");
    const item = await prisma_1.prisma.giftRegistryItem.findFirst({ where: { id: itemId, registryId: registry.id } });
    if (!item)
        throw new errors_1.NotFoundError("Registry item not found");
    if (item.sourceType !== client_1.GiftLinkSourceType.INTERNAL_PRODUCT || !item.internalProductId) {
        throw new errors_1.ValidationError("This item is an external product — purchase it from the linked store");
    }
    const quantity = Math.max(1, input.quantity ?? 1);
    if ((0, registry_qty_1.availableToReserve)(item) < quantity) {
        throw new errors_1.ValidationError("Not enough remaining quantity for this gift");
    }
    return (0, orders_service_1.createDirectOrder)(gifterUserId, {
        productId: item.internalProductId,
        quantity,
        shippingAddress: address,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        registryItemId: item.id,
        registryId: registry.id,
    });
}
async function confirmExternalGift(registryCode, itemId, input) {
    const registry = await loadPublicRegistry(registryCode, input.password);
    const item = await prisma_1.prisma.giftRegistryItem.findFirst({ where: { id: itemId, registryId: registry.id } });
    if (!item)
        throw new errors_1.NotFoundError("Registry item not found");
    if (item.sourceType !== client_1.GiftLinkSourceType.EXTERNAL_LINK) {
        throw new errors_1.ValidationError("Use checkout to purchase Vaibhav Celebrations gifts");
    }
    const quantity = Math.max(1, input.quantity ?? 1);
    await prisma_1.prisma.$transaction(async (tx) => {
        await (0, registry_qty_1.confirmExternalPurchase)(tx, item.id, quantity);
        await tx.giftRegistryContribution.create({
            data: {
                registryItemId: item.id,
                gifterUserId: input.gifterUserId,
                guestName: input.guestName,
                guestEmail: input.guestEmail,
                quantity,
                status: client_1.GiftContributionStatus.CONFIRMED_EXTERNAL,
            },
        });
    });
    const updated = await prisma_1.prisma.giftRegistryItem.findFirst({ where: { id: item.id }, include: registryItemInclude });
    return shapeItem(updated);
}
async function adminListRegistries(q) {
    const { parsePagination } = await Promise.resolve().then(() => __importStar(require("../../lib/response")));
    const { page, pageSize, skip, take } = parsePagination(q);
    const where = {
        ...(q.status ? { status: q.status } : {}),
        ...(q.visibility ? { visibility: q.visibility } : {}),
        ...(q.search
            ? {
                OR: [
                    { registryCode: { contains: q.search, mode: "insensitive" } },
                    { childOrPersonName: { contains: q.search, mode: "insensitive" } },
                    { title: { contains: q.search, mode: "insensitive" } },
                    { ownerDisplayName: { contains: q.search, mode: "insensitive" } },
                ],
            }
            : {}),
    };
    const [rows, total] = await Promise.all([
        prisma_1.prisma.giftRegistry.findMany({
            where,
            include: { ownerUser: { select: { name: true, email: true } }, _count: { select: { items: true, orders: true } }, items: true },
            orderBy: { createdAt: "desc" },
            skip,
            take,
        }),
        prisma_1.prisma.giftRegistry.count({ where }),
    ]);
    return {
        items: rows.map((r) => ({
            ...shapeRegistry(r, { includePrivate: true }),
            owner: r.ownerUser,
            itemCount: r._count.items,
            orderCount: r._count.orders,
            stats: statsForItems(r.items),
        })),
        total,
        page,
        pageSize,
    };
}
async function adminGetRegistry(id) {
    const registry = await prisma_1.prisma.giftRegistry.findFirst({
        where: { id },
        include: { ownerUser: { select: { name: true, email: true, phone: true } } },
    });
    if (!registry)
        throw new errors_1.NotFoundError("Registry not found");
    const items = await prisma_1.prisma.giftRegistryItem.findMany({
        where: { registryId: id },
        include: {
            ...registryItemInclude,
            contributions: { include: { gifterUser: { select: { name: true, email: true } }, order: { select: { orderCode: true, status: true, paymentStatus: true } } } },
        },
        orderBy: { displayOrder: "asc" },
    });
    const orders = await prisma_1.prisma.order.findMany({
        where: { registryId: id },
        include: { user: { select: { name: true, email: true } }, items: true },
        orderBy: { placedAt: "desc" },
    });
    return {
        ...shapeRegistry(registry, { includePrivate: true }),
        owner: registry.ownerUser,
        stats: statsForItems(items),
        items: items.map((i) => ({
            ...shapeItem(i),
            contributions: i.contributions.map((c) => ({
                id: c.id,
                gifter: c.gifterUser,
                guestName: c.guestName,
                orderCode: c.order?.orderCode ?? null,
                paymentStatus: c.order?.paymentStatus ?? null,
                quantity: c.quantity,
                status: c.status,
                createdAt: c.createdAt.toISOString(),
            })),
        })),
        orders: orders.map((o) => ({
            id: o.id,
            orderCode: o.orderCode,
            buyer: o.user,
            totalInPaise: o.totalInPaise,
            status: o.status,
            paymentStatus: o.paymentStatus,
            placedAt: o.placedAt.toISOString(),
        })),
    };
}
async function adminUpdateRegistry(id, input) {
    const registry = await prisma_1.prisma.giftRegistry.findFirst({ where: { id } });
    if (!registry)
        throw new errors_1.NotFoundError("Registry not found");
    const updated = await prisma_1.prisma.giftRegistry.update({
        where: { id },
        data: { status: input.status, visibility: input.visibility },
    });
    return shapeRegistry(updated, { includePrivate: true });
}
async function adminListExtractions(q) {
    const { parsePagination } = await Promise.resolve().then(() => __importStar(require("../../lib/response")));
    const { page, pageSize, skip, take } = parsePagination(q);
    const where = {
        ...(q.status ? { extractionStatus: q.status } : {}),
        ...(q.search ? { sourceUrl: { contains: q.search, mode: "insensitive" } } : {}),
    };
    const [items, total] = await Promise.all([
        prisma_1.prisma.externalProductExtraction.findMany({ where, orderBy: { extractedAt: "desc" }, skip, take }),
        prisma_1.prisma.externalProductExtraction.count({ where }),
    ]);
    return { items, total, page, pageSize };
}
async function adminRetryExtraction(id) {
    const row = await prisma_1.prisma.externalProductExtraction.findFirst({ where: { id } });
    if (!row)
        throw new errors_1.NotFoundError("Extraction not found");
    return (0, extract_service_1.extractExternalProduct)(row.sourceUrl, { force: true });
}
async function adminOverrideExtraction(id, input) {
    const row = await prisma_1.prisma.externalProductExtraction.findFirst({ where: { id } });
    if (!row)
        throw new errors_1.NotFoundError("Extraction not found");
    return prisma_1.prisma.externalProductExtraction.update({
        where: { id },
        data: {
            ...input,
            extractionStatus: client_1.ExtractionStatus.MANUAL,
            extractionMethod: "admin-override",
            extractedAt: new Date(),
        },
    });
}
//# sourceMappingURL=registry.service.js.map