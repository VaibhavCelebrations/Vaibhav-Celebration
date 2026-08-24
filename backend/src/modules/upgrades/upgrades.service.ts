import { OrderKind, PaymentStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ForbiddenError, NotFoundError, ValidationError } from "../../lib/errors";
import { delPattern } from "../../lib/redis";

export const GIFT_REGISTRY_ELIGIBLE_SLUGS = ["premium", "luxe"] as const;
export const GIFT_REGISTRY_PRICE_IN_PAISE = 50_000;

export function isGiftRegistryMatrixService(svc: {
  slug?: string | null;
  category?: string | null;
  label?: string | null;
}) {
  if (svc.slug === "gift-registry") return true;
  if (svc.category === "GIFT_REGISTRY") return true;
  return Boolean(svc.label && /gift\s*registry/i.test(svc.label));
}

/** Restore Gift Registry as an included Signature/Grand extra service with a ₹500 customize price. */
export async function ensureGiftRegistryService() {
  const existing = await prisma.extraService.findFirst({
    where: {
      OR: [{ slug: "gift-registry" }, { category: "GIFT_REGISTRY" }],
    },
  });

  const data = {
    slug: "gift-registry",
    label: "Gift Registry",
    description:
      "Share a guided gift list with guests. Included with Signature and Grand. Optional customization is a fixed ₹500 in the builder.",
    category: "GIFT_REGISTRY" as const,
    pricingMode: "FIXED" as const,
    locationScope: "ALL" as const,
    choiceCount: null as number | null,
    customizationPriceInPaise: GIFT_REGISTRY_PRICE_IN_PAISE,
    displayOrder: 11,
    isActive: true,
    deletedAt: null as Date | null,
  };

  const service = existing
    ? await prisma.extraService.update({ where: { id: existing.id }, data })
    : await prisma.extraService.create({ data });

  const packages = await prisma.package.findMany({
    where: { deletedAt: null },
    select: { id: true, slug: true },
  });

  await Promise.all(
    packages.map((pkg) =>
      prisma.packageServiceItem.upsert({
        where: {
          packageId_extraServiceId: { packageId: pkg.id, extraServiceId: service.id },
        },
        create: {
          packageId: pkg.id,
          extraServiceId: service.id,
          isIncluded: (GIFT_REGISTRY_ELIGIBLE_SLUGS as readonly string[]).includes(pkg.slug),
          displayOrder: 11,
        },
        update: {
          isIncluded: (GIFT_REGISTRY_ELIGIBLE_SLUGS as readonly string[]).includes(pkg.slug),
          displayOrder: 11,
        },
      }),
    ),
  );

  void delPattern("pub:packages:*");
  void delPattern("adm:packages:*");
  return service;
}

export async function getRegistryAccess(userId: string) {
  const [packageOrders, registries] = await Promise.all([
    prisma.order.findMany({
      where: {
        userId,
        kind: OrderKind.PACKAGE,
        paymentStatus: PaymentStatus.PAID,
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
    prisma.giftRegistry.findMany({
      where: { ownerUserId: userId, status: { not: "ARCHIVED" } },
      select: { id: true, sourceOrderId: true, title: true },
    }),
  ]);

  const pendingSetups: Array<{
    orderCode: string;
    packageTitle: string;
    themeTitle: string | null;
  }> = [];

  for (const order of packageOrders) {
    const slug = order.packageOrder?.package.slug ?? "";
    const isIncluded = (GIFT_REGISTRY_ELIGIBLE_SLUGS as readonly string[]).includes(slug);
    
    // Check if purchased as an add-on in the builder
    const hasAddon = order.packageOrder?.lines
      ? Array.isArray(order.packageOrder.lines) &&
        order.packageOrder.lines.some((item: any) => item.label?.includes("Gift Registry"))
      : false;

    if (!isIncluded && !hasAddon) continue;
    if (order.sourcedRegistries[0]) continue;
    pendingSetups.push({
      orderCode: order.orderCode,
      packageTitle: order.packageOrder?.package.title ?? "Celebration",
      themeTitle: order.packageOrder?.theme.title ?? null,
    });
  }

  const eligibleOrderCount = packageOrders.filter((order) => {
    const slug = order.packageOrder?.package.slug ?? "";
    const isIncluded = (GIFT_REGISTRY_ELIGIBLE_SLUGS as readonly string[]).includes(slug);
    const hasAddon = order.packageOrder?.lines
      ? Array.isArray(order.packageOrder.lines) &&
        order.packageOrder.lines.some((item: any) => item.label?.includes("Gift Registry"))
      : false;
    return isIncluded || hasAddon;
  }).length;

  return {
    canAccess: eligibleOrderCount > 0 || registries.length > 0,
    paidUpgradeCount: eligibleOrderCount,
    registryCount: registries.length,
    pendingSetups,
    availablePurchases: [] as Array<{
      orderCode: string;
      packageTitle: string;
      themeTitle: string | null;
      priceInPaise: number;
      gstInPaise: number;
      totalInPaise: number;
    }>,
  };
}

export type GiftRegistryUpgradeState = {
  eligible: boolean;
  registryId: string | null;
  registryTitle: string | null;
};

export async function giftRegistryStateForPackageOrder(input: {
  orderId: string;
  userId: string;
  packageSlug: string;
  paymentStatus: PaymentStatus;
  sourcedRegistries?: Array<{ id: string; title: string | null }>;
  lineItems?: any;
}): Promise<GiftRegistryUpgradeState | null> {
  const isIncluded = (GIFT_REGISTRY_ELIGIBLE_SLUGS as readonly string[]).includes(input.packageSlug);
  const hasAddon = input.lineItems
    ? Array.isArray(input.lineItems) &&
      input.lineItems.some((item: any) => item.label?.includes("Gift Registry") || item.key?.includes("gift-registry"))
    : false;

  const eligible = (isIncluded || hasAddon) && input.paymentStatus === PaymentStatus.PAID;

  const registry =
    input.sourcedRegistries?.[0] ??
    (await prisma.giftRegistry.findFirst({
      where: { sourceOrderId: input.orderId, ownerUserId: input.userId, status: { not: "ARCHIVED" } },
      select: { id: true, title: true },
    }));

  return {
    eligible,
    registryId: registry?.id ?? null,
    registryTitle: registry?.title ?? null,
  };
}

export async function assertGiftRegistryEntitlement(userId: string, sourceOrderCode: string) {
  const parent = await prisma.order.findFirst({
    where: { orderCode: sourceOrderCode, userId, kind: OrderKind.PACKAGE },
    include: { packageOrder: { include: { package: true, lines: true } } },
  });
  if (!parent) throw new NotFoundError("Celebration order not found");
  if (parent.paymentStatus !== PaymentStatus.PAID) {
    throw new ValidationError("This celebration is not paid yet");
  }
  const slug = parent.packageOrder?.package.slug ?? "";
  const isIncluded = (GIFT_REGISTRY_ELIGIBLE_SLUGS as readonly string[]).includes(slug);
  const hasAddon = parent.packageOrder?.lines
    ? Array.isArray(parent.packageOrder.lines) &&
      parent.packageOrder.lines.some((item: any) => item.label?.includes("Gift Registry"))
    : false;

  if (!isIncluded && !hasAddon) {
    throw new ForbiddenError("Gift Registry is included with Signature and Grand packages only, or as an add-on");
  }
  return parent;
}
