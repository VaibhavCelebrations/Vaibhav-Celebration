import { CustomizationFollowUpStatus, GiftContributionStatus, InventoryLedgerReason, OrderKind, OrderStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { nextOrderCode } from "../../lib/sequences";
import { parsePagination } from "../../lib/response";
import { computeQuote } from "../shop/cart-pricing.service";
import { adjustInventoryInTx } from "../catalog/inventory.service";
import { createRazorpayOrder, getRazorpayPublicKey, verifyCheckoutPaymentSignature } from "../../integrations/razorpay/client";
import { claimPaymentEvent } from "../payments/payment-events";
import { generateInvoicePdf, fetchInvoicePdfBuffer } from "../../integrations/invoice/pdf";
import { nextInvoiceNumber } from "../../lib/sequences";
import { orderConfirmationHtml, sendEmail } from "../../integrations/email/mailer";
import { getGstPercent } from "../../lib/settings";
import { sendOrderConfirmationWhatsapp } from "../whatsapp/whatsapp.service";
import { logger } from "../../lib/logger";
import { giftRegistryStateForPackageOrder } from "../upgrades/upgrades.service";
import { InvoiceLinkedType } from "@prisma/client";
import { fulfillRegistryContributionsForOrder, releaseRegistryReservationsForOrder, reserveRegistryItemQty } from "../registry/registry-qty";
import { parseShippingAddress } from "../registry/address";
import {
  computeBuilderQuote,
  type BuilderLocation,
  type BuilderQuoteInput,
  type BuilderSelections,
} from "../builder/builder.service";
import { toDateOnly } from "../../lib/validators";

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

  const quote = await computeQuote(
    items.map((i) => ({
      productId: i.productId,
      unitPriceInPaise: i.product.priceInPaise,
      quantity: i.quantity,
      personalizationCostInPaise: i.personalizationSelected ? i.product.personalizationCostInPaise : 0,
    })),
  );

  const registryItemIds = items.map((i) => i.registryItemId).filter(Boolean);
  let registryCheckout: { registryCode: string; recipientName: string; shippingAddress: ShippingAddress } | null = null;
  if (registryItemIds.length) {
    const registryItem = await prisma.giftRegistryItem.findFirst({
      where: { id: registryItemIds[0] },
      include: { registry: true },
    });
    if (registryItem) {
      const addr = parseShippingAddress(registryItem.registry.shippingAddress);
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

type OrderLine = {
  productId: string;
  quantity: number;
  personalizationValues?: unknown;
  personalizationSelected?: boolean;
  personalizationCostSnapshot?: number;
  registryItemId?: string | null;
};

/** Event-package builder payload attached to a shop/direct checkout — see PackageBuilderSchema in orders.routes.ts. */
export type PackageDataInput = {
  eventDate: string;
  contactEmail?: string;
  contactPhone?: string;
  shippingAddress?: ShippingAddress;
  eventDetails?: {
    childName?: string;
    childAge?: string;
    venue?: string;
    guestCount?: number | string;
    notes?: string;
  };
  builder: {
    packageSlug: string;
    themeSlug: string;
    guestCount: number;
    location: BuilderLocation;
    selections: BuilderSelections;
  };
};

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
      lines.map((l) => {
        const product = productMap.get(l.productId)!;
        const selected = Boolean(l.personalizationSelected && product.personalizationEnabled);
        return {
          productId: l.productId,
          unitPriceInPaise: product.priceInPaise,
          quantity: l.quantity,
          personalizationCostInPaise: selected ? product.personalizationCostInPaise : 0,
        };
      }),
    );

    const hasCustomization = lines.some((l) => {
      const product = productMap.get(l.productId)!;
      return Boolean(l.personalizationSelected && product.personalizationEnabled);
    });

    const registryItemIds = [...new Set(lines.map((l) => l.registryItemId).filter((id): id is string => Boolean(id)))];
    let registryId: string | null = null;
    let shippingAddress = input.shippingAddress;
    if (registryItemIds.length) {
      const registryItems = await tx.giftRegistryItem.findMany({
        where: { id: { in: registryItemIds } },
        include: { registry: true },
      });
      if (registryItems.length !== registryItemIds.length) {
        throw new ValidationError("One of the registry gifts is no longer available");
      }
      const registryIds = new Set(registryItems.map((i) => i.registryId));
      if (registryIds.size > 1) {
        throw new ValidationError("Checkout can only include gifts from one registry at a time");
      }
      const registry = registryItems[0]!.registry;
      registryId = registry.id;
      const lockedAddress = parseShippingAddress(registry.shippingAddress);
      if (!lockedAddress) throw new ValidationError("This registry does not have a delivery address yet");
      shippingAddress = lockedAddress;
      for (const line of lines) {
        if (!line.registryItemId) continue;
        await reserveRegistryItemQty(tx, line.registryItemId, line.quantity);
      }
    }

    const orderCode = await nextOrderCode();
    const created = await tx.order.create({
      data: {
        orderCode,
        userId,
        registryId,
        status: OrderStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.PENDING,
        customizationFollowUpStatus: hasCustomization
          ? CustomizationFollowUpStatus.REQUIRED
          : CustomizationFollowUpStatus.NOT_REQUIRED,
        subtotalInPaise: quote.subtotalInPaise,
        gstInPaise: quote.gstInPaise,
        totalInPaise: quote.totalInPaise,
        shippingInPaise: quote.shippingInPaise,
        shippingWaived: quote.shippingWaived,
        freeShippingThresholdSnapshotInPaise: quote.freeShippingThresholdInPaise,
        shippingAddress: shippingAddress as never,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        items: {
          create: lines.map((l) => {
            const product = productMap.get(l.productId)!;
            const selected = Boolean(l.personalizationSelected && product.personalizationEnabled);
            return {
              productId: l.productId,
              registryItemId: l.registryItemId || null,
              quantity: l.quantity,
              unitPriceInPaise: product.priceInPaise,
              personalizationValues: (l.personalizationValues ?? null) as never,
              personalizationSelected: selected,
              personalizationCostSnapshot: selected ? product.personalizationCostInPaise : 0,
            };
          }),
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
      if (orderItem.registryItemId) {
        await tx.giftRegistryContribution.create({
          data: {
            registryItemId: orderItem.registryItemId,
            gifterUserId: userId,
            orderId: created.id,
            quantity: orderItem.quantity,
            status: GiftContributionStatus.PENDING,
          },
        });
      }
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

/** Validates + prices the builder payload — shared by the package-only and combined checkout paths. */
async function computePackagePieces(packageData: PackageDataInput) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(packageData.eventDate)) {
    throw new ValidationError("eventDate must be YYYY-MM-DD");
  }
  if (!packageData.builder?.packageSlug || !packageData.builder?.themeSlug) {
    throw new ValidationError("Package and theme are required");
  }
  if (!Number.isFinite(packageData.builder.guestCount) || packageData.builder.guestCount < 5) {
    throw new ValidationError("Guest count must be at least 5");
  }

  const builderInput: BuilderQuoteInput = {
    packageSlug: packageData.builder.packageSlug,
    themeSlug: packageData.builder.themeSlug,
    guestCount: Math.floor(packageData.builder.guestCount),
    location: packageData.builder.location === "outside" ? "outside" : "jaipur",
    selections: packageData.builder.selections ?? {},
  };
  const quote = await computeBuilderQuote(builderInput);
  const eventDate = toDateOnly(packageData.eventDate);
  return { builderInput, quote, eventDate };
}

/**
 * Creates a single order covering the shop cart AND an event package
 * together — one combined subtotal (so free-delivery correctly considers
 * both), one GST calculation, and one Razorpay payment. `lines` may be
 * empty (package-only checkout); prices are always recomputed server-side.
 */
async function createCombinedPackageAndShopOrder(
  userId: string,
  lines: OrderLine[],
  input: { shippingAddress: ShippingAddress; contactEmail: string; contactPhone: string },
  packageData: PackageDataInput,
) {
  await saveDefaultAddressIfNeeded(userId, packageData.shippingAddress ?? input.shippingAddress);
  
  const { builderInput, quote: packageQuote, eventDate } = await computePackagePieces(packageData);

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

    // Merchandise from BOTH the shop cart and the event package count toward
    // the free-delivery threshold and share one shipping/GST calculation.
    const combinedQuote = await computeQuote(
      lines.map((l) => {
        const product = productMap.get(l.productId)!;
        const selected = Boolean(l.personalizationSelected && product.personalizationEnabled);
        return {
          productId: l.productId,
          unitPriceInPaise: product.priceInPaise,
          quantity: l.quantity,
          personalizationCostInPaise: selected ? product.personalizationCostInPaise : 0,
        };
      }),
      packageQuote.subtotalInPaise,
    );

    const hasCustomization =
      lines.some((l) => {
        const product = productMap.get(l.productId)!;
        return Boolean(l.personalizationSelected && product.personalizationEnabled);
      }) ||
      packageQuote.hasPersonalization ||
      packageQuote.lineItems.some((li) => li.personalizationSelected);

    const shippingAddress = packageData.shippingAddress ?? input.shippingAddress;
    const contactEmail = (packageData.contactEmail ?? input.contactEmail).toLowerCase().trim();
    const contactPhone = (packageData.contactPhone ?? input.contactPhone).trim();

    const orderCode = await nextOrderCode();
    const created = await tx.order.create({
      data: {
        orderCode,
        userId,
        kind: OrderKind.PACKAGE,
        status: OrderStatus.PENDING_PAYMENT,
        paymentStatus: PaymentStatus.PENDING,
        customizationFollowUpStatus: hasCustomization
          ? CustomizationFollowUpStatus.REQUIRED
          : CustomizationFollowUpStatus.NOT_REQUIRED,
        subtotalInPaise: combinedQuote.subtotalInPaise,
        gstInPaise: combinedQuote.gstInPaise,
        totalInPaise: combinedQuote.totalInPaise,
        shippingInPaise: combinedQuote.shippingInPaise,
        shippingWaived: combinedQuote.shippingWaived,
        freeShippingThresholdSnapshotInPaise: combinedQuote.freeShippingThresholdInPaise,
        shippingAddress: shippingAddress as never,
        contactEmail,
        contactPhone,
        eventDate,
        eventDetails: {
          childName: packageData.eventDetails?.childName ?? null,
          childAge: packageData.eventDetails?.childAge ?? null,
          venue: packageData.eventDetails?.venue ?? null,
          guestCount: packageData.eventDetails?.guestCount ?? builderInput.guestCount,
          notes: packageData.eventDetails?.notes ?? null,
          packageTitle: packageQuote.packageTitle,
          themeTitle: packageQuote.themeTitle,
        } as never,
        items: lines.length
          ? {
              create: lines.map((l) => {
                const product = productMap.get(l.productId)!;
                const selected = Boolean(l.personalizationSelected && product.personalizationEnabled);
                return {
                  productId: l.productId,
                  registryItemId: l.registryItemId || null,
                  quantity: l.quantity,
                  unitPriceInPaise: product.priceInPaise,
                  personalizationValues: (l.personalizationValues ?? null) as never,
                  personalizationSelected: selected,
                  personalizationCostSnapshot: selected ? product.personalizationCostInPaise : 0,
                };
              }),
            }
          : undefined,
        packageOrder: {
          create: {
            packageId: packageQuote.packageId,
            themeId: packageQuote.themeId,
            basePriceInPaise: packageQuote.basePriceInPaise,
            customizationTotalInPaise: packageQuote.customizationTotalInPaise,
            guestCount: packageQuote.guestCount,
            location: packageQuote.location,
            builderInput: builderInput as never,
            quoteSnapshot: packageQuote as never,
            lines: {
              create: packageQuote.lineItems.map((line) => ({
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
      include: { items: true, packageOrder: true },
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
    notes: { orderCode: order.orderCode, userId, type: "PACKAGE_AND_SHOP_ORDER" },
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
 * Create a PACKAGE celebration order from the builder quote.
 * Prices are always recomputed server-side — never trust the client total.
 */
export async function createPackageOrder(
  userId: string,
  input: {
    eventDate: string;
    contactEmail: string;
    contactPhone: string;
    shippingAddress?: ShippingAddress;
    eventDetails?: {
      childName?: string;
      childAge?: string;
      venue?: string;
      guestCount?: number | string;
      notes?: string;
    };
    builder: {
      packageSlug: "essential" | "signature" | "grand" | string;
      themeSlug: string;
      guestCount: number;
      location: BuilderLocation;
      selections: BuilderSelections;
    };
  },
) {
  if (input.shippingAddress) {
    await saveDefaultAddressIfNeeded(userId, input.shippingAddress);
  }
  const { builderInput, quote, eventDate } = await computePackagePieces(input);
  const shippingAddress: ShippingAddress = input.shippingAddress ?? {
    fullName: input.eventDetails?.childName?.trim() || "Celebration guest",
    line1: input.eventDetails?.venue?.trim() || "Venue to be confirmed",
    city: builderInput.location === "jaipur" ? "Jaipur" : "Outside Jaipur",
    state: "Rajasthan",
    pincode: "000000",
    country: "India",
  };

  const hasCustomization =
    quote.hasPersonalization ||
    quote.lineItems.some((line) => line.personalizationSelected);

  const orderCode = await nextOrderCode();
  const order = await prisma.order.create({
    data: {
      orderCode,
      userId,
      kind: OrderKind.PACKAGE,
      status: OrderStatus.PENDING_PAYMENT,
      paymentStatus: PaymentStatus.PENDING,
      customizationFollowUpStatus: hasCustomization
        ? CustomizationFollowUpStatus.REQUIRED
        : CustomizationFollowUpStatus.NOT_REQUIRED,
      subtotalInPaise: quote.subtotalInPaise,
      gstInPaise: quote.gstInPaise,
      totalInPaise: quote.totalInPaise,
      shippingInPaise: quote.shippingInPaise,
      shippingWaived: quote.shippingWaived,
      freeShippingThresholdSnapshotInPaise: quote.freeShippingThresholdInPaise,
      shippingAddress: shippingAddress as never,
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
      } as never,
      packageOrder: {
        create: {
          packageId: quote.packageId,
          themeId: quote.themeId,
          basePriceInPaise: quote.basePriceInPaise,
          customizationTotalInPaise: quote.customizationTotalInPaise,
          guestCount: quote.guestCount,
          location: quote.location,
          builderInput: builderInput as never,
          quoteSnapshot: quote as never,
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

  const razorpayOrder = await createRazorpayOrder({
    amountInPaise: order.totalInPaise,
    receipt: order.orderCode,
    notes: { orderCode: order.orderCode, userId, type: "PACKAGE_ORDER" },
  });

  await prisma.order.update({ where: { id: order.id }, data: { razorpayOrderId: razorpayOrder.id } });

  return {
    orderId: order.id,
    orderCode: order.orderCode,
    kind: OrderKind.PACKAGE,
    totalInPaise: order.totalInPaise,
    razorpayOrderId: razorpayOrder.id,
    razorpayKeyId: getRazorpayPublicKey(),
    eventDate: input.eventDate,
    packageTitle: quote.packageTitle,
    themeTitle: quote.themeTitle,
  };
}

async function saveDefaultAddressIfNeeded(userId: string, shippingAddress: ShippingAddress) {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (user && !user.defaultAddress) {
    await prisma.user.update({
      where: { id: userId },
      data: { defaultAddress: shippingAddress as never },
    });
  }
}

/**
 * Creates the order from the server cart. Cart is NOT cleared until payment
 * is verified — cancelled/failed Razorpay checkouts must not empty the cart.
 * Reuses an existing unpaid order when the cart contents still match.
 */
export async function createOrderFromCart(
  userId: string,
  input: {
    shippingAddress: ShippingAddress;
    contactEmail: string;
    contactPhone: string;
    packageData?: PackageDataInput;
  },
) {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) throw new ValidationError("Your cart is empty");

  const items = await prisma.cartItem.findMany({ where: { cartId: cart.id } });
  if (items.length === 0 && !input.packageData) throw new ValidationError("Your cart is empty");

  await saveDefaultAddressIfNeeded(userId, input.shippingAddress);

  const lines = items.map((i) => ({
    productId: i.productId,
    quantity: i.quantity,
    personalizationValues: i.personalizationValues,
    personalizationSelected: i.personalizationSelected,
    personalizationCostSnapshot: i.personalizationCostSnapshot,
    registryItemId: i.registryItemId || null,
  }));

  // Combined checkout — an event package (with or without shop items) is
  // priced as one order so free-delivery/GST reflect the true combined
  // subtotal. This bypasses the pending-order-reuse path below, which only
  // applies to plain shop carts.
  if (input.packageData) {
    return createCombinedPackageAndShopOrder(userId, lines, input, input.packageData);
  }

  const pending = await prisma.order.findFirst({
    where: {
      userId,
      status: OrderStatus.PENDING_PAYMENT,
      paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED, PaymentStatus.CANCELLED] },
    },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  if (pending && cartMatchesOrder(pending.items, lines)) {
    await prisma.order.update({
      where: { id: pending.id },
      data: {
        shippingAddress: input.shippingAddress as never,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        paymentStatus: PaymentStatus.PENDING,
      },
    });
    if (pending.razorpayOrderId) {
      return {
        orderId: pending.id,
        orderCode: pending.orderCode,
        totalInPaise: pending.totalInPaise,
        razorpayOrderId: pending.razorpayOrderId,
        razorpayKeyId: getRazorpayPublicKey(),
      };
    }
    const razorpayOrder = await createRazorpayOrder({
      amountInPaise: pending.totalInPaise,
      receipt: pending.orderCode,
      notes: { orderCode: pending.orderCode, userId, type: "SHOP_ORDER" },
    });
    await prisma.order.update({ where: { id: pending.id }, data: { razorpayOrderId: razorpayOrder.id } });
    return {
      orderId: pending.id,
      orderCode: pending.orderCode,
      totalInPaise: pending.totalInPaise,
      razorpayOrderId: razorpayOrder.id,
      razorpayKeyId: getRazorpayPublicKey(),
    };
  }

  if (pending) {
    await cancelOrderAndRestock(pending.id, "Superseded by updated cart checkout");
  }

  return createOrderFromLines(userId, lines, input, "SHOP_ORDER");
}

function cartMatchesOrder(
  orderItems: Array<{ productId: string; quantity: number; personalizationSelected: boolean; registryItemId?: string | null }>,
  lines: OrderLine[],
) {
  if (orderItems.length !== lines.length) return false;
  const key = (p: string, q: number, s: boolean, r?: string | null) => `${p}:${q}:${s ? 1 : 0}:${r ?? ""}`;
  const a = orderItems.map((i) => key(i.productId, i.quantity, i.personalizationSelected, i.registryItemId)).sort();
  const b = lines.map((i) => key(i.productId, i.quantity, i.personalizationSelected ?? false, i.registryItemId)).sort();
  return a.join("|") === b.join("|");
}

/** Single-item order used by the gift-registry "gift this item" flow — bypasses the cart entirely. */
export async function createDirectOrder(
  userId: string,
  input: {
    productId: string;
    quantity: number;
    shippingAddress: ShippingAddress;
    contactEmail: string;
    contactPhone: string;
    registryItemId?: string;
    registryId?: string;
    personalizationValues?: unknown;
    personalizationSelected?: boolean;
    packageData?: PackageDataInput;
  },
) {
  await saveDefaultAddressIfNeeded(userId, input.shippingAddress);

  const lines: OrderLine[] = [
    {
      productId: input.productId,
      quantity: input.quantity,
      registryItemId: input.registryItemId,
      personalizationValues: input.personalizationValues,
      personalizationSelected: input.personalizationSelected,
    },
  ];

  if (input.packageData) {
    return createCombinedPackageAndShopOrder(userId, lines, input, input.packageData);
  }

  return createOrderFromLines(userId, lines, input, input.registryItemId ? "REGISTRY_GIFT" : "SHOP_DIRECT");
}

/** Restocks reserved inventory and cancels the order — used on payment.failed / manual cancellation. */
export async function cancelOrderAndRestock(orderId: string, note = "Order cancelled") {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new NotFoundError("Order not found");
    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REFUNDED) return order;
    if (order.status === OrderStatus.PAID || order.paymentStatus === PaymentStatus.PAID) {
      throw new ValidationError("Paid orders cannot be cancelled this way");
    }

    for (const item of order.items) {
      await adjustInventoryInTx(tx, {
        productId: item.productId,
        delta: item.quantity,
        reason: InventoryLedgerReason.RETURN,
        orderItemId: item.id,
        note,
      });
    }

    await releaseRegistryReservationsForOrder(tx, order.id);

    return tx.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.CANCELLED, paymentStatus: PaymentStatus.CANCELLED },
    });
  });
}

/** Payment failed — keep reserved stock and cart; customer may retry the same order. */
export async function markOrderPaymentFailed(orderId: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId } });
  if (!order) throw new NotFoundError("Order not found");
  if (order.status === OrderStatus.PAID || order.paymentStatus === PaymentStatus.PAID) return order;
  if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REFUNDED) return order;
  return prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: PaymentStatus.FAILED },
  });
}

export async function markOrderPaymentCancelled(orderId: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId } });
  if (!order) throw new NotFoundError("Order not found");
  if (order.status === OrderStatus.PAID || order.paymentStatus === PaymentStatus.PAID) return order;
  if (order.status === OrderStatus.CANCELLED) return order;
  return prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: PaymentStatus.CANCELLED },
  });
}

export async function retryShopPayment(userId: string, orderCode: string) {
  const order = await prisma.order.findFirst({ where: { orderCode, userId } });
  if (!order) throw new NotFoundError("Order not found");
  if (order.paymentStatus === PaymentStatus.PAID || order.status === OrderStatus.PAID) {
    throw new ValidationError("This order is already paid");
  }
  if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REFUNDED) {
    throw new ValidationError("This order cannot be paid");
  }
  if (order.razorpayOrderId && order.paymentStatus !== PaymentStatus.FAILED) {
    return {
      orderId: order.id,
      orderCode: order.orderCode,
      totalInPaise: order.totalInPaise,
      razorpayOrderId: order.razorpayOrderId,
      razorpayKeyId: getRazorpayPublicKey(),
    };
  }
  const razorpayOrder = await createRazorpayOrder({
    amountInPaise: order.totalInPaise,
    receipt: order.orderCode,
    notes: { orderCode: order.orderCode, userId, type: "SHOP_ORDER_RETRY" },
  });
  await prisma.order.update({
    where: { id: order.id },
    data: { razorpayOrderId: razorpayOrder.id, paymentStatus: PaymentStatus.PENDING },
  });
  return {
    orderId: order.id,
    orderCode: order.orderCode,
    totalInPaise: order.totalInPaise,
    razorpayOrderId: razorpayOrder.id,
    razorpayKeyId: getRazorpayPublicKey(),
  };
}

export async function verifyShopCheckoutPayment(input: {
  userId: string;
  orderCode: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const order = await prisma.order.findFirst({ where: { orderCode: input.orderCode, userId: input.userId } });
  if (!order) throw new NotFoundError("Order not found");
  if (order.razorpayOrderId && order.razorpayOrderId !== input.razorpayOrderId) {
    throw new ValidationError("Payment order does not match this shop order");
  }
  if (!verifyCheckoutPaymentSignature({
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
    razorpaySignature: input.razorpaySignature,
  })) {
    throw new ValidationError("Invalid payment signature");
  }
  await claimPaymentEvent({
    eventKey: `payment.captured:${input.razorpayPaymentId}`,
    eventType: "checkout.verify",
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
  });
  await markOrderPaid(order.id, input.razorpayPaymentId);
  return getOrderForUser(input.userId, order.orderCode);
}

/** A send stuck at PENDING this long almost certainly means the process crashed mid-send — safe to reclaim. */
const EMAIL_PENDING_STALE_MINUTES = 10;

/**
 * Atomically claims the right to (re)send an order-confirmation email.
 * Reclaimable states: never attempted (`null`), a previous attempt that
 * failed or was skipped (SMTP not configured at the time), or a `PENDING`
 * claim old enough to indicate the process died before finishing the send.
 * Using `updateMany` with the status filter keeps the claim race-free even
 * if webhook + polling both fire around the same time.
 */
async function claimOrderConfirmationEmail(orderId: string) {
  const staleBefore = new Date(Date.now() - EMAIL_PENDING_STALE_MINUTES * 60 * 1000);
  return prisma.order.updateMany({
    where: {
      id: orderId,
      OR: [
        { emailSendStatus: null },
        { emailSendStatus: "FAILED" },
        { emailSendStatus: "SKIPPED" },
        { emailSendStatus: "PENDING", updatedAt: { lt: staleBefore } },
      ],
    },
    data: { emailSendStatus: "PENDING" },
  });
}

/** Retries transient SMTP failures (e.g. brief network blip) before giving up; skips retry when SMTP is simply unconfigured. */
async function sendEmailWithRetry(
  payload: Parameters<typeof sendEmail>[0],
  attempts = 2,
  delayMs = 1500,
): Promise<ReturnType<typeof sendEmail> extends Promise<infer T> ? T : never> {
  let last = await sendEmail(payload);
  for (let attempt = 1; attempt < attempts && last.status === "FAILED"; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    last = await sendEmail(payload);
  }
  return last;
}

function findOrderForConfirmationEmail(orderId: string) {
  return prisma.order.findFirst({
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
}

/** Builds and sends the order-confirmation email + invoice attachment, then records the outcome. Shared by the payment webhook and the admin resend action. */
async function sendOrderConfirmationEmailNow(
  order: NonNullable<Awaited<ReturnType<typeof findOrderForConfirmationEmail>>>,
  invoiceNumber: string | null | undefined,
  pdfUrl: string | null | undefined,
) {
  const packageConfirmationItems =
    order.kind === OrderKind.PACKAGE && order.packageOrder
      ? [
          {
            title: `${order.packageOrder.theme.title} — ${order.packageOrder.package.title}`,
            quantity: 1,
          },
          ...order.packageOrder.lines
            .filter((line) => line.section !== "package")
            .map((line) => ({ title: line.label, quantity: line.quantity })),
        ]
      : [];
  const shopConfirmationItems = order.items.map((i) => ({ title: i.product.title, quantity: i.quantity }));
  const confirmationItems =
    order.kind === OrderKind.UPGRADE
      ? [
          {
            title:
              (order.eventDetails as { upgradeTitle?: string } | null)?.upgradeTitle ||
              "Gift Registry",
            quantity: 1,
          },
        ]
      : [...packageConfirmationItems, ...shopConfirmationItems];

  const pdfAttachmentBuffer = await fetchInvoicePdfBuffer(pdfUrl);
  const attachmentName = invoiceNumber ? `Invoice-${invoiceNumber}.pdf` : `Invoice-${order.orderCode}.pdf`;

  const confirmation = await sendEmailWithRetry({
    to: order.contactEmail,
    subject: `Order Confirmed — ${order.orderCode}`,
    html: orderConfirmationHtml({
      name: order.user.name,
      orderCode: order.orderCode,
      totalInPaise: order.totalInPaise,
      items: confirmationItems,
      invoiceNumber: invoiceNumber ?? null,
      customizationFollowUp: order.customizationFollowUpStatus === CustomizationFollowUpStatus.REQUIRED,
    }),
    attachments:
      pdfAttachmentBuffer
        ? [{ filename: attachmentName, content: pdfAttachmentBuffer, contentType: "application/pdf" }]
        : undefined,
  });

  if (invoiceNumber) {
    await prisma.invoice.updateMany({
      where: { orderId: order.id },
      data: {
        emailSentAt: confirmation.sent ? new Date() : undefined,
        emailSendStatus: confirmation.status,
      },
    });
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      confirmationEmailSentAt: confirmation.sent ? new Date() : undefined,
      emailSendStatus: confirmation.status,
      emailSendError: confirmation.error ?? null,
    },
  });

  return confirmation;
}

/**
 * Admin-triggered resend — mirrors the invoice-resend pattern in
 * payments.service.ts, but for the order-confirmation email (which also
 * carries the invoice PDF as an attachment). Forces the claim regardless of
 * current emailSendStatus so it works even right after an automatic attempt.
 */
export async function resendOrderConfirmationEmail(orderId: string) {
  const order = await findOrderForConfirmationEmail(orderId);
  if (!order) throw new NotFoundError("Order not found");
  if (order.paymentStatus !== PaymentStatus.PAID) {
    throw new ValidationError("Order confirmation can only be resent for paid orders");
  }

  await prisma.order.update({ where: { id: order.id }, data: { emailSendStatus: "PENDING" } });

  const invoiceNumber = order.invoice?.invoiceNumber ?? order.invoiceNumber;
  const pdfUrl = order.invoice?.pdfUrl ?? order.invoicePdfUrl;
  const confirmation = await sendOrderConfirmationEmailNow(order, invoiceNumber, pdfUrl);
  return { orderId: order.id, orderCode: order.orderCode, ...confirmation };
}

/** Called from webhook or verified checkout callback — marks paid, invoices, notifies, clears purchased cart lines. */
export async function markOrderPaid(orderId: string, razorpayPaymentId: string | undefined) {
  await prisma.order.updateMany({
    where: { id: orderId, paymentStatus: { not: PaymentStatus.PAID } },
    data: {
      status: OrderStatus.PAID,
      paymentStatus: PaymentStatus.PAID,
      ...(razorpayPaymentId ? { razorpayPaymentId } : {}),
    },
  });

  const order = await findOrderForConfirmationEmail(orderId);
  if (!order) throw new NotFoundError("Order not found");

  const shipping = order.shippingAddress as unknown as ShippingAddress;
  let invoiceNumber = order.invoice?.invoiceNumber ?? order.invoiceNumber;
  let pdfUrl = order.invoice?.pdfUrl ?? order.invoicePdfUrl;

  if (!order.invoice) {
    invoiceNumber = invoiceNumber ?? (await nextInvoiceNumber());
    try {
      // A combined checkout has BOTH a packageOrder and shop OrderItems on
      // the same order — list both so the invoice reflects everything paid for.
      const packageLineItems =
        order.kind === OrderKind.PACKAGE && order.packageOrder
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
          : [];
      const shopLineItems = order.items.map((i) => ({
        label: i.personalizationSelected
          ? `${i.product.title} × ${i.quantity} (personalized)`
          : `${i.product.title} × ${i.quantity}`,
        amountInPaise: (i.unitPriceInPaise + i.personalizationCostSnapshot) * i.quantity,
      }));
      const lineItems =
        order.kind === OrderKind.UPGRADE
          ? [
              {
                label:
                  (order.eventDetails as { upgradeTitle?: string } | null)?.upgradeTitle ||
                  "Gift Registry",
                amountInPaise: order.subtotalInPaise,
              },
            ]
          : [...packageLineItems, ...shopLineItems];

      const pdf = await generateInvoicePdf({
        invoiceNumber,
        orderCode: order.orderCode,
        guestName: shipping.fullName || order.user.name,
        guestEmail: order.contactEmail,
        guestPhone: order.contactPhone,
        lineItems,
        subtotalInPaise: order.subtotalInPaise,
        shippingInPaise: order.shippingInPaise,
        shippingWaived: order.shippingWaived,
        gstPercent: await getGstPercent(),
        gstInPaise: order.gstInPaise,
        totalInPaise: order.totalInPaise,
        issuedAt: new Date(),
        paymentStatus: "PAID",
      });
      pdfUrl = pdf.url;
    } catch (err) {
      logger.error({ err, orderId }, "Failed to generate order invoice PDF");
    }

    const customer = await findOrCreateCrmCustomer({
      fullName: shipping.fullName || order.user.name,
      email: order.contactEmail,
      phone: order.contactPhone,
    });

    try {
      await prisma.invoice.create({
        data: {
          invoiceNumber: invoiceNumber!,
          linkedType: InvoiceLinkedType.ORDER,
          orderId: order.id,
          customerId: customer.id,
          subtotalInPaise: order.subtotalInPaise,
          gstInPaise: order.gstInPaise,
          totalInPaise: order.totalInPaise,
          pdfUrl,
        },
      });
    } catch (err) {
      logger.warn({ err, orderId }, "Invoice row already exists or failed");
    }
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      invoiceNumber: invoiceNumber ?? order.invoiceNumber,
      invoicePdfUrl: pdfUrl ?? order.invoicePdfUrl,
    },
  });

  // Any order with shop OrderItems (plain SHOP orders, or a combined
  // PACKAGE + shop-cart checkout) should clear those lines from the cart.
  if (order.items.length > 0) {
    const cart = await prisma.cart.findUnique({ where: { userId: order.userId } });
    if (cart) {
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id, productId: { in: order.items.map((i) => i.productId) } },
      });
    }
  }

  const claimedEmail = await claimOrderConfirmationEmail(order.id);
  if (claimedEmail.count > 0) {
    await sendOrderConfirmationEmailNow(order, invoiceNumber, pdfUrl);
  }

  // sendOrderConfirmationWhatsapp claims the send itself (DB-atomic, race-safe
  // under concurrent webhook deliveries) — no claim needed at this call site.
  await sendOrderConfirmationWhatsapp({
    id: order.id,
    orderCode: order.orderCode,
    contactPhone: order.contactPhone,
    totalInPaise: order.totalInPaise,
    invoicePdfUrl: pdfUrl,
  });

  if (order.giftContributions.length) {
    await prisma.$transaction((tx) => fulfillRegistryContributionsForOrder(tx, order.id));
  }

  return updated;
}

async function findOrCreateCrmCustomer(input: { fullName: string; email: string; phone: string }) {
  const existing = await prisma.customer.findFirst({
    where: { deletedAt: null, OR: [{ email: input.email.toLowerCase() }, { phone: input.phone }] },
  });
  if (existing) {
    return prisma.customer.update({
      where: { id: existing.id },
      data: { fullName: input.fullName, email: input.email.toLowerCase(), phone: input.phone },
    });
  }
  return prisma.customer.create({
    data: { fullName: input.fullName, email: input.email.toLowerCase(), phone: input.phone },
  });
}

export async function findOrderByRazorpayOrderId(razorpayOrderId: string) {
  return prisma.order.findFirst({ where: { razorpayOrderId } });
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
    where: { kind: OrderKind.UPGRADE },
    orderBy: { createdAt: "desc" as const },
    select: {
      orderCode: true,
      kind: true,
      upgradeKind: true,
      paymentStatus: true,
      status: true,
    },
  },
  sourcedRegistries: { where: { status: { not: "ARCHIVED" as const } }, select: { id: true, title: true, status: true } },
} as const;

export async function listOrdersForUser(userId: string, q: { page?: number; pageSize?: number }) {
  const { page, pageSize, skip, take } = parsePagination(q);
  const where = { userId, parentOrderId: null };
  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: customerOrderInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.order.count({ where }),
  ]);
  const items = await Promise.all(rows.map((row) => shapeOrder(row)));
  return { items, total, page, pageSize };
}

export async function getOrderByCode(orderCode: string) {
  const order = await prisma.order.findFirst({
    where: { orderCode },
    include: customerOrderInclude,
  });
  if (!order) throw new NotFoundError("Order not found");
  return shapeOrder(order);
}

export async function getOrderForUser(userId: string, orderCode: string) {
  const order = await prisma.order.findFirst({
    where: { orderCode, userId },
    include: customerOrderInclude,
  });
  if (!order) throw new NotFoundError("Order not found");
  return shapeOrder(order);
}

async function shapeOrder(order: {
  id: string;
  orderCode: string;
  kind?: OrderKind;
  userId?: string;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  customizationFollowUpStatus?: CustomizationFollowUpStatus;
  subtotalInPaise: number;
  gstInPaise: number;
  totalInPaise: number;
  shippingInPaise?: number;
  shippingWaived?: boolean;
  freeShippingThresholdSnapshotInPaise?: number | null;
  shippingAddress: unknown;
  contactEmail: string;
  contactPhone: string;
  eventDate?: Date | null;
  eventDetails?: unknown;
  invoicePdfUrl: string | null;
  invoiceNumber?: string | null;
  razorpayOrderId?: string | null;
  placedAt: Date;
  createdAt: Date;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPriceInPaise: number;
    personalizationSelected?: boolean;
    personalizationValues?: unknown;
    personalizationCostSnapshot?: number;
    product: { title: string; slug: string; images: Array<{ media: { url: string; altText: string | null } | null }> };
  }>;
  packageOrder?: {
    package: { title: string; slug: string };
    theme: { title: string; slug: string };
    guestCount: number | null;
    location: string | null;
    lines: Array<{
      id: string;
      label: string;
      sku: string | null;
      section: string | null;
      quantity: number;
      unitPriceInPaise: number;
    }>;
  } | null;
  childOrders?: Array<{
    orderCode: string;
    kind: OrderKind;
    upgradeKind: import("@prisma/client").PackageUpgradeKind | null;
    paymentStatus: PaymentStatus;
    status: OrderStatus;
  }>;
  sourcedRegistries?: Array<{ id: string; title: string | null; status?: string }>;
}) {
  const kind = order.kind ?? OrderKind.SHOP;
  const giftRegistry =
    kind === OrderKind.PACKAGE && order.packageOrder && order.userId
      ? await giftRegistryStateForPackageOrder({
          orderId: order.id,
          userId: order.userId,
          packageSlug: order.packageOrder.package.slug,
          paymentStatus: order.paymentStatus ?? PaymentStatus.PENDING,
          sourcedRegistries: order.sourcedRegistries,
          lineItems: order.packageOrder.lines,
        })
      : null;

  return {
    id: order.id,
    orderCode: order.orderCode,
    kind,
    status: order.status,
    paymentStatus: order.paymentStatus ?? (order.status === OrderStatus.PAID ? "PAID" : "PENDING"),
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
    canRetryPayment:
      order.status === OrderStatus.PENDING_PAYMENT &&
      order.paymentStatus !== PaymentStatus.PAID,
    canReorder:
      kind === OrderKind.SHOP &&
      (order.status === OrderStatus.PAID ||
        order.status === OrderStatus.DELIVERED ||
        order.status === OrderStatus.SHIPPED ||
        order.status === OrderStatus.PROCESSING),
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

export async function adminListOrders(query: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: import("@prisma/client").OrderStatus;
  paymentStatus?: PaymentStatus;
  followUp?: CustomizationFollowUpStatus | "REQUIRED_ANY";
  registryId?: string;
  registryOnly?: boolean;
  shopOnly?: boolean;
  packageOnly?: boolean;
}) {
  const { take, skip, page, pageSize } = parsePagination(query);
  const where: import("@prisma/client").Prisma.OrderWhereInput = {};

  if (query.status) where.status = query.status;
  if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
  if (query.registryId) where.registryId = query.registryId;
  if (query.registryOnly) where.registryId = { not: null };
  if (query.shopOnly) {
    where.kind = OrderKind.SHOP;
    where.registryId = null;
  }
  if (query.packageOnly) where.kind = OrderKind.PACKAGE;
  if (query.followUp === "REQUIRED_ANY") {
    where.customizationFollowUpStatus = { not: CustomizationFollowUpStatus.NOT_REQUIRED };
  } else if (query.followUp) {
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

  const [total, orders] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
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
      hasPersonalization: o.items.some((i) => i.personalizationSelected) || o.kind === OrderKind.PACKAGE,
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

export async function adminGetOrder(orderId: string) {
  const order = await prisma.order.findUnique({
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

  if (!order) throw new NotFoundError("Order not found");

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

export async function adminUpdateOrderItemFulfillment(orderId: string, itemId: string, status: string | null) {
  const item = await prisma.orderItem.findFirst({
    where: { id: itemId, orderId },
  });

  if (!item) throw new NotFoundError("Order item not found");

  await prisma.orderItem.update({
    where: { id: itemId },
    data: { fulfillmentStatus: status },
  });

  return adminGetOrder(orderId);
}

const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: [OrderStatus.CANCELLED],
  PAID: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  PROCESSING: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  SHIPPED: [OrderStatus.DELIVERED],
  DELIVERED: [OrderStatus.REFUNDED],
  CANCELLED: [],
  REFUNDED: [],
};

export async function adminUpdateOrderStatus(orderId: string, status: OrderStatus) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new NotFoundError("Order not found");
  const allowed = ORDER_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(status)) {
    throw new ValidationError(`Cannot move order from ${order.status} to ${status}`);
  }
  if (status === OrderStatus.CANCELLED && order.paymentStatus !== PaymentStatus.PAID) {
    await cancelOrderAndRestock(orderId, "Cancelled by admin");
    return adminGetOrder(orderId);
  }
  await prisma.order.update({ where: { id: orderId }, data: { status } });
  return adminGetOrder(orderId);
}

export async function adminUpdateOrderOps(
  orderId: string,
  data: { customizationFollowUpStatus?: CustomizationFollowUpStatus; adminNotes?: string },
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new NotFoundError("Order not found");
  await prisma.order.update({
    where: { id: orderId },
    data: {
      ...(data.customizationFollowUpStatus ? { customizationFollowUpStatus: data.customizationFollowUpStatus } : {}),
      ...(data.adminNotes !== undefined ? { adminNotes: data.adminNotes } : {}),
    },
  });
  return adminGetOrder(orderId);
}

export async function reorderFromOrder(userId: string, orderCode: string) {
  const order = await prisma.order.findFirst({
    where: { orderCode, userId },
    include: { items: true },
  });
  if (!order) throw new NotFoundError("Order not found");
  const { addCartItem } = await import("../shop/cart.service");
  for (const item of order.items) {
    await addCartItem(userId, {
      productId: item.productId,
      quantity: item.quantity,
      personalizationValues: item.personalizationSelected ? item.personalizationValues : undefined,
      registryItemId: item.registryItemId ?? undefined,
    });
  }
  const { getCart } = await import("../shop/cart.service");
  return getCart(userId);
}