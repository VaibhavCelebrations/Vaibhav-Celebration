import { InventoryLedgerReason, OrderStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { nextOrderCode } from "../../lib/sequences";
import { parsePagination } from "../../lib/response";
import { computeQuote } from "../shop/cart-pricing.service";
import { adjustInventoryInTx } from "../catalog/inventory.service";
import { createRazorpayOrder, getRazorpayPublicKey } from "../../integrations/razorpay/client";
import { generateInvoicePdf } from "../../integrations/invoice/pdf";
import { nextInvoiceNumber } from "../../lib/sequences";
import { orderConfirmationHtml, sendEmail } from "../../integrations/email/mailer";
import { logger } from "../../lib/logger";

export type ShippingAddress = {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

/**
 * Re-validates the live cart (price + stock) and returns the authoritative
 * total that will be charged. The frontend renders exactly this — it never
 * computes GST or totals itself. Throws if the cart is empty or any line is
 * no longer purchasable, so the UI can surface a clear error before payment.
 */
export async function getCheckoutQuote(userId: string) {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) throw new ValidationError("Your cart is empty");

  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: { product: { include: { inventory: true } } },
  });
  if (items.length === 0) throw new ValidationError("Your cart is empty");

  const problems: string[] = [];
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
    throw new ValidationError("Some items in your cart need attention before checkout", { problems });
  }

  const quote = await computeQuote(items.map((i) => ({ productId: i.productId, unitPriceInPaise: i.product.priceInPaise, quantity: i.quantity })));
  return {
    quote,
    items: items.map((i) => ({ productId: i.productId, title: i.product.title, quantity: i.quantity, unitPriceInPaise: i.product.priceInPaise })),
  };
}

type OrderLine = { productId: string; quantity: number; personalizationValues?: unknown };

/**
 * Shared order-creation core: re-validates stock/prices inside the
 * transaction, snapshots unit prices onto OrderItem, and reserves inventory
 * (SALE ledger entry). Used by both cart checkout and direct gift-registry
 * purchases so pricing/inventory guarantees are identical everywhere an
 * order can be created.
 */
async function createOrderFromLines(
  userId: string,
  lines: OrderLine[],
  input: { shippingAddress: ShippingAddress; contactEmail: string; contactPhone: string },
  notesType: string,
) {
  if (lines.length === 0) throw new ValidationError("No items to order");

  const order = await prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where: { id: { in: lines.map((l) => l.productId) }, deletedAt: null },
      include: { inventory: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const line of lines) {
      const product = productMap.get(line.productId);
      if (!product || !product.isActive) {
        throw new ValidationError(`One of the items is no longer available`);
      }
    }

    const quote = await computeQuote(
      lines.map((l) => ({ productId: l.productId, unitPriceInPaise: productMap.get(l.productId)!.priceInPaise, quantity: l.quantity })),
    );

    const orderCode = await nextOrderCode();
    const created = await tx.order.create({
      data: {
        orderCode,
        userId,
        status: OrderStatus.PENDING_PAYMENT,
        subtotalInPaise: quote.subtotalInPaise,
        gstInPaise: quote.gstInPaise,
        totalInPaise: quote.totalInPaise,
        shippingAddress: input.shippingAddress as never,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        items: {
          create: lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPriceInPaise: productMap.get(l.productId)!.priceInPaise,
            personalizationValues: (l.personalizationValues ?? null) as never,
          })),
        },
      },
      include: { items: true },
    });

    for (const orderItem of created.items) {
      await adjustInventoryInTx(tx, {
        productId: orderItem.productId,
        delta: -orderItem.quantity,
        reason: InventoryLedgerReason.SALE,
        orderItemId: orderItem.id,
        note: `Reserved for order ${orderCode}`,
      });
    }

    return created;
  });

  const razorpayOrder = await createRazorpayOrder({
    amountInPaise: order.totalInPaise,
    receipt: order.orderCode,
    notes: { orderCode: order.orderCode, userId, type: notesType },
  });

  await prisma.order.update({ where: { id: order.id }, data: { razorpayOrderId: razorpayOrder.id } });

  return {
    orderId: order.id,
    orderCode: order.orderCode,
    totalInPaise: order.totalInPaise,
    razorpayOrderId: razorpayOrder.id,
    razorpayKeyId: getRazorpayPublicKey(),
  };
}

/**
 * Creates the order atomically from the user's server-side cart, then
 * clears it. The Razorpay order is created just after the DB transaction —
 * if that external call fails the shop order still exists in
 * PENDING_PAYMENT and can be retried without re-reserving stock twice.
 */
export async function createOrderFromCart(
  userId: string,
  input: { shippingAddress: ShippingAddress; contactEmail: string; contactPhone: string },
) {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) throw new ValidationError("Your cart is empty");

  const items = await prisma.cartItem.findMany({ where: { cartId: cart.id } });
  if (items.length === 0) throw new ValidationError("Your cart is empty");

  const result = await createOrderFromLines(
    userId,
    items.map((i) => ({ productId: i.productId, quantity: i.quantity, personalizationValues: i.personalizationValues })),
    input,
    "SHOP_ORDER",
  );

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  return result;
}

/** Single-item order used by the gift-registry "gift this item" flow — bypasses the cart entirely. */
export async function createDirectOrder(
  userId: string,
  input: { productId: string; quantity: number; shippingAddress: ShippingAddress; contactEmail: string; contactPhone: string },
) {
  return createOrderFromLines(userId, [{ productId: input.productId, quantity: input.quantity }], input, "REGISTRY_GIFT");
}

/** Restocks reserved inventory and cancels the order — used on payment.failed / manual cancellation. */
export async function cancelOrderAndRestock(orderId: string, note = "Order cancelled") {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new NotFoundError("Order not found");
    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REFUNDED) return order;

    for (const item of order.items) {
      await adjustInventoryInTx(tx, {
        productId: item.productId,
        delta: item.quantity,
        reason: InventoryLedgerReason.RETURN,
        orderItemId: item.id,
        note,
      });
    }

    return tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.CANCELLED } });
  });
}

/** Called from the Razorpay webhook on payment.captured — marks paid, invoices, and emails the customer. */
export async function markOrderPaid(orderId: string, razorpayPaymentId: string | undefined) {
  const order = await prisma.order.findFirst({
    where: { id: orderId },
    include: { items: { include: { product: true } }, user: true, giftContributions: true },
  });
  if (!order) throw new NotFoundError("Order not found");
  if (order.status === OrderStatus.PAID) return order;

  const invoiceNumber = await nextInvoiceNumber();
  const shipping = order.shippingAddress as unknown as ShippingAddress;

  let pdfUrl: string | null = null;
  try {
    const pdf = await generateInvoicePdf({
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
  } catch (err) {
    logger.error({ err, orderId }, "Failed to generate order invoice PDF");
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: OrderStatus.PAID,
      razorpayPaymentId: razorpayPaymentId ?? order.razorpayPaymentId,
      invoiceNumber,
      invoicePdfUrl: pdfUrl,
    },
  });

  void sendEmail({
    to: order.contactEmail,
    subject: `Order Confirmed — ${order.orderCode}`,
    html: orderConfirmationHtml({
      name: order.user.name,
      orderCode: order.orderCode,
      totalInPaise: order.totalInPaise,
      items: order.items.map((i) => ({ title: i.product.title, quantity: i.quantity })),
    }),
  }).catch(() => undefined);

  if (order.giftContributions.length) {
    const { GiftItemStatus } = await import("@prisma/client");
    await prisma.giftRegistryItem.updateMany({
      where: { id: { in: order.giftContributions.map((c) => c.registryItemId) } },
      data: { status: GiftItemStatus.PURCHASED },
    });
  }

  return updated;
}

export async function findOrderByRazorpayOrderId(razorpayOrderId: string) {
  return prisma.order.findFirst({ where: { razorpayOrderId } });
}

// ─── Order history (customer-facing) ─────────────────────────────────────────

export async function listOrdersForUser(userId: string, q: { page?: number; pageSize?: number }) {
  const { page, pageSize, skip, take } = parsePagination(q);
  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId },
      include: { items: { include: { product: { select: { title: true, slug: true, images: { take: 1, include: { media: true } } } } } } },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.order.count({ where: { userId } }),
  ]);
  return { items: rows.map(shapeOrder), total, page, pageSize };
}

export async function getOrderForUser(userId: string, orderCode: string) {
  const order = await prisma.order.findFirst({
    where: { orderCode, userId },
    include: { items: { include: { product: { select: { title: true, slug: true, images: { take: 1, include: { media: true } } } } } } },
  });
  if (!order) throw new NotFoundError("Order not found");
  return shapeOrder(order);
}

function shapeOrder(order: {
  id: string;
  orderCode: string;
  status: OrderStatus;
  subtotalInPaise: number;
  gstInPaise: number;
  totalInPaise: number;
  shippingAddress: unknown;
  contactEmail: string;
  contactPhone: string;
  invoicePdfUrl: string | null;
  placedAt: Date;
  createdAt: Date;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPriceInPaise: number;
    product: { title: string; slug: string; images: Array<{ media: { url: string; altText: string | null } | null }> };
  }>;
}) {
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