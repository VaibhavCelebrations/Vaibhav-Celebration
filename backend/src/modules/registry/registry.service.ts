import bcrypt from "bcryptjs";
import { GiftItemStatus, GiftLinkSourceType, RegistryStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from "../../lib/errors";
import { nextRegistryCode } from "../../lib/sequences";
import type { ShippingAddress } from "../orders/orders.service";
import { createDirectOrder } from "../orders/orders.service";

const registryItemInclude = {
  internalProduct: { include: { images: { include: { media: true }, take: 1, orderBy: { displayOrder: "asc" as const } }, inventory: true } },
} as const;

function shapeItem(item: {
  id: string;
  sourceType: GiftLinkSourceType;
  externalUrl: string | null;
  manualTitle: string | null;
  manualImageUrl: string | null;
  manualPriceInPaise: number | null;
  internalProductId: string | null;
  status: GiftItemStatus;
  displayOrder: number;
  internalProduct: {
    id: string;
    title: string;
    slug: string;
    priceInPaise: number;
    images: Array<{ media: { url: string; altText: string | null } | null }>;
    inventory: { quantityAvailable: number } | null;
  } | null;
}) {
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
    canGiftDirectly: item.sourceType === GiftLinkSourceType.INTERNAL_PRODUCT && item.status === GiftItemStatus.AVAILABLE,
    inStock: item.internalProduct ? (item.internalProduct.inventory?.quantityAvailable ?? 0) > 0 : true,
    status: item.status,
    displayOrder: item.displayOrder,
  };
}

function shapeRegistry(registry: {
  id: string;
  registryCode: string;
  childOrPersonName: string | null;
  celebrationDetails: string | null;
  photoMediaId: string | null;
  status: RegistryStatus;
  activatedAt: Date;
  expiresAt: Date;
  ownerUserId: string;
}) {
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
    shareUrl: `${env.FRONTEND_URL}/registry/${registry.registryCode}`,
  };
}

async function effectiveStatus(registry: { status: RegistryStatus; expiresAt: Date; id: string }) {
  if (registry.status === RegistryStatus.ACTIVE && registry.expiresAt < new Date()) {
    await prisma.giftRegistry.update({ where: { id: registry.id }, data: { status: RegistryStatus.EXPIRED } });
    return RegistryStatus.EXPIRED;
  }
  return registry.status;
}

// ─── Owner-facing (requireCustomer) ──────────────────────────────────────────

export async function listRegistriesForOwner(userId: string) {
  const rows = await prisma.giftRegistry.findMany({ where: { ownerUserId: userId }, orderBy: { createdAt: "desc" } });
  return rows.map(shapeRegistry);
}

export async function createRegistry(
  userId: string,
  input: {
    password: string;
    childOrPersonName?: string;
    celebrationDetails?: string;
    photoMediaId?: string;
    shippingAddress?: ShippingAddress;
    bookingId?: string;
  },
) {
  const registryCode = await nextRegistryCode();
  const passwordHash = await bcrypt.hash(input.password, 12);
  const expiresAt = new Date(Date.now() + env.GIFT_REGISTRY_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

  const registry = await prisma.giftRegistry.create({
    data: {
      registryCode,
      passwordHash,
      ownerUserId: userId,
      bookingId: input.bookingId,
      childOrPersonName: input.childOrPersonName,
      celebrationDetails: input.celebrationDetails,
      photoMediaId: input.photoMediaId,
      shippingAddress: (input.shippingAddress ?? null) as never,
      expiresAt,
    },
  });
  return shapeRegistry(registry);
}

async function assertOwner(userId: string, registryId: string) {
  const registry = await prisma.giftRegistry.findFirst({ where: { id: registryId } });
  if (!registry) throw new NotFoundError("Registry not found");
  if (registry.ownerUserId !== userId) throw new ForbiddenError("You do not own this registry");
  return registry;
}

export async function getRegistryForOwner(userId: string, registryId: string) {
  const registry = await assertOwner(userId, registryId);
  const items = await prisma.giftRegistryItem.findMany({
    where: { registryId },
    include: registryItemInclude,
    orderBy: { displayOrder: "asc" },
  });
  return { ...shapeRegistry(registry), items: items.map(shapeItem) };
}

export async function updateRegistry(
  userId: string,
  registryId: string,
  input: { childOrPersonName?: string; celebrationDetails?: string; photoMediaId?: string; shippingAddress?: ShippingAddress; status?: "ACTIVE" | "CLOSED" },
) {
  await assertOwner(userId, registryId);
  const registry = await prisma.giftRegistry.update({
    where: { id: registryId },
    data: {
      childOrPersonName: input.childOrPersonName,
      celebrationDetails: input.celebrationDetails,
      photoMediaId: input.photoMediaId,
      shippingAddress: input.shippingAddress as never,
      status: input.status as RegistryStatus | undefined,
    },
  });
  return shapeRegistry(registry);
}

export async function addRegistryItem(
  userId: string,
  registryId: string,
  input: {
    sourceType: GiftLinkSourceType;
    externalUrl?: string;
    manualTitle?: string;
    manualImageUrl?: string;
    manualPriceInPaise?: number;
    internalProductId?: string;
  },
) {
  await assertOwner(userId, registryId);

  if (input.sourceType === GiftLinkSourceType.INTERNAL_PRODUCT && !input.internalProductId) {
    throw new ValidationError("internalProductId is required for internal product items");
  }
  if (input.sourceType === GiftLinkSourceType.EXTERNAL_LINK && !input.externalUrl && !input.manualTitle) {
    throw new ValidationError("Provide at least a title or a link for external gift items");
  }

  const maxOrder = await prisma.giftRegistryItem.aggregate({ where: { registryId }, _max: { displayOrder: true } });
  const item = await prisma.giftRegistryItem.create({
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

export async function deleteRegistryItem(userId: string, registryId: string, itemId: string) {
  await assertOwner(userId, registryId);
  const result = await prisma.giftRegistryItem.deleteMany({ where: { id: itemId, registryId } });
  if (!result.count) throw new NotFoundError("Registry item not found");
}

// ─── Public share view (registryCode + password) ─────────────────────────────

export async function getPublicRegistry(registryCode: string, password: string) {
  const registry = await prisma.giftRegistry.findFirst({ where: { registryCode } });
  if (!registry) throw new NotFoundError("Registry not found");

  const valid = await bcrypt.compare(password, registry.passwordHash);
  if (!valid) throw new UnauthorizedError("Incorrect registry password");

  const status = await effectiveStatus(registry);
  if (status !== RegistryStatus.ACTIVE) {
    throw new ForbiddenError(status === RegistryStatus.EXPIRED ? "This registry has expired" : "This registry is closed");
  }

  const items = await prisma.giftRegistryItem.findMany({
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
export async function giftRegistryItem(
  gifterUserId: string,
  registryCode: string,
  itemId: string,
  password: string,
  input: { shippingAddress: ShippingAddress; contactEmail: string; contactPhone: string },
) {
  const registry = await prisma.giftRegistry.findFirst({ where: { registryCode } });
  if (!registry) throw new NotFoundError("Registry not found");
  const valid = await bcrypt.compare(password, registry.passwordHash);
  if (!valid) throw new UnauthorizedError("Incorrect registry password");

  const status = await effectiveStatus(registry);
  if (status !== RegistryStatus.ACTIVE) throw new ForbiddenError("This registry is no longer accepting gifts");

  const item = await prisma.giftRegistryItem.findFirst({ where: { id: itemId, registryId: registry.id } });
  if (!item) throw new NotFoundError("Registry item not found");
  if (item.sourceType !== GiftLinkSourceType.INTERNAL_PRODUCT || !item.internalProductId) {
    throw new ValidationError("This item is an external link — purchase it directly from the linked store");
  }
  if (item.status !== GiftItemStatus.AVAILABLE) {
    throw new ValidationError("This item has already been gifted by someone else");
  }

  const order = await createDirectOrder(gifterUserId, {
    productId: item.internalProductId,
    quantity: 1,
    shippingAddress: input.shippingAddress,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
  });

  await prisma.$transaction([
    prisma.giftRegistryItem.update({ where: { id: item.id }, data: { status: GiftItemStatus.RESERVED } }),
    prisma.giftRegistryContribution.create({
      data: { registryItemId: item.id, gifterUserId, orderId: order.orderId },
    }),
  ]);

  return order;
}

// ─── Admin (read-only operational visibility) ────────────────────────────────

export async function adminListRegistries(q: { page?: number; pageSize?: number; search?: string }) {
  const { parsePagination } = await import("../../lib/response");
  const { page, pageSize, skip, take } = parsePagination(q);
  const where = q.search
    ? {
        OR: [
          { registryCode: { contains: q.search, mode: "insensitive" as const } },
          { childOrPersonName: { contains: q.search, mode: "insensitive" as const } },
        ],
      }
    : {};
  const [rows, total] = await Promise.all([
    prisma.giftRegistry.findMany({
      where,
      include: { ownerUser: { select: { name: true, email: true } }, _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.giftRegistry.count({ where }),
  ]);
  return {
    items: rows.map((r) => ({ ...shapeRegistry(r), owner: r.ownerUser, itemCount: r._count.items })),
    total,
    page,
    pageSize,
  };
}

export async function adminGetRegistry(id: string) {
  const registry = await prisma.giftRegistry.findFirst({ where: { id }, include: { ownerUser: { select: { name: true, email: true } } } });
  if (!registry) throw new NotFoundError("Registry not found");
  const items = await prisma.giftRegistryItem.findMany({
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
