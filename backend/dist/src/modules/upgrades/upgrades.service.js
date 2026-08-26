"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GIFT_REGISTRY_PRICE_IN_PAISE = exports.GIFT_REGISTRY_ELIGIBLE_SLUGS = void 0;
exports.isGiftRegistryMatrixService = isGiftRegistryMatrixService;
exports.ensureGiftRegistryService = ensureGiftRegistryService;
exports.getRegistryAccess = getRegistryAccess;
exports.giftRegistryStateForPackageOrder = giftRegistryStateForPackageOrder;
exports.assertGiftRegistryEntitlement = assertGiftRegistryEntitlement;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
const errors_1 = require("../../lib/errors");
const redis_1 = require("../../lib/redis");
exports.GIFT_REGISTRY_ELIGIBLE_SLUGS = ["premium", "luxe"];
exports.GIFT_REGISTRY_PRICE_IN_PAISE = 50_000;
function isGiftRegistryMatrixService(svc) {
    if (svc.slug === "gift-registry")
        return true;
    if (svc.category === "GIFT_REGISTRY")
        return true;
    return Boolean(svc.label && /gift\s*registry/i.test(svc.label));
}
/** Restore Gift Registry as an included Signature/Grand extra service with a ₹500 customize price. */
async function ensureGiftRegistryService() {
    const existing = await prisma_1.prisma.extraService.findFirst({
        where: {
            OR: [{ slug: "gift-registry" }, { category: "GIFT_REGISTRY" }],
        },
    });
    const data = {
        slug: "gift-registry",
        label: "Gift Registry",
        description: "Share a guided gift list with guests. Included with Signature and Grand. Optional customization is a fixed ₹500 in the builder.",
        category: "GIFT_REGISTRY",
        pricingMode: "FIXED",
        locationScope: "ALL",
        choiceCount: null,
        customizationPriceInPaise: exports.GIFT_REGISTRY_PRICE_IN_PAISE,
        displayOrder: 11,
        isActive: true,
        deletedAt: null,
    };
    const service = existing
        ? await prisma_1.prisma.extraService.update({ where: { id: existing.id }, data })
        : await prisma_1.prisma.extraService.create({ data });
    const packages = await prisma_1.prisma.package.findMany({
        where: { deletedAt: null },
        select: { id: true, slug: true },
    });
    await Promise.all(packages.map((pkg) => prisma_1.prisma.packageServiceItem.upsert({
        where: {
            packageId_extraServiceId: { packageId: pkg.id, extraServiceId: service.id },
        },
        create: {
            packageId: pkg.id,
            extraServiceId: service.id,
            isIncluded: exports.GIFT_REGISTRY_ELIGIBLE_SLUGS.includes(pkg.slug),
            displayOrder: 11,
        },
        update: {
            isIncluded: exports.GIFT_REGISTRY_ELIGIBLE_SLUGS.includes(pkg.slug),
            displayOrder: 11,
        },
    })));
    void (0, redis_1.delPattern)("pub:packages:*");
    void (0, redis_1.delPattern)("adm:packages:*");
    return service;
}
async function getRegistryAccess(userId) {
    const [packageOrders, registries] = await Promise.all([
        prisma_1.prisma.order.findMany({
            where: {
                userId,
                kind: client_1.OrderKind.PACKAGE,
                paymentStatus: client_1.PaymentStatus.PAID,
                parentOrderId: null,
            },
            include: {
                packageOrder: { include: { package: true, theme: true, lines: true } },
                sourcedRegistries: {
                    where: { status: { not: "ARCHIVED" } },
                    select: { id: true, title: true },
                },
            },
            orderBy: { createdAt: "desc" },
        }),
        prisma_1.prisma.giftRegistry.findMany({
            where: { ownerUserId: userId, status: { not: "ARCHIVED" } },
            select: { id: true, sourceOrderId: true, title: true },
        }),
    ]);
    const pendingSetups = [];
    for (const order of packageOrders) {
        const slug = order.packageOrder?.package.slug ?? "";
        const isIncluded = exports.GIFT_REGISTRY_ELIGIBLE_SLUGS.includes(slug);
        // Check if purchased as an add-on in the builder
        const hasAddon = order.packageOrder?.lines
            ? Array.isArray(order.packageOrder.lines) &&
                order.packageOrder.lines.some((item) => item.label?.includes("Gift Registry"))
            : false;
        if (!isIncluded && !hasAddon)
            continue;
        if (order.sourcedRegistries[0])
            continue;
        pendingSetups.push({
            orderCode: order.orderCode,
            packageTitle: order.packageOrder?.package.title ?? "Celebration",
            themeTitle: order.packageOrder?.theme.title ?? null,
        });
    }
    const eligibleOrderCount = packageOrders.filter((order) => {
        const slug = order.packageOrder?.package.slug ?? "";
        const isIncluded = exports.GIFT_REGISTRY_ELIGIBLE_SLUGS.includes(slug);
        const hasAddon = order.packageOrder?.lines
            ? Array.isArray(order.packageOrder.lines) &&
                order.packageOrder.lines.some((item) => item.label?.includes("Gift Registry"))
            : false;
        return isIncluded || hasAddon;
    }).length;
    return {
        canAccess: eligibleOrderCount > 0 || registries.length > 0,
        paidUpgradeCount: eligibleOrderCount,
        registryCount: registries.length,
        pendingSetups,
        availablePurchases: [],
    };
}
async function giftRegistryStateForPackageOrder(input) {
    const isIncluded = exports.GIFT_REGISTRY_ELIGIBLE_SLUGS.includes(input.packageSlug);
    const hasAddon = input.lineItems
        ? Array.isArray(input.lineItems) &&
            input.lineItems.some((item) => item.label?.includes("Gift Registry") || item.key?.includes("gift-registry"))
        : false;
    const eligible = (isIncluded || hasAddon) && input.paymentStatus === client_1.PaymentStatus.PAID;
    const registry = input.sourcedRegistries?.[0] ??
        (await prisma_1.prisma.giftRegistry.findFirst({
            where: { sourceOrderId: input.orderId, ownerUserId: input.userId, status: { not: "ARCHIVED" } },
            select: { id: true, title: true },
        }));
    return {
        eligible,
        registryId: registry?.id ?? null,
        registryTitle: registry?.title ?? null,
    };
}
async function assertGiftRegistryEntitlement(userId, sourceOrderCode) {
    const parent = await prisma_1.prisma.order.findFirst({
        where: { orderCode: sourceOrderCode, userId, kind: client_1.OrderKind.PACKAGE },
        include: { packageOrder: { include: { package: true, lines: true } } },
    });
    if (!parent)
        throw new errors_1.NotFoundError("Celebration order not found");
    if (parent.paymentStatus !== client_1.PaymentStatus.PAID) {
        throw new errors_1.ValidationError("This celebration is not paid yet");
    }
    const slug = parent.packageOrder?.package.slug ?? "";
    const isIncluded = exports.GIFT_REGISTRY_ELIGIBLE_SLUGS.includes(slug);
    const hasAddon = parent.packageOrder?.lines
        ? Array.isArray(parent.packageOrder.lines) &&
            parent.packageOrder.lines.some((item) => item.label?.includes("Gift Registry"))
        : false;
    if (!isIncluded && !hasAddon) {
        throw new errors_1.ForbiddenError("Gift Registry is included with Signature and Grand packages only, or as an add-on");
    }
    return parent;
}
//# sourceMappingURL=upgrades.service.js.map