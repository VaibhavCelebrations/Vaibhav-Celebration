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
exports.createOrderFromCart = createOrderFromCart;
exports.createDirectOrder = createDirectOrder;
exports.cancelOrderAndRestock = cancelOrderAndRestock;
exports.markOrderPaid = markOrderPaid;
exports.findOrderByRazorpayOrderId = findOrderByRazorpayOrderId;
exports.listOrdersForUser = listOrdersForUser;
exports.getOrderForUser = getOrderForUser;
exports.adminListOrders = adminListOrders;
exports.adminGetOrder = adminGetOrder;
exports.adminUpdateOrderItemFulfillment = adminUpdateOrderItemFulfillment;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
const errors_1 = require("../../lib/errors");
const sequences_1 = require("../../lib/sequences");
const response_1 = require("../../lib/response");
const cart_pricing_service_1 = require("../shop/cart-pricing.service");
const inventory_service_1 = require("../catalog/inventory.service");
const client_2 = require("../../integrations/razorpay/client");
const pdf_1 = require("../../integrations/invoice/pdf");
const sequences_2 = require("../../lib/sequences");
const mailer_1 = require("../../integrations/email/mailer");
const logger_1 = require("../../lib/logger");
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
    const quote = await (0, cart_pricing_service_1.computeQuote)(items.map((i) => ({ productId: i.productId, unitPriceInPaise: i.product.priceInPaise, quantity: i.quantity })));
    return {
        quote,
        items: items.map((i) => ({ productId: i.productId, title: i.product.title, quantity: i.quantity, unitPriceInPaise: i.product.priceInPaise })),
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
        const quote = await (0, cart_pricing_service_1.computeQuote)(lines.map((l) => ({ productId: l.productId, unitPriceInPaise: productMap.get(l.productId).priceInPaise, quantity: l.quantity })));
        const orderCode = await (0, sequences_1.nextOrderCode)();
        const created = await tx.order.create({
            data: {
                orderCode,
                userId,
                status: client_1.OrderStatus.PENDING_PAYMENT,
                subtotalInPaise: quote.subtotalInPaise,
                gstInPaise: quote.gstInPaise,
                totalInPaise: quote.totalInPaise,
                shippingAddress: input.shippingAddress,
                contactEmail: input.contactEmail,
                contactPhone: input.contactPhone,
                items: {
                    create: lines.map((l) => ({
                        productId: l.productId,
                        quantity: l.quantity,
                        unitPriceInPaise: productMap.get(l.productId).priceInPaise,
                        personalizationValues: (l.personalizationValues ?? null),
                        personalizationSelected: l.personalizationSelected ?? false,
                        personalizationCostSnapshot: l.personalizationCostSnapshot ?? 0,
                    })),
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
 * Creates the order atomically from the user's server-side cart, then
 * clears it. The Razorpay order is created just after the DB transaction —
 * if that external call fails the shop order still exists in
 * PENDING_PAYMENT and can be retried without re-reserving stock twice.
 */
async function createOrderFromCart(userId, input) {
    const cart = await prisma_1.prisma.cart.findUnique({ where: { userId } });
    if (!cart)
        throw new errors_1.ValidationError("Your cart is empty");
    const items = await prisma_1.prisma.cartItem.findMany({ where: { cartId: cart.id } });
    if (items.length === 0)
        throw new errors_1.ValidationError("Your cart is empty");
    const result = await createOrderFromLines(userId, items.map((i) => ({ productId: i.productId, quantity: i.quantity, personalizationValues: i.personalizationValues, personalizationSelected: i.personalizationSelected, personalizationCostSnapshot: i.personalizationCostSnapshot })), input, "SHOP_ORDER");
    await prisma_1.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return result;
}
/** Single-item order used by the gift-registry "gift this item" flow — bypasses the cart entirely. */
async function createDirectOrder(userId, input) {
    return createOrderFromLines(userId, [{ productId: input.productId, quantity: input.quantity }], input, "REGISTRY_GIFT");
}
/** Restocks reserved inventory and cancels the order — used on payment.failed / manual cancellation. */
async function cancelOrderAndRestock(orderId, note = "Order cancelled") {
    return prisma_1.prisma.$transaction(async (tx) => {
        const order = await tx.order.findFirst({ where: { id: orderId }, include: { items: true } });
        if (!order)
            throw new errors_1.NotFoundError("Order not found");
        if (order.status === client_1.OrderStatus.CANCELLED || order.status === client_1.OrderStatus.REFUNDED)
            return order;
        for (const item of order.items) {
            await (0, inventory_service_1.adjustInventoryInTx)(tx, {
                productId: item.productId,
                delta: item.quantity,
                reason: client_1.InventoryLedgerReason.RETURN,
                orderItemId: item.id,
                note,
            });
        }
        return tx.order.update({ where: { id: order.id }, data: { status: client_1.OrderStatus.CANCELLED } });
    });
}
/** Called from the Razorpay webhook on payment.captured — marks paid, invoices, and emails the customer. */
async function markOrderPaid(orderId, razorpayPaymentId) {
    const order = await prisma_1.prisma.order.findFirst({
        where: { id: orderId },
        include: { items: { include: { product: true } }, user: true, giftContributions: true },
    });
    if (!order)
        throw new errors_1.NotFoundError("Order not found");
    if (order.status === client_1.OrderStatus.PAID)
        return order;
    const invoiceNumber = await (0, sequences_2.nextInvoiceNumber)();
    const shipping = order.shippingAddress;
    let pdfUrl = null;
    try {
        const pdf = await (0, pdf_1.generateInvoicePdf)({
            invoiceNumber,
            guestName: shipping.fullName || order.user.name,
            guestEmail: order.contactEmail,
            guestPhone: order.contactPhone,
            lineItems: order.items.map((i) => ({ label: `${i.product.title} × ${i.quantity}`, amountInPaise: i.unitPriceInPaise * i.quantity })),
            subtotalInPaise: order.subtotalInPaise,
            gstInPaise: order.gstInPaise,
            totalInPaise: order.totalInPaise,
            issuedAt: new Date(),
        });
        pdfUrl = pdf.url;
    }
    catch (err) {
        logger_1.logger.error({ err, orderId }, "Failed to generate order invoice PDF");
    }
    const updated = await prisma_1.prisma.order.update({
        where: { id: order.id },
        data: {
            status: client_1.OrderStatus.PAID,
            razorpayPaymentId: razorpayPaymentId ?? order.razorpayPaymentId,
            invoiceNumber,
            invoicePdfUrl: pdfUrl,
        },
    });
    void (0, mailer_1.sendEmail)({
        to: order.contactEmail,
        subject: `Order Confirmed — ${order.orderCode}`,
        html: (0, mailer_1.orderConfirmationHtml)({
            name: order.user.name,
            orderCode: order.orderCode,
            totalInPaise: order.totalInPaise,
            items: order.items.map((i) => ({ title: i.product.title, quantity: i.quantity })),
        }),
    }).catch(() => undefined);
    if (order.giftContributions.length) {
        const { GiftItemStatus } = await Promise.resolve().then(() => __importStar(require("@prisma/client")));
        await prisma_1.prisma.giftRegistryItem.updateMany({
            where: { id: { in: order.giftContributions.map((c) => c.registryItemId) } },
            data: { status: GiftItemStatus.PURCHASED },
        });
    }
    return updated;
}
async function findOrderByRazorpayOrderId(razorpayOrderId) {
    return prisma_1.prisma.order.findFirst({ where: { razorpayOrderId } });
}
// ─── Order history (customer-facing) ─────────────────────────────────────────
async function listOrdersForUser(userId, q) {
    const { page, pageSize, skip, take } = (0, response_1.parsePagination)(q);
    const [rows, total] = await Promise.all([
        prisma_1.prisma.order.findMany({
            where: { userId },
            include: { items: { include: { product: { select: { title: true, slug: true, images: { take: 1, include: { media: true } } } } } } },
            orderBy: { createdAt: "desc" },
            skip,
            take,
        }),
        prisma_1.prisma.order.count({ where: { userId } }),
    ]);
    return { items: rows.map(shapeOrder), total, page, pageSize };
}
async function getOrderForUser(userId, orderCode) {
    const order = await prisma_1.prisma.order.findFirst({
        where: { orderCode, userId },
        include: { items: { include: { product: { select: { title: true, slug: true, images: { take: 1, include: { media: true } } } } } } },
    });
    if (!order)
        throw new errors_1.NotFoundError("Order not found");
    return shapeOrder(order);
}
function shapeOrder(order) {
    return {
        id: order.id,
        orderCode: order.orderCode,
        status: order.status,
        subtotalInPaise: order.subtotalInPaise,
        gstInPaise: order.gstInPaise,
        totalInPaise: order.totalInPaise,
        shippingAddress: order.shippingAddress,
        contactEmail: order.contactEmail,
        contactPhone: order.contactPhone,
        invoicePdfUrl: order.invoicePdfUrl,
        placedAt: order.placedAt.toISOString(),
        createdAt: order.createdAt.toISOString(),
        items: order.items.map((i) => ({
            id: i.id,
            productId: i.productId,
            title: i.product.title,
            slug: i.product.slug,
            quantity: i.quantity,
            unitPriceInPaise: i.unitPriceInPaise,
            lineTotalInPaise: i.unitPriceInPaise * i.quantity,
            image: i.product.images[0]?.media ?? null,
        })),
    };
}
// ─── ADMIN CRM ───────────────────────────────────────────────────────────────
async function adminListOrders(query) {
    const { take, skip, page, pageSize } = (0, response_1.parsePagination)(query);
    const where = {};
    if (query.status)
        where.status = query.status;
    if (query.search) {
        const s = query.search.trim();
        where.OR = [
            { orderCode: { contains: s, mode: "insensitive" } },
            { contactEmail: { contains: s, mode: "insensitive" } },
            { contactPhone: { contains: s, mode: "insensitive" } },
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
            },
        }),
    ]);
    return {
        meta: (0, response_1.paginationMeta)(page, pageSize, total),
        data: orders.map((o) => ({
            id: o.id,
            orderCode: o.orderCode,
            status: o.status,
            totalInPaise: o.totalInPaise,
            createdAt: o.createdAt.toISOString(),
            customerName: o.user.name,
            customerEmail: o.contactEmail,
            customerPhone: o.contactPhone,
            itemCount: o.items.length,
            hasPersonalization: o.items.some((i) => i.personalizationSelected),
        })),
    };
}
async function adminGetOrder(orderId) {
    const order = await prisma_1.prisma.order.findUnique({
        where: { id: orderId },
        include: {
            user: { select: { name: true, email: true, phone: true } },
            items: {
                include: {
                    product: { select: { title: true, sku: true, slug: true, images: { include: { media: true } } } },
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
//# sourceMappingURL=orders.service.js.map