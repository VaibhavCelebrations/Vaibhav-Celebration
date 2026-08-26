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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCheckoutQuote = getCheckoutQuote;
exports.createPackageOrder = createPackageOrder;
exports.createOrderFromCart = createOrderFromCart;
exports.createDirectOrder = createDirectOrder;
exports.cancelOrderAndRestock = cancelOrderAndRestock;
exports.markOrderPaymentFailed = markOrderPaymentFailed;
exports.markOrderPaymentCancelled = markOrderPaymentCancelled;
exports.retryShopPayment = retryShopPayment;
exports.verifyShopCheckoutPayment = verifyShopCheckoutPayment;
exports.markOrderPaid = markOrderPaid;
exports.findOrderByRazorpayOrderId = findOrderByRazorpayOrderId;
exports.listOrdersForUser = listOrdersForUser;
exports.getOrderByCode = getOrderByCode;
exports.getOrderForUser = getOrderForUser;
exports.adminListOrders = adminListOrders;
exports.adminGetOrder = adminGetOrder;
exports.adminUpdateOrderItemFulfillment = adminUpdateOrderItemFulfillment;
exports.adminUpdateOrderStatus = adminUpdateOrderStatus;
exports.adminUpdateOrderOps = adminUpdateOrderOps;
exports.reorderFromOrder = reorderFromOrder;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
const errors_1 = require("../../lib/errors");
const sequences_1 = require("../../lib/sequences");
const response_1 = require("../../lib/response");
const cart_pricing_service_1 = require("../shop/cart-pricing.service");
const inventory_service_1 = require("../catalog/inventory.service");
const client_2 = require("../../integrations/razorpay/client");
const payment_events_1 = require("../payments/payment-events");
const pdf_1 = require("../../integrations/invoice/pdf");
const sequences_2 = require("../../lib/sequences");
const mailer_1 = require("../../integrations/email/mailer");
const settings_1 = require("../../lib/settings");
const client_3 = require("../../integrations/whatsapp/client");
const logger_1 = require("../../lib/logger");
const upgrades_service_1 = require("../upgrades/upgrades.service");
const client_4 = require("@prisma/client");
const registry_qty_1 = require("../registry/registry-qty");
const address_1 = require("../registry/address");
const builder_service_1 = require("../builder/builder.service");
const validators_1 = require("../../lib/validators");
/**
 * Re-validates the live cart (price + stock) and returns the authoritative
 * total that will be charged. The frontend renders exactly this — it never
 * computes GST or totals itself. Throws if the cart is empty or any line is
 * no longer purchasable, so the UI can surface a clear error before payment.
 */
async function getCheckoutQuote(userId) {
    const cart = await prisma_1.prisma.cart.findUnique({ where: { userId } });
    if (!cart)
        throw new errors_1.ValidationError("Your cart is empty");
    const items = await prisma_1.prisma.cartItem.findMany({
        where: { cartId: cart.id },
        include: { product: { include: { inventory: true } } },
    });
    if (items.length === 0)
        throw new errors_1.ValidationError("Your cart is empty");
    const problems = [];
    for (const item of items) {
        if (!item.product.isActive || item.product.deletedAt) {
            problems.push(`${item.product.title} is no longer available`);
            continue;
        }
        const available = item.product.inventory?.quantityAvailable ?? 0;
        if (available < item.quantity) {
            problems.push(`Only ${available} left in stock for ${item.product.title}`);
        }
    }
    if (problems.length) {
        throw new errors_1.ValidationError("Some items in your cart need attention before checkout", { problems });
    }
    const quote = await (0, cart_pricing_service_1.computeQuote)(items.map((i) => ({
        productId: i.productId,
        unitPriceInPaise: i.product.priceInPaise,
        quantity: i.quantity,
        personalizationCostInPaise: i.personalizationSelected ? i.product.personalizationCostInPaise : 0,
    })));
    const registryItemIds = items.map((i) => i.registryItemId).filter(Boolean);
    let registryCheckout = null;
    if (registryItemIds.length) {
        const registryItem = await prisma_1.prisma.giftRegistryItem.findFirst({
            where: { id: registryItemIds[0] },
            include: { registry: true },
        });
        if (registryItem) {
            const addr = (0, address_1.parseShippingAddress)(registryItem.registry.shippingAddress);
            if (addr) {
                registryCheckout = {
                    registryCode: registryItem.registry.registryCode,
                    recipientName: addr.fullName,
                    shippingAddress: addr,
                };
            }
        }
    }
    return {
        quote,
        items: items.map((i) => ({
            productId: i.productId,
            title: i.product.title,
            quantity: i.quantity,
            unitPriceInPaise: i.product.priceInPaise,
            personalizationCostInPaise: i.personalizationSelected ? i.product.personalizationCostInPaise : 0,
            personalizationSelected: i.personalizationSelected,
            registryItemId: i.registryItemId || null,
        })),
        registryCheckout,
    };
}
/**
 * Shared order-creation core: re-validates stock/prices inside the
 * transaction, snapshots unit prices onto OrderItem, and reserves inventory
 * (SALE ledger entry). Used by both cart checkout and direct gift-registry
 * purchases so pricing/inventory guarantees are identical everywhere an
 * order can be created.
 */
async function createOrderFromLines(userId, lines, input, notesType) {
    if (lines.length === 0)
        throw new errors_1.ValidationError("No items to order");
    const order = await prisma_1.prisma.$transaction(async (tx) => {
        const products = await tx.product.findMany({
            where: { id: { in: lines.map((l) => l.productId) }, deletedAt: null },
            include: { inventory: true },
        });
        const productMap = new Map(products.map((p) => [p.id, p]));
        for (const line of lines) {
            const product = productMap.get(line.productId);
            if (!product || !product.isActive) {
                throw new errors_1.ValidationError(`One of the items is no longer available`);
            }
        }
        const quote = await (0, cart_pricing_service_1.computeQuote)(lines.map((l) => {
            const product = productMap.get(l.productId);
            const selected = Boolean(l.personalizationSelected && product.personalizationEnabled);
            return {
                productId: l.productId,
                unitPriceInPaise: product.priceInPaise,
                quantity: l.quantity,
                personalizationCostInPaise: selected ? product.personalizationCostInPaise : 0,
            };
        }));
        const hasCustomization = lines.some((l) => {
            const product = productMap.get(l.productId);
            return Boolean(l.personalizationSelected && product.personalizationEnabled);
        });
        const registryItemIds = [...new Set(lines.map((l) => l.registryItemId).filter((id) => Boolean(id)))];
        let registryId = null;
        let shippingAddress = input.shippingAddress;
        if (registryItemIds.length) {
            const registryItems = await tx.giftRegistryItem.findMany({
                where: { id: { in: registryItemIds } },
                include: { registry: true },
            });
            if (registryItems.length !== registryItemIds.length) {
                throw new errors_1.ValidationError("One of the registry gifts is no longer available");
            }
            const registryIds = new Set(registryItems.map((i) => i.registryId));
            if (registryIds.size > 1) {
                throw new errors_1.ValidationError("Checkout can only include gifts from one registry at a time");
            }
            const registry = registryItems[0].registry;
            registryId = registry.id;
            const lockedAddress = (0, address_1.parseShippingAddress)(registry.shippingAddress);
            if (!lockedAddress)
                throw new errors_1.ValidationError("This registry does not have a delivery address yet");
            shippingAddress = lockedAddress;
            for (const line of lines) {
                if (!line.registryItemId)
                    continue;
                await (0, registry_qty_1.reserveRegistryItemQty)(tx, line.registryItemId, line.quantity);
            }
        }
        const orderCode = await (0, sequences_1.nextOrderCode)();
        const created = await tx.order.create({
            data: {
                orderCode,
                userId,
                registryId,
                status: client_1.OrderStatus.PENDING_PAYMENT,
                paymentStatus: client_1.PaymentStatus.PENDING,
                customizationFollowUpStatus: hasCustomization
                    ? client_1.CustomizationFollowUpStatus.REQUIRED
                    : client_1.CustomizationFollowUpStatus.NOT_REQUIRED,
                subtotalInPaise: quote.subtotalInPaise,
                gstInPaise: quote.gstInPaise,
                totalInPaise: quote.totalInPaise,
                shippingInPaise: quote.shippingInPaise,
                shippingWaived: quote.shippingWaived,
                freeShippingThresholdSnapshotInPaise: quote.freeShippingThresholdInPaise,
                shippingAddress: shippingAddress,
                contactEmail: input.contactEmail,
                contactPhone: input.contactPhone,
                items: {
                    create: lines.map((l) => {
                        const product = productMap.get(l.productId);
                        const selected = Boolean(l.personalizationSelected && product.personalizationEnabled);
                        return {
                            productId: l.productId,
                            registryItemId: l.registryItemId || null,
                            quantity: l.quantity,
                            unitPriceInPaise: product.priceInPaise,
                            personalizationValues: (l.personalizationValues ?? null),
                            personalizationSelected: selected,
                            personalizationCostSnapshot: selected ? product.personalizationCostInPaise : 0,
                        };
                    }),
                },
            },
            include: { items: true },
        });
        for (const orderItem of created.items) {
            await (0, inventory_service_1.adjustInventoryInTx)(tx, {
                productId: orderItem.productId,
                delta: -orderItem.quantity,
                reason: client_1.InventoryLedgerReason.SALE,
                orderItemId: orderItem.id,
                note: `Reserved for order ${orderCode}`,
            });
            if (orderItem.registryItemId) {
                await tx.giftRegistryContribution.create({
                    data: {
                        registryItemId: orderItem.registryItemId,
                        gifterUserId: userId,
                        orderId: created.id,
                        quantity: orderItem.quantity,
                        status: client_1.GiftContributionStatus.PENDING,
                    },
                });
            }
        }
        return created;
    });
    const razorpayOrder = await (0, client_2.createRazorpayOrder)({
        amountInPaise: order.totalInPaise,
        receipt: order.orderCode,
        notes: { orderCode: order.orderCode, userId, type: notesType },
    });
    await prisma_1.prisma.order.update({ where: { id: order.id }, data: { razorpayOrderId: razorpayOrder.id } });
    return {
        orderId: order.id,
        orderCode: order.orderCode,
        totalInPaise: order.totalInPaise,
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: (0, client_2.getRazorpayPublicKey)(),
    };
}
/**
 * Create a PACKAGE celebration order from the builder quote.
 * Prices are always recomputed server-side — never trust the client total.
 */
async function createPackageOrder(userId, input) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.eventDate)) {
        throw new errors_1.ValidationError("eventDate must be YYYY-MM-DD");
    }
    if (!input.builder?.packageSlug || !input.builder?.themeSlug) {
        throw new errors_1.ValidationError("Package and theme are required");
    }
    if (!Number.isFinite(input.builder.guestCount) || input.builder.guestCount < 5) {
        throw new errors_1.ValidationError("Guest count must be at least 5");
    }
    const builderInput = {
        packageSlug: input.builder.packageSlug,
        themeSlug: input.builder.themeSlug,
        guestCount: Math.floor(input.builder.guestCount),
        location: input.builder.location === "outside" ? "outside" : "jaipur",
        selections: input.builder.selections ?? {},
    };
    const quote = await (0, builder_service_1.computeBuilderQuote)(builderInput);
    const eventDate = (0, validators_1.toDateOnly)(input.eventDate);
    const shippingAddress = input.shippingAddress ?? {
        fullName: input.eventDetails?.childName?.trim() || "Celebration guest",
        line1: input.eventDetails?.venue?.trim() || "Venue to be confirmed",
        city: builderInput.location === "jaipur" ? "Jaipur" : "Outside Jaipur",
        state: "Rajasthan",
        pincode: "000000",
        country: "India",
    };
    const hasCustomization = quote.hasPersonalization ||
        quote.lineItems.some((line) => line.personalizationSelected);
    const orderCode = await (0, sequences_1.nextOrderCode)();
    const order = await prisma_1.prisma.order.create({
        data: {
            orderCode,
            userId,
            kind: client_1.OrderKind.PACKAGE,
            status: client_1.OrderStatus.PENDING_PAYMENT,
            paymentStatus: client_1.PaymentStatus.PENDING,
            customizationFollowUpStatus: hasCustomization
                ? client_1.CustomizationFollowUpStatus.REQUIRED
                : client_1.CustomizationFollowUpStatus.NOT_REQUIRED,
            subtotalInPaise: quote.subtotalInPaise,
            gstInPaise: quote.gstInPaise,
            totalInPaise: quote.totalInPaise,
            shippingInPaise: quote.shippingInPaise,
            shippingWaived: quote.shippingWaived,
            freeShippingThresholdSnapshotInPaise: quote.freeShippingThresholdInPaise,
            shippingAddress: shippingAddress,
            contactEmail: input.contactEmail.toLowerCase().trim(),
            contactPhone: input.contactPhone.trim(),
            eventDate,
            eventDetails: {
                childName: input.eventDetails?.childName ?? null,
                childAge: input.eventDetails?.childAge ?? null,
                venue: input.eventDetails?.venue ?? null,
                guestCount: input.eventDetails?.guestCount ?? builderInput.guestCount,
                notes: input.eventDetails?.notes ?? null,
                packageTitle: quote.packageTitle,
                themeTitle: quote.themeTitle,
            },
            packageOrder: {
                create: {
                    packageId: quote.packageId,
                    themeId: quote.themeId,
                    basePriceInPaise: quote.basePriceInPaise,
                    customizationTotalInPaise: quote.customizationTotalInPaise,
                    guestCount: quote.guestCount,
                    location: quote.location,
                    builderInput: builderInput,
                    quoteSnapshot: quote,
                    lines: {
                        create: quote.lineItems.map((line) => ({
                            packageServiceItemId: line.packageServiceItemId || null,
                            label: line.label,
                            sku: line.sku ?? null,
                            section: line.section,
                            quantity: line.quantity,
                            unitPriceInPaise: line.unitPriceInPaise,
                        })),
                    },
                },
            },
        },
        include: { packageOrder: { include: { lines: true, package: true, theme: true } } },
    });
    const razorpayOrder = await (0, client_2.createRazorpayOrder)({
        amountInPaise: order.totalInPaise,
        receipt: order.orderCode,
        notes: { orderCode: order.orderCode, userId, type: "PACKAGE_ORDER" },
    });
    await prisma_1.prisma.order.update({ where: { id: order.id }, data: { razorpayOrderId: razorpayOrder.id } });
    return {
        orderId: order.id,
        orderCode: order.orderCode,
        kind: client_1.OrderKind.PACKAGE,
        totalInPaise: order.totalInPaise,
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: (0, client_2.getRazorpayPublicKey)(),
        eventDate: input.eventDate,
        packageTitle: quote.packageTitle,
        themeTitle: quote.themeTitle,
    };
}
/**
 * Creates the order from the server cart. Cart is NOT cleared until payment
 * is verified — cancelled/failed Razorpay checkouts must not empty the cart.
 * Reuses an existing unpaid order when the cart contents still match.
 */
async function createOrderFromCart(userId, input) {
    const cart = await prisma_1.prisma.cart.findUnique({ where: { userId } });
    if (!cart)
        throw new errors_1.ValidationError("Your cart is empty");
    const items = await prisma_1.prisma.cartItem.findMany({ where: { cartId: cart.id } });
    if (items.length === 0)
        throw new errors_1.ValidationError("Your cart is empty");
    const lines = items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        personalizationValues: i.personalizationValues,
        personalizationSelected: i.personalizationSelected,
        personalizationCostSnapshot: i.personalizationCostSnapshot,
        registryItemId: i.registryItemId || null,
    }));
    const pending = await prisma_1.prisma.order.findFirst({
        where: {
            userId,
            status: client_1.OrderStatus.PENDING_PAYMENT,
            paymentStatus: { in: [client_1.PaymentStatus.PENDING, client_1.PaymentStatus.FAILED, client_1.PaymentStatus.CANCELLED] },
        },
        include: { items: true },
        orderBy: { createdAt: "desc" },
    });
    if (pending && cartMatchesOrder(pending.items, lines)) {
        await prisma_1.prisma.order.update({
            where: { id: pending.id },
            data: {
                shippingAddress: input.shippingAddress,
                contactEmail: input.contactEmail,
                contactPhone: input.contactPhone,
                paymentStatus: client_1.PaymentStatus.PENDING,
            },
        });
        if (pending.razorpayOrderId) {
            return {
                orderId: pending.id,
                orderCode: pending.orderCode,
                totalInPaise: pending.totalInPaise,
                razorpayOrderId: pending.razorpayOrderId,
                razorpayKeyId: (0, client_2.getRazorpayPublicKey)(),
            };
        }
        const razorpayOrder = await (0, client_2.createRazorpayOrder)({
            amountInPaise: pending.totalInPaise,
            receipt: pending.orderCode,
            notes: { orderCode: pending.orderCode, userId, type: "SHOP_ORDER" },
        });
        await prisma_1.prisma.order.update({ where: { id: pending.id }, data: { razorpayOrderId: razorpayOrder.id } });
        return {
            orderId: pending.id,
            orderCode: pending.orderCode,
            totalInPaise: pending.totalInPaise,
            razorpayOrderId: razorpayOrder.id,
            razorpayKeyId: (0, client_2.getRazorpayPublicKey)(),
        };
    }
    if (pending) {
        await cancelOrderAndRestock(pending.id, "Superseded by updated cart checkout");
    }
    return createOrderFromLines(userId, lines, input, "SHOP_ORDER");
}
function cartMatchesOrder(orderItems, lines) {
    if (orderItems.length !== lines.length)
        return false;
    const key = (p, q, s, r) => `${p}:${q}:${s ? 1 : 0}:${r ?? ""}`;
    const a = orderItems.map((i) => key(i.productId, i.quantity, i.personalizationSelected, i.registryItemId)).sort();
    const b = lines.map((i) => key(i.productId, i.quantity, i.personalizationSelected ?? false, i.registryItemId)).sort();
    return a.join("|") === b.join("|");
}
/** Single-item order used by the gift-registry "gift this item" flow — bypasses the cart entirely. */
async function createDirectOrder(userId, input) {
    return createOrderFromLines(userId, [
        {
            productId: input.productId,
            quantity: input.quantity,
            registryItemId: input.registryItemId,
            personalizationValues: input.personalizationValues,
            personalizationSelected: input.personalizationSelected,
        },
    ], input, input.registryItemId ? "REGISTRY_GIFT" : "SHOP_DIRECT");
}
/** Restocks reserved inventory and cancels the order — used on payment.failed / manual cancellation. */
async function cancelOrderAndRestock(orderId, note = "Order cancelled") {
    return prisma_1.prisma.$transaction(async (tx) => {
        const order = await tx.order.findFirst({ where: { id: orderId }, include: { items: true } });
        if (!order)
            throw new errors_1.NotFoundError("Order not found");
        if (order.status === client_1.OrderStatus.CANCELLED || order.status === client_1.OrderStatus.REFUNDED)
            return order;
        if (order.status === client_1.OrderStatus.PAID || order.paymentStatus === client_1.PaymentStatus.PAID) {
            throw new errors_1.ValidationError("Paid orders cannot be cancelled this way");
        }
        for (const item of order.items) {
            await (0, inventory_service_1.adjustInventoryInTx)(tx, {
                productId: item.productId,
                delta: item.quantity,
                reason: client_1.InventoryLedgerReason.RETURN,
                orderItemId: item.id,
                note,
            });
        }
        await (0, registry_qty_1.releaseRegistryReservationsForOrder)(tx, order.id);
        return tx.order.update({
            where: { id: order.id },
            data: { status: client_1.OrderStatus.CANCELLED, paymentStatus: client_1.PaymentStatus.CANCELLED },
        });
    });
}
/** Payment failed — keep reserved stock and cart; customer may retry the same order. */
async function markOrderPaymentFailed(orderId) {
    const order = await prisma_1.prisma.order.findFirst({ where: { id: orderId } });
    if (!order)
        throw new errors_1.NotFoundError("Order not found");
    if (order.status === client_1.OrderStatus.PAID || order.paymentStatus === client_1.PaymentStatus.PAID)
        return order;
    if (order.status === client_1.OrderStatus.CANCELLED || order.status === client_1.OrderStatus.REFUNDED)
        return order;
    return prisma_1.prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: client_1.PaymentStatus.FAILED },
    });
}
async function markOrderPaymentCancelled(orderId) {
    const order = await prisma_1.prisma.order.findFirst({ where: { id: orderId } });
    if (!order)
        throw new errors_1.NotFoundError("Order not found");
    if (order.status === client_1.OrderStatus.PAID || order.paymentStatus === client_1.PaymentStatus.PAID)
        return order;
    if (order.status === client_1.OrderStatus.CANCELLED)
        return order;
    return prisma_1.prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: client_1.PaymentStatus.CANCELLED },
    });
}
async function retryShopPayment(userId, orderCode) {
    const order = await prisma_1.prisma.order.findFirst({ where: { orderCode, userId } });
    if (!order)
        throw new errors_1.NotFoundError("Order not found");
    if (order.paymentStatus === client_1.PaymentStatus.PAID || order.status === client_1.OrderStatus.PAID) {
        throw new errors_1.ValidationError("This order is already paid");
    }
    if (order.status === client_1.OrderStatus.CANCELLED || order.status === client_1.OrderStatus.REFUNDED) {
        throw new errors_1.ValidationError("This order cannot be paid");
    }
    if (order.razorpayOrderId && order.paymentStatus !== client_1.PaymentStatus.FAILED) {
        return {
            orderId: order.id,
            orderCode: order.orderCode,
            totalInPaise: order.totalInPaise,
            razorpayOrderId: order.razorpayOrderId,
            razorpayKeyId: (0, client_2.getRazorpayPublicKey)(),
        };
    }
    const razorpayOrder = await (0, client_2.createRazorpayOrder)({
        amountInPaise: order.totalInPaise,
        receipt: order.orderCode,
        notes: { orderCode: order.orderCode, userId, type: "SHOP_ORDER_RETRY" },
    });
    await prisma_1.prisma.order.update({
        where: { id: order.id },
        data: { razorpayOrderId: razorpayOrder.id, paymentStatus: client_1.PaymentStatus.PENDING },
    });
    return {
        orderId: order.id,
        orderCode: order.orderCode,
        totalInPaise: order.totalInPaise,
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: (0, client_2.getRazorpayPublicKey)(),
    };
}
async function verifyShopCheckoutPayment(input) {
    const order = await prisma_1.prisma.order.findFirst({ where: { orderCode: input.orderCode, userId: input.userId } });
    if (!order)
        throw new errors_1.NotFoundError("Order not found");
    if (order.razorpayOrderId && order.razorpayOrderId !== input.razorpayOrderId) {
        throw new errors_1.ValidationError("Payment order does not match this shop order");
    }
    if (!(0, client_2.verifyCheckoutPaymentSignature)({
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
        razorpaySignature: input.razorpaySignature,
    })) {
        throw new errors_1.ValidationError("Invalid payment signature");
    }
    await (0, payment_events_1.claimPaymentEvent)({
        eventKey: `payment.captured:${input.razorpayPaymentId}`,
        eventType: "checkout.verify",
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
    });
    await markOrderPaid(order.id, input.razorpayPaymentId);
    return getOrderForUser(input.userId, order.orderCode);
}
/** Called from webhook or verified checkout callback — marks paid, invoices, notifies, clears purchased cart lines. */
async function markOrderPaid(orderId, razorpayPaymentId) {
    await prisma_1.prisma.order.updateMany({
        where: { id: orderId, paymentStatus: { not: client_1.PaymentStatus.PAID } },
        data: {
            status: client_1.OrderStatus.PAID,
            paymentStatus: client_1.PaymentStatus.PAID,
            ...(razorpayPaymentId ? { razorpayPaymentId } : {}),
        },
    });
    const order = await prisma_1.prisma.order.findFirst({
        where: { id: orderId },
        include: {
            items: { include: { product: true } },
            user: true,
            giftContributions: true,
            invoice: true,
            packageOrder: {
                include: {
                    package: { select: { title: true } },
                    theme: { select: { title: true } },
                    lines: true,
                },
            },
        },
    });
    if (!order)
        throw new errors_1.NotFoundError("Order not found");
    const shipping = order.shippingAddress;
    let invoiceNumber = order.invoice?.invoiceNumber ?? order.invoiceNumber;
    let pdfUrl = order.invoice?.pdfUrl ?? order.invoicePdfUrl;
    if (!order.invoice) {
        invoiceNumber = invoiceNumber ?? (await (0, sequences_2.nextInvoiceNumber)());
        try {
            const lineItems = order.kind === client_1.OrderKind.PACKAGE && order.packageOrder
                ? [
                    {
                        label: `${order.packageOrder.theme.title} — ${order.packageOrder.package.title}`,
                        amountInPaise: order.packageOrder.basePriceInPaise,
                    },
                    ...order.packageOrder.lines
                        .filter((line) => line.section !== "package")
                        .map((line) => ({
                        label: `${line.label} × ${line.quantity}`,
                        amountInPaise: line.unitPriceInPaise * line.quantity,
                    })),
                ]
                : order.kind === client_1.OrderKind.UPGRADE
                    ? [
                        {
                            label: order.eventDetails?.upgradeTitle ||
                                "Gift Registry",
                            amountInPaise: order.subtotalInPaise,
                        },
                    ]
                    : order.items.map((i) => ({
                        label: i.personalizationSelected
                            ? `${i.product.title} × ${i.quantity} (personalized)`
                            : `${i.product.title} × ${i.quantity}`,
                        amountInPaise: (i.unitPriceInPaise + i.personalizationCostSnapshot) * i.quantity,
                    }));
            const pdf = await (0, pdf_1.generateInvoicePdf)({
                invoiceNumber,
                orderCode: order.orderCode,
                guestName: shipping.fullName || order.user.name,
                guestEmail: order.contactEmail,
                guestPhone: order.contactPhone,
                lineItems,
                subtotalInPaise: order.subtotalInPaise,
                shippingInPaise: order.shippingInPaise,
                shippingWaived: order.shippingWaived,
                gstPercent: await (0, settings_1.getGstPercent)(),
                gstInPaise: order.gstInPaise,
                totalInPaise: order.totalInPaise,
                issuedAt: new Date(),
                paymentStatus: "PAID",
            });
            pdfUrl = pdf.url;
        }
        catch (err) {
            logger_1.logger.error({ err, orderId }, "Failed to generate order invoice PDF");
        }
        const customer = await findOrCreateCrmCustomer({
            fullName: shipping.fullName || order.user.name,
            email: order.contactEmail,
            phone: order.contactPhone,
        });
        try {
            await prisma_1.prisma.invoice.create({
                data: {
                    invoiceNumber: invoiceNumber,
                    linkedType: client_4.InvoiceLinkedType.ORDER,
                    orderId: order.id,
                    customerId: customer.id,
                    subtotalInPaise: order.subtotalInPaise,
                    gstInPaise: order.gstInPaise,
                    totalInPaise: order.totalInPaise,
                    pdfUrl,
                },
            });
        }
        catch (err) {
            logger_1.logger.warn({ err, orderId }, "Invoice row already exists or failed");
        }
    }
    const updated = await prisma_1.prisma.order.update({
        where: { id: order.id },
        data: {
            invoiceNumber: invoiceNumber ?? order.invoiceNumber,
            invoicePdfUrl: pdfUrl ?? order.invoicePdfUrl,
        },
    });
    if (order.kind === client_1.OrderKind.SHOP) {
        const cart = await prisma_1.prisma.cart.findUnique({ where: { userId: order.userId } });
        if (cart) {
            await prisma_1.prisma.cartItem.deleteMany({
                where: { cartId: cart.id, productId: { in: order.items.map((i) => i.productId) } },
            });
        }
    }
    const claimedEmail = await prisma_1.prisma.order.updateMany({
        where: { id: order.id, emailSendStatus: null },
        data: { emailSendStatus: "PENDING" },
    });
    if (claimedEmail.count > 0) {
        const confirmationItems = order.kind === client_1.OrderKind.PACKAGE && order.packageOrder
            ? [
                {
                    title: `${order.packageOrder.theme.title} — ${order.packageOrder.package.title}`,
                    quantity: 1,
                },
                ...order.packageOrder.lines
                    .filter((line) => line.section !== "package")
                    .map((line) => ({ title: line.label, quantity: line.quantity })),
            ]
            : order.kind === client_1.OrderKind.UPGRADE
                ? [
                    {
                        title: order.eventDetails?.upgradeTitle ||
                            "Gift Registry",
                        quantity: 1,
                    },
                ]
                : order.items.map((i) => ({ title: i.product.title, quantity: i.quantity }));
        const pdfAttachmentBuffer = await (0, pdf_1.fetchInvoicePdfBuffer)(pdfUrl);
        const attachmentName = invoiceNumber ? `Invoice-${invoiceNumber}.pdf` : `Invoice-${order.orderCode}.pdf`;
        const confirmation = await (0, mailer_1.sendEmail)({
            to: order.contactEmail,
            subject: `Order Confirmed — ${order.orderCode}`,
            html: (0, mailer_1.orderConfirmationHtml)({
                name: order.user.name,
                orderCode: order.orderCode,
                totalInPaise: order.totalInPaise,
                items: confirmationItems,
                invoiceNumber: invoiceNumber ?? null,
                customizationFollowUp: order.customizationFollowUpStatus === client_1.CustomizationFollowUpStatus.REQUIRED,
            }),
            attachments: pdfAttachmentBuffer
                ? [{ filename: attachmentName, content: pdfAttachmentBuffer, contentType: "application/pdf" }]
                : undefined,
        });
        if (invoiceNumber) {
            await prisma_1.prisma.invoice.updateMany({
                where: { orderId: order.id },
                data: {
                    emailSentAt: confirmation.sent ? new Date() : undefined,
                    emailSendStatus: confirmation.status,
                },
            });
        }
        await prisma_1.prisma.order.update({
            where: { id: order.id },
            data: {
                confirmationEmailSentAt: confirmation.sent ? new Date() : undefined,
                emailSendStatus: confirmation.status,
            },
        });
    }
    const claimedWhatsapp = await prisma_1.prisma.order.updateMany({
        where: { id: order.id, whatsappSendStatus: null },
        data: { whatsappSendStatus: "PENDING" },
    });
    if (claimedWhatsapp.count > 0) {
        const amount = (order.totalInPaise / 100).toFixed(2);
        const wa = await (0, client_3.sendWhatsAppMessage)({
            toPhone: order.contactPhone,
            templateName: client_3.WHATSAPP_TEMPLATES.orderConfirmation,
            body: `Thank you for your order ${order.orderCode}. Payment of ₹${amount} is confirmed.`,
            bodyParameters: [order.orderCode, amount],
            mediaUrl: pdfUrl ?? undefined,
        });
        await prisma_1.prisma.order.update({
            where: { id: order.id },
            data: {
                whatsappSentAt: wa.sent ? new Date() : undefined,
                whatsappSendStatus: wa.status,
                whatsappMessageId: wa.providerMessageId,
            },
        });
    }
    if (order.giftContributions.length) {
        await prisma_1.prisma.$transaction((tx) => (0, registry_qty_1.fulfillRegistryContributionsForOrder)(tx, order.id));
    }
    return updated;
}
async function findOrCreateCrmCustomer(input) {
    const existing = await prisma_1.prisma.customer.findFirst({
        where: { deletedAt: null, OR: [{ email: input.email.toLowerCase() }, { phone: input.phone }] },
    });
    if (existing) {
        return prisma_1.prisma.customer.update({
            where: { id: existing.id },
            data: { fullName: input.fullName, email: input.email.toLowerCase(), phone: input.phone },
        });
    }
    return prisma_1.prisma.customer.create({
        data: { fullName: input.fullName, email: input.email.toLowerCase(), phone: input.phone },
    });
}
async function findOrderByRazorpayOrderId(razorpayOrderId) {
    return prisma_1.prisma.order.findFirst({ where: { razorpayOrderId } });
}
// ─── Order history (customer-facing) ─────────────────────────────────────────
const customerOrderInclude = {
    items: { include: { product: { select: { title: true, slug: true, images: { take: 1, include: { media: true } } } } } },
    packageOrder: {
        include: {
            package: { select: { title: true, slug: true } },
            theme: { select: { title: true, slug: true } },
            lines: true,
        },
    },
    childOrders: {
        where: { kind: client_1.OrderKind.UPGRADE },
        orderBy: { createdAt: "desc" },
        select: {
            orderCode: true,
            kind: true,
            upgradeKind: true,
            paymentStatus: true,
            status: true,
        },
    },
    sourcedRegistries: { where: { status: { not: "ARCHIVED" } }, select: { id: true, title: true } },
};
async function listOrdersForUser(userId, q) {
    const { page, pageSize, skip, take } = (0, response_1.parsePagination)(q);
    const where = { userId, parentOrderId: null };
    const [rows, total] = await Promise.all([
        prisma_1.prisma.order.findMany({
            where,
            include: customerOrderInclude,
            orderBy: { createdAt: "desc" },
            skip,
            take,
        }),
        prisma_1.prisma.order.count({ where }),
    ]);
    const items = await Promise.all(rows.map((row) => shapeOrder(row)));
    return { items, total, page, pageSize };
}
async function getOrderByCode(orderCode) {
    const order = await prisma_1.prisma.order.findFirst({
        where: { orderCode },
        include: customerOrderInclude,
    });
    if (!order)
        throw new errors_1.NotFoundError("Order not found");
    return shapeOrder(order);
}
async function getOrderForUser(userId, orderCode) {
    const order = await prisma_1.prisma.order.findFirst({
        where: { orderCode, userId },
        include: customerOrderInclude,
    });
    if (!order)
        throw new errors_1.NotFoundError("Order not found");
    return shapeOrder(order);
}
async function shapeOrder(order) {
    const kind = order.kind ?? client_1.OrderKind.SHOP;
    const giftRegistry = kind === client_1.OrderKind.PACKAGE && order.packageOrder && order.userId
        ? await (0, upgrades_service_1.giftRegistryStateForPackageOrder)({
            orderId: order.id,
            userId: order.userId,
            packageSlug: order.packageOrder.package.slug,
            paymentStatus: order.paymentStatus ?? client_1.PaymentStatus.PENDING,
            sourcedRegistries: order.sourcedRegistries,
        })
        : null;
    return {
        id: order.id,
        orderCode: order.orderCode,
        kind,
        status: order.status,
        paymentStatus: order.paymentStatus ?? (order.status === client_1.OrderStatus.PAID ? "PAID" : "PENDING"),
        customizationFollowUpStatus: order.customizationFollowUpStatus ?? "NOT_REQUIRED",
        subtotalInPaise: order.subtotalInPaise,
        gstInPaise: order.gstInPaise,
        totalInPaise: order.totalInPaise,
        shippingInPaise: order.shippingInPaise ?? 0,
        shippingWaived: order.shippingWaived ?? false,
        freeShippingThresholdSnapshotInPaise: order.freeShippingThresholdSnapshotInPaise ?? null,
        shippingAddress: order.shippingAddress,
        contactEmail: order.contactEmail,
        contactPhone: order.contactPhone,
        eventDate: order.eventDate ? order.eventDate.toISOString().slice(0, 10) : null,
        eventDetails: order.eventDetails ?? null,
        invoiceNumber: order.invoiceNumber ?? null,
        invoicePdfUrl: order.invoicePdfUrl,
        razorpayOrderId: order.razorpayOrderId ?? null,
        canRetryPayment: order.status === client_1.OrderStatus.PENDING_PAYMENT &&
            order.paymentStatus !== client_1.PaymentStatus.PAID,
        canReorder: kind === client_1.OrderKind.SHOP &&
            (order.status === client_1.OrderStatus.PAID ||
                order.status === client_1.OrderStatus.DELIVERED ||
                order.status === client_1.OrderStatus.SHIPPED ||
                order.status === client_1.OrderStatus.PROCESSING),
        placedAt: order.placedAt.toISOString(),
        createdAt: order.createdAt.toISOString(),
        giftRegistry,
        package: order.packageOrder
            ? {
                title: order.packageOrder.package.title,
                slug: order.packageOrder.package.slug,
                themeTitle: order.packageOrder.theme.title,
                themeSlug: order.packageOrder.theme.slug,
                guestCount: order.packageOrder.guestCount,
                location: order.packageOrder.location,
                lines: order.packageOrder.lines.map((line) => ({
                    id: line.id,
                    label: line.label,
                    sku: line.sku,
                    section: line.section,
                    quantity: line.quantity,
                    unitPriceInPaise: line.unitPriceInPaise,
                    lineTotalInPaise: line.unitPriceInPaise * line.quantity,
                })),
            }
            : null,
        items: order.items.map((i) => {
            const personalizationCost = i.personalizationCostSnapshot ?? 0;
            return {
                id: i.id,
                productId: i.productId,
                title: i.product.title,
                slug: i.product.slug,
                quantity: i.quantity,
                unitPriceInPaise: i.unitPriceInPaise,
                personalizationSelected: i.personalizationSelected ?? false,
                personalizationValues: i.personalizationValues ?? null,
                personalizationCostInPaise: personalizationCost,
                lineTotalInPaise: (i.unitPriceInPaise + personalizationCost) * i.quantity,
                image: i.product.images[0]?.media ?? null,
            };
        }),
    };
}
// ─── ADMIN CRM ───────────────────────────────────────────────────────────────
async function adminListOrders(query) {
    const { take, skip, page, pageSize } = (0, response_1.parsePagination)(query);
    const where = {};
    if (query.status)
        where.status = query.status;
    if (query.paymentStatus)
        where.paymentStatus = query.paymentStatus;
    if (query.registryId)
        where.registryId = query.registryId;
    if (query.registryOnly)
        where.registryId = { not: null };
    if (query.shopOnly) {
        where.kind = client_1.OrderKind.SHOP;
        where.registryId = null;
    }
    if (query.packageOnly)
        where.kind = client_1.OrderKind.PACKAGE;
    if (query.followUp === "REQUIRED_ANY") {
        where.customizationFollowUpStatus = { not: client_1.CustomizationFollowUpStatus.NOT_REQUIRED };
    }
    else if (query.followUp) {
        where.customizationFollowUpStatus = query.followUp;
    }
    if (query.search) {
        const s = query.search.trim();
        where.OR = [
            { orderCode: { contains: s, mode: "insensitive" } },
            { contactEmail: { contains: s, mode: "insensitive" } },
            { contactPhone: { contains: s, mode: "insensitive" } },
            { razorpayOrderId: { contains: s, mode: "insensitive" } },
            { razorpayPaymentId: { contains: s, mode: "insensitive" } },
            { invoiceNumber: { contains: s, mode: "insensitive" } },
        ];
    }
    const [total, orders] = await prisma_1.prisma.$transaction([
        prisma_1.prisma.order.count({ where }),
        prisma_1.prisma.order.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take,
            skip,
            include: {
                user: { select: { name: true, email: true, phone: true } },
                items: true,
                registry: { select: { id: true, registryCode: true } },
                packageOrder: {
                    include: {
                        package: { select: { title: true, slug: true } },
                        theme: { select: { title: true, slug: true } },
                    },
                },
            },
        }),
    ]);
    return {
        items: orders.map((o) => ({
            id: o.id,
            orderCode: o.orderCode,
            kind: o.kind,
            status: o.status,
            placedAt: o.placedAt,
            eventDate: o.eventDate,
            user: o.user,
            totalInPaise: o.totalInPaise,
            createdAt: o.createdAt.toISOString(),
            customerName: o.user.name,
            customerEmail: o.contactEmail,
            customerPhone: o.contactPhone,
            itemCount: o.items.length || (o.packageOrder ? 1 : 0),
            hasPersonalization: o.items.some((i) => i.personalizationSelected) || o.kind === client_1.OrderKind.PACKAGE,
            paymentStatus: o.paymentStatus,
            customizationFollowUpStatus: o.customizationFollowUpStatus,
            invoicePdfUrl: o.invoicePdfUrl,
            registryId: o.registryId,
            registryCode: o.registry?.registryCode ?? null,
            packageTitle: o.packageOrder?.package.title ?? null,
            themeTitle: o.packageOrder?.theme.title ?? null,
        })),
        total,
        page,
        pageSize,
    };
}
async function adminGetOrder(orderId) {
    const order = await prisma_1.prisma.order.findUnique({
        where: { id: orderId },
        include: {
            user: { select: { name: true, email: true, phone: true } },
            registry: { select: { id: true, registryCode: true, ownerDisplayName: true, childOrPersonName: true } },
            items: {
                include: {
                    product: { select: { title: true, sku: true, slug: true, images: { include: { media: true } } } },
                },
            },
            packageOrder: {
                include: {
                    package: { select: { title: true, slug: true } },
                    theme: { select: { title: true, slug: true } },
                    lines: true,
                },
            },
        },
    });
    if (!order)
        throw new errors_1.NotFoundError("Order not found");
    return {
        ...order,
        items: order.items.map((i) => ({
            id: i.id,
            productId: i.productId,
            title: i.product.title,
            sku: i.product.sku,
            quantity: i.quantity,
            unitPriceInPaise: i.unitPriceInPaise,
            personalizationSelected: i.personalizationSelected,
            personalizationValues: i.personalizationValues,
            personalizationCostSnapshot: i.personalizationCostSnapshot,
            fulfillmentStatus: i.fulfillmentStatus,
            lineTotalInPaise: (i.unitPriceInPaise + i.personalizationCostSnapshot) * i.quantity,
            image: i.product.images[0]?.media ?? null,
        })),
    };
}
async function adminUpdateOrderItemFulfillment(orderId, itemId, status) {
    const item = await prisma_1.prisma.orderItem.findFirst({
        where: { id: itemId, orderId },
    });
    if (!item)
        throw new errors_1.NotFoundError("Order item not found");
    await prisma_1.prisma.orderItem.update({
        where: { id: itemId },
        data: { fulfillmentStatus: status },
    });
    return adminGetOrder(orderId);
}
const ORDER_TRANSITIONS = {
    PENDING_PAYMENT: [client_1.OrderStatus.CANCELLED],
    PAID: [client_1.OrderStatus.PROCESSING, client_1.OrderStatus.CANCELLED],
    PROCESSING: [client_1.OrderStatus.SHIPPED, client_1.OrderStatus.CANCELLED],
    SHIPPED: [client_1.OrderStatus.DELIVERED],
    DELIVERED: [client_1.OrderStatus.REFUNDED],
    CANCELLED: [],
    REFUNDED: [],
};
async function adminUpdateOrderStatus(orderId, status) {
    const order = await prisma_1.prisma.order.findUnique({ where: { id: orderId } });
    if (!order)
        throw new errors_1.NotFoundError("Order not found");
    const allowed = ORDER_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(status)) {
        throw new errors_1.ValidationError(`Cannot move order from ${order.status} to ${status}`);
    }
    if (status === client_1.OrderStatus.CANCELLED && order.paymentStatus !== client_1.PaymentStatus.PAID) {
        await cancelOrderAndRestock(orderId, "Cancelled by admin");
        return adminGetOrder(orderId);
    }
    await prisma_1.prisma.order.update({ where: { id: orderId }, data: { status } });
    return adminGetOrder(orderId);
}
async function adminUpdateOrderOps(orderId, data) {
    const order = await prisma_1.prisma.order.findUnique({ where: { id: orderId } });
    if (!order)
        throw new errors_1.NotFoundError("Order not found");
    await prisma_1.prisma.order.update({
        where: { id: orderId },
        data: {
            ...(data.customizationFollowUpStatus ? { customizationFollowUpStatus: data.customizationFollowUpStatus } : {}),
            ...(data.adminNotes !== undefined ? { adminNotes: data.adminNotes } : {}),
        },
    });
    return adminGetOrder(orderId);
}
async function reorderFromOrder(userId, orderCode) {
    const order = await prisma_1.prisma.order.findFirst({
        where: { orderCode, userId },
        include: { items: true },
    });
    if (!order)
        throw new errors_1.NotFoundError("Order not found");
    const { addCartItem } = await Promise.resolve().then(() => __importStar(require("../shop/cart.service")));
    for (const item of order.items) {
        await addCartItem(userId, {
            productId: item.productId,
            quantity: item.quantity,
            personalizationValues: item.personalizationSelected ? item.personalizationValues : undefined,
            registryItemId: item.registryItemId ?? undefined,
        });
    }
    const { getCart } = await Promise.resolve().then(() => __importStar(require("../shop/cart.service")));
    return getCart(userId);
}
//# sourceMappingURL=orders.service.js.map