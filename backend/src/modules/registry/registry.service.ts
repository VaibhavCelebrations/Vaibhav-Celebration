import bcrypt from "bcryptjs";
import {
  ExtractionStatus,
  GiftContributionStatus,
  GiftItemStatus,
  GiftLinkSourceType,
  RegistryStatus,
  RegistryVisibility,
} from "@prisma/client";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import { deleteRegistryHostedImage } from "../../integrations/media/storage";
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from "../../lib/errors";
import { nextRegistryCode } from "../../lib/sequences";
import type { ShippingAddress } from "../orders/orders.service";
import { createDirectOrder } from "../orders/orders.service";
import { assertGiftRegistryEntitlement } from "../upgrades/upgrades.service";
import { formatAddressText, parseShippingAddress } from "./address";
import { extractExternalProduct } from "./extract.service";
import {
  availableToReserve,
  confirmExternalPurchase,
  derivedItemStatus,
  remainingQuantity,
  reverseExternalPurchase,
} from "./registry-qty";

const registryItemInclude = {
  internalProduct: {
    include: {
      images: { include: { media: true }, take: 1, orderBy: { displayOrder: "asc" as const } },
      inventory: true,
    },
  },
} as const;

function itemStatus(item: { quantityDesired: number; quantityPurchased: number; quantityReserved: number; status: GiftItemStatus }) {
  return derivedItemStatus(item);
}

function shapeItem(item: {
  id: string;
  sourceType: GiftLinkSourceType;
  externalUrl: string | null;
  canonicalUrl: string | null;
  storeName: string | null;
  description: string | null;
  notes: string | null;
  manualTitle: string | null;
  manualImageUrl: string | null;
  manualPriceInPaise: number | null;
  currency: string;
  internalProductId: string | null;
  quantityDesired: number;
  quantityPurchased: number;
  quantityReserved: number;
  priority: number;
  status: GiftItemStatus;
  displayOrder: number;
  extractionStatus: ExtractionStatus;
  extractionMethod: string | null;
  extractionError: string | null;
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
      ? { url: item.manualImageUrl, altText: title }
      : null;
  const remaining = remainingQuantity(item);
  const available = availableToReserve(item);
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
    canGiftDirectly: item.sourceType === GiftLinkSourceType.INTERNAL_PRODUCT && available > 0,
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

export interface RegistryReadinessItem {
  key: string;
  label: string;
  description: string;
  done: boolean;
  required: boolean;
}

export interface RegistryReadiness {
  isReady: boolean;
  completedRequired: number;
  totalRequired: number;
  checklist: RegistryReadinessItem[];
}

function computeReadiness(
  registry: {
    title: string | null;
    childOrPersonName: string | null;
    eventDate: Date | null;
    shippingAddress: unknown;
    celebrationDetails: string | null;
  },
  itemCount: number,
): RegistryReadiness {
  const address = parseShippingAddress(registry.shippingAddress);
  const checklist: RegistryReadinessItem[] = [
    {
      key: "details",
      label: "Registry title added",
      description: "Give your registry a name so guests recognise it right away.",
      done: Boolean((registry.title || registry.childOrPersonName || "").trim()),
      required: true,
    },
    {
      key: "eventDate",
      label: "Event date added",
      description: "Let guests know when the celebration is happening.",
      done: Boolean(registry.eventDate),
      required: true,
    },
    {
      key: "address",
      label: "Delivery address added",
      description: "Gifts bought from your registry need somewhere to be delivered.",
      done: Boolean(address),
      required: true,
    },
    {
      key: "items",
      label: "At least one gift added",
      description: "Add products from our shop or link gifts from other stores.",
      done: itemCount > 0,
      required: true,
    },
    {
      key: "message",
      label: "Message to guests added",
      description: "A short personal note makes your registry feel complete (optional).",
      done: Boolean((registry.celebrationDetails || "").trim()),
      required: false,
    },
  ];
  const requiredItems = checklist.filter((c) => c.required);
  return {
    isReady: requiredItems.every((c) => c.done),
    completedRequired: requiredItems.filter((c) => c.done).length,
    totalRequired: requiredItems.length,
    checklist,
  };
}

function publicAddress(address: ShippingAddress | null) {
  if (!address) return null;
  return {
    recipientName: address.fullName,
    line1: address.line1,
    line2: address.line2 ?? null,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    country: address.country,
    formatted: formatAddressText(address),
  };
}

function shapeRegistry(
  registry: {
    id: string;
    registryCode: string;
    title: string | null;
    occasion: string | null;
    eventDate: Date | null;
    ownerDisplayName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    childOrPersonName: string | null;
    celebrationDetails: string | null;
    giftPreferences: string | null;
    photoMediaId: string | null;
    coverImageUrl: string | null;
    shippingAddress: unknown;
    visibility: RegistryVisibility;
    status: RegistryStatus;
    viewCount: number;
    publishedAt: Date | null;
    activatedAt: Date;
    expiresAt: Date;
    ownerUserId: string;
    passwordHash?: string | null;
  },
  options?: { includePrivate?: boolean; itemCount?: number },
) {
  const address = parseShippingAddress(registry.shippingAddress);
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
    shareUrl: `${env.FRONTEND_URL}/registry/${registry.registryCode}`,
    hasPassword: Boolean(registry.passwordHash),
    shippingAddress: publicAddress(address),
    contactEmail: options?.includePrivate ? registry.contactEmail : undefined,
    contactPhone: options?.includePrivate ? registry.contactPhone : undefined,
    readiness: options?.itemCount !== undefined ? computeReadiness(registry, options.itemCount) : undefined,
  };
}

async function effectiveStatus(registry: { status: RegistryStatus; expiresAt: Date; id: string }) {
  if (registry.status === RegistryStatus.ACTIVE && registry.expiresAt < new Date()) {
    await prisma.giftRegistry.update({ where: { id: registry.id }, data: { status: RegistryStatus.EXPIRED } });
    return RegistryStatus.EXPIRED;
  }
  return registry.status;
}

function statsForItems(items: Array<{ quantityDesired: number; quantityPurchased: number; sourceType: GiftLinkSourceType }>) {
  const remaining = items.reduce((sum, i) => sum + remainingQuantity(i), 0);
  const purchased = items.reduce((sum, i) => sum + i.quantityPurchased, 0);
  const desired = items.reduce((sum, i) => sum + i.quantityDesired, 0);
  return {
    totalGifts: items.length,
    quantityDesired: desired,
    quantityPurchased: purchased,
    quantityRemaining: remaining,
    internalCount: items.filter((i) => i.sourceType === GiftLinkSourceType.INTERNAL_PRODUCT).length,
    externalCount: items.filter((i) => i.sourceType === GiftLinkSourceType.EXTERNAL_LINK).length,
  };
}

export async function listRegistriesForOwner(userId: string) {
  const rows = await prisma.giftRegistry.findMany({
    where: { ownerUserId: userId, status: { not: RegistryStatus.ARCHIVED } },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    ...shapeRegistry(r, { includePrivate: true, itemCount: r.items.length }),
    stats: statsForItems(r.items),
  }));
}

export async function createRegistry(
  userId: string,
  input: {
    sourceOrderCode: string;
    password?: string;
    title?: string;
    occasion?: string;
    eventDate?: string;
    ownerDisplayName?: string;
    contactEmail?: string;
    contactPhone?: string;
    childOrPersonName?: string;
    celebrationDetails?: string;
    giftPreferences?: string;
    photoMediaId?: string;
    coverImageUrl?: string;
    shippingAddress?: ShippingAddress;
    visibility?: RegistryVisibility;
  },
) {
  const parent = await assertGiftRegistryEntitlement(userId, input.sourceOrderCode);
  const existing = await prisma.giftRegistry.findFirst({
    where: { sourceOrderId: parent.id, ownerUserId: userId, status: { not: RegistryStatus.ARCHIVED } },
  });
  if (existing) {
    throw new ValidationError("A gift registry already exists for this celebration");
  }

  const visibility = input.visibility ?? RegistryVisibility.UNLISTED;
  if (visibility === RegistryVisibility.PRIVATE && !input.password) {
    throw new ValidationError("A password is required for private registries");
  }
  const registryCode = await nextRegistryCode();
  const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : null;
  const expiresAt = new Date(Date.now() + env.GIFT_REGISTRY_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
  const eventDate = input.eventDate
    ? new Date(input.eventDate)
    : parent.eventDate;

  const registry = await prisma.giftRegistry.create({
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
      shippingAddress: (input.shippingAddress ?? null) as never,
      visibility,
      status: RegistryStatus.DRAFT,
      expiresAt,
    },
  });
  return shapeRegistry(registry, { includePrivate: true, itemCount: 0 });
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
    include: {
      ...registryItemInclude,
      contributions: {
        where: { status: { in: [GiftContributionStatus.PAID, GiftContributionStatus.CONFIRMED_EXTERNAL, GiftContributionStatus.PENDING] } },
        include: { gifterUser: { select: { name: true, email: true } }, order: { select: { orderCode: true, status: true, paymentStatus: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: [{ priority: "desc" }, { displayOrder: "asc" }],
  });
  const orders = await prisma.order.findMany({
    where: { registryId: registry.id, paymentStatus: "PAID" },
    select: { id: true, orderCode: true, totalInPaise: true, paymentStatus: true, status: true, placedAt: true, user: { select: { name: true, email: true } } },
    orderBy: { placedAt: "desc" },
    take: 50,
  });
  return {
    ...shapeRegistry(registry, { includePrivate: true, itemCount: items.length }),
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

/** Lets the owner see exactly what guests will see, even before publishing. */
export async function getRegistryPreviewForOwner(userId: string, registryId: string) {
  const registry = await assertOwner(userId, registryId);
  const items = await prisma.giftRegistryItem.findMany({
    where: { registryId },
    include: registryItemInclude,
    orderBy: [{ priority: "desc" }, { displayOrder: "asc" }],
  });
  return {
    ...shapeRegistry(registry, { includePrivate: true, itemCount: items.length }),
    items: items.map(shapeItem),
    stats: statsForItems(items),
  };
}

export async function updateRegistry(
  userId: string,
  registryId: string,
  input: {
    title?: string;
    occasion?: string;
    eventDate?: string | null;
    ownerDisplayName?: string;
    contactEmail?: string;
    contactPhone?: string;
    childOrPersonName?: string;
    celebrationDetails?: string;
    giftPreferences?: string;
    photoMediaId?: string;
    coverImageUrl?: string;
    shippingAddress?: ShippingAddress;
    visibility?: RegistryVisibility;
    password?: string;
    status?: "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";
  },
) {
  const current = await assertOwner(userId, registryId);
  const visibility = input.visibility ?? current.visibility;
  let passwordHash: string | null | undefined;
  if (input.password) passwordHash = await bcrypt.hash(input.password, 12);
  if (visibility === RegistryVisibility.PRIVATE && !current.passwordHash && !input.password) {
    throw new ValidationError("A password is required for private registries");
  }

  const itemCount = await prisma.giftRegistryItem.count({ where: { registryId } });
  const nextStatus = input.status as RegistryStatus | undefined;

  // Publishing (→ ACTIVE) is a one-way promise to guests that the registry is
  // usable — gate it server-side so the UI can never bypass the checklist.
  if (nextStatus === RegistryStatus.ACTIVE) {
    const mergedForReadiness = {
      title: input.title !== undefined ? input.title : current.title,
      childOrPersonName: input.childOrPersonName !== undefined ? input.childOrPersonName : current.childOrPersonName,
      eventDate: input.eventDate !== undefined ? (input.eventDate ? new Date(input.eventDate) : null) : current.eventDate,
      shippingAddress: input.shippingAddress !== undefined ? (input.shippingAddress as never) : current.shippingAddress,
      celebrationDetails: input.celebrationDetails !== undefined ? input.celebrationDetails : current.celebrationDetails,
    };
    const readiness = computeReadiness(mergedForReadiness, itemCount);
    if (!readiness.isReady) {
      const missing = readiness.checklist.filter((c) => c.required && !c.done).map((c) => c.label);
      throw new ValidationError("Your registry isn't ready to publish yet", { missing, readiness });
    }
  }

  const registry = await prisma.giftRegistry.update({
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
      shippingAddress: input.shippingAddress as never,
      visibility,
      passwordHash,
      status: nextStatus,
      publishedAt:
        nextStatus === RegistryStatus.ACTIVE && !current.publishedAt
          ? new Date()
          : nextStatus === RegistryStatus.DRAFT
            ? null
            : undefined,
    },
  });
  return shapeRegistry(registry, { includePrivate: true, itemCount });
}

export async function archiveRegistry(userId: string, registryId: string) {
  await assertOwner(userId, registryId);
  const registry = await prisma.giftRegistry.update({
    where: { id: registryId },
    data: { status: RegistryStatus.ARCHIVED, sourceOrderId: null },
  });
  return shapeRegistry(registry, { includePrivate: true });
}

export async function previewExternalProduct(userId: string, url: string, force?: boolean) {
  if (!userId) throw new UnauthorizedError();
  return extractExternalProduct(url, { force });
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
    currency?: string;
    storeName?: string;
    description?: string;
    notes?: string;
    quantityDesired?: number;
    priority?: number;
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

  let extracted: Awaited<ReturnType<typeof extractExternalProduct>> | null = null;
  if (input.sourceType === GiftLinkSourceType.EXTERNAL_LINK && input.externalUrl && !input.manualTitle) {
    extracted = await extractExternalProduct(input.externalUrl);
  } else if (input.sourceType === GiftLinkSourceType.EXTERNAL_LINK && input.externalUrl) {
    extracted = await extractExternalProduct(input.externalUrl).catch(() => null);
  }

  const maxOrder = await prisma.giftRegistryItem.aggregate({ where: { registryId }, _max: { displayOrder: true } });
  const quantityDesired = Math.max(1, input.quantityDesired ?? 1);
  const item = await prisma.giftRegistryItem.create({
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
      extractionStatus: extracted?.extractionStatus ?? (input.manualTitle ? ExtractionStatus.MANUAL : ExtractionStatus.MANUAL),
      extractionMethod: extracted?.extractionMethod,
      extractionError: extracted?.extractionError,
      extractedAt: extracted ? new Date() : null,
    },
    include: registryItemInclude,
  });
  return shapeItem(item);
}

export async function updateRegistryItem(
  userId: string,
  registryId: string,
  itemId: string,
  input: {
    manualTitle?: string;
    manualImageUrl?: string;
    manualPriceInPaise?: number | null;
    currency?: string;
    storeName?: string;
    description?: string;
    notes?: string;
    quantityDesired?: number;
    priority?: number;
    displayOrder?: number;
    externalUrl?: string;
  },
) {
  await assertOwner(userId, registryId);
  const existing = await prisma.giftRegistryItem.findFirst({ where: { id: itemId, registryId } });
  if (!existing) throw new NotFoundError("Registry item not found");
  if (input.quantityDesired !== undefined && input.quantityDesired < existing.quantityPurchased) {
    throw new ValidationError("Requested quantity cannot be below the amount already purchased");
  }
  const nextImage =
    input.manualImageUrl === undefined ? existing.manualImageUrl : input.manualImageUrl?.trim() || null;
  if (existing.manualImageUrl && existing.manualImageUrl !== nextImage) {
    await deleteRegistryHostedImage(existing.manualImageUrl);
  }
  const updated = await prisma.giftRegistryItem.update({
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
      status:
        input.quantityDesired !== undefined
          ? derivedItemStatus({ quantityDesired: input.quantityDesired, quantityPurchased: existing.quantityPurchased })
          : undefined,
    },
    include: registryItemInclude,
  });
  return shapeItem(updated);
}

export async function reorderRegistryItems(userId: string, registryId: string, itemIds: string[]) {
  await assertOwner(userId, registryId);
  await prisma.$transaction(
    itemIds.map((id, index) =>
      prisma.giftRegistryItem.updateMany({ where: { id, registryId }, data: { displayOrder: index + 1 } }),
    ),
  );
  return { reordered: true };
}

export async function deleteRegistryItem(userId: string, registryId: string, itemId: string) {
  await assertOwner(userId, registryId);
  const item = await prisma.giftRegistryItem.findFirst({ where: { id: itemId, registryId } });
  if (!item) throw new NotFoundError("Registry item not found");
  if (item.quantityPurchased > 0) {
    throw new ValidationError("This gift has purchases and cannot be deleted. Archive the note or reduce remaining quantity instead.");
  }
  await deleteRegistryHostedImage(item.manualImageUrl);
  await prisma.giftRegistryItem.delete({ where: { id: itemId } });
}

export async function reverseContribution(userId: string, registryId: string, contributionId: string) {
  await assertOwner(userId, registryId);
  const contribution = await prisma.giftRegistryContribution.findFirst({
    where: { id: contributionId, registryItem: { registryId } },
  });
  if (!contribution) throw new NotFoundError("Contribution not found");
  await prisma.$transaction((tx) => reverseExternalPurchase(tx, contributionId));
  return { reversed: true };
}

async function loadPublicRegistry(registryCode: string, password?: string) {
  const registry = await prisma.giftRegistry.findFirst({ where: { registryCode } });
  if (!registry) throw new NotFoundError("Registry not found");
  const status = await effectiveStatus(registry);
  if (status === RegistryStatus.DRAFT || status === RegistryStatus.ARCHIVED) {
    throw new NotFoundError("Registry not found");
  }
  if (status === RegistryStatus.EXPIRED) throw new ForbiddenError("This registry has expired");
  if (status === RegistryStatus.CLOSED) throw new ForbiddenError("This registry is closed");

  if (registry.visibility === RegistryVisibility.PRIVATE) {
    if (!password || !registry.passwordHash) throw new UnauthorizedError("This registry requires a password");
    const valid = await bcrypt.compare(password, registry.passwordHash);
    if (!valid) throw new UnauthorizedError("Incorrect registry password");
  }

  return registry;
}

export async function getRegistrySeo(registryCode: string) {
  const registry = await prisma.giftRegistry.findFirst({ where: { registryCode } });
  if (!registry) throw new NotFoundError("Registry not found");
  const status = await effectiveStatus(registry);
  const shareable =
    (status === RegistryStatus.ACTIVE || status === RegistryStatus.CLOSED) &&
    registry.visibility !== RegistryVisibility.PRIVATE;
  const title = registry.title || registry.childOrPersonName || "Gift Registry";
  const description =
    registry.celebrationDetails ||
    `A gift registry for ${registry.ownerDisplayName || registry.childOrPersonName || "a celebration"} with Vaibhav Celebrations.`;
  return {
    registryCode: registry.registryCode,
    title: shareable ? title : "Private Gift Registry",
    description: shareable ? description.slice(0, 300) : "This gift registry is private.",
    image: shareable ? registry.coverImageUrl : null,
    indexable: shareable && registry.visibility === RegistryVisibility.PUBLIC,
    shareUrl: `${env.FRONTEND_URL}/registry/${registry.registryCode}`,
  };
}

export async function getPublicRegistry(registryCode: string, password?: string) {
  const registry = await loadPublicRegistry(registryCode, password);
  await prisma.giftRegistry.update({ where: { id: registry.id }, data: { viewCount: { increment: 1 } } });
  const items = await prisma.giftRegistryItem.findMany({
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

export async function giftRegistryItem(
  gifterUserId: string,
  registryCode: string,
  itemId: string,
  input: { password?: string; quantity?: number; contactEmail: string; contactPhone: string },
) {
  const registry = await loadPublicRegistry(registryCode, input.password);
  if ((await effectiveStatus(registry)) !== RegistryStatus.ACTIVE) {
    throw new ForbiddenError("This registry is no longer accepting gifts");
  }
  const address = parseShippingAddress(registry.shippingAddress);
  if (!address) throw new ValidationError("This registry does not have a delivery address yet");

  const item = await prisma.giftRegistryItem.findFirst({ where: { id: itemId, registryId: registry.id } });
  if (!item) throw new NotFoundError("Registry item not found");
  if (item.sourceType !== GiftLinkSourceType.INTERNAL_PRODUCT || !item.internalProductId) {
    throw new ValidationError("This item is an external product — purchase it from the linked store");
  }
  const quantity = Math.max(1, input.quantity ?? 1);
  if (availableToReserve(item) < quantity) {
    throw new ValidationError("Not enough remaining quantity for this gift");
  }

  return createDirectOrder(gifterUserId, {
    productId: item.internalProductId,
    quantity,
    shippingAddress: address,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    registryItemId: item.id,
    registryId: registry.id,
  });
}

export async function confirmExternalGift(
  registryCode: string,
  itemId: string,
  input: { password?: string; quantity?: number; guestName?: string; guestEmail?: string; gifterUserId?: string },
) {
  const registry = await loadPublicRegistry(registryCode, input.password);
  const item = await prisma.giftRegistryItem.findFirst({ where: { id: itemId, registryId: registry.id } });
  if (!item) throw new NotFoundError("Registry item not found");
  if (item.sourceType !== GiftLinkSourceType.EXTERNAL_LINK) {
    throw new ValidationError("Use checkout to purchase Vaibhav Celebrations gifts");
  }
  const quantity = Math.max(1, input.quantity ?? 1);
  await prisma.$transaction(async (tx) => {
    await confirmExternalPurchase(tx, item.id, quantity);
    await tx.giftRegistryContribution.create({
      data: {
        registryItemId: item.id,
        gifterUserId: input.gifterUserId,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        quantity,
        status: GiftContributionStatus.CONFIRMED_EXTERNAL,
      },
    });
  });
  const updated = await prisma.giftRegistryItem.findFirst({ where: { id: item.id }, include: registryItemInclude });
  return shapeItem(updated!);
}

export async function adminListRegistries(q: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: RegistryStatus;
  visibility?: RegistryVisibility;
}) {
  const { parsePagination } = await import("../../lib/response");
  const { page, pageSize, skip, take } = parsePagination(q);
  const where = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.visibility ? { visibility: q.visibility } : {}),
    ...(q.search
      ? {
          OR: [
            { registryCode: { contains: q.search, mode: "insensitive" as const } },
            { childOrPersonName: { contains: q.search, mode: "insensitive" as const } },
            { title: { contains: q.search, mode: "insensitive" as const } },
            { ownerDisplayName: { contains: q.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.giftRegistry.findMany({
      where,
      include: { ownerUser: { select: { name: true, email: true } }, _count: { select: { items: true, orders: true } }, items: true },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.giftRegistry.count({ where }),
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

export async function adminGetRegistry(id: string) {
  const registry = await prisma.giftRegistry.findFirst({
    where: { id },
    include: { ownerUser: { select: { name: true, email: true, phone: true } } },
  });
  if (!registry) throw new NotFoundError("Registry not found");
  const items = await prisma.giftRegistryItem.findMany({
    where: { registryId: id },
    include: {
      ...registryItemInclude,
      contributions: { include: { gifterUser: { select: { name: true, email: true } }, order: { select: { orderCode: true, status: true, paymentStatus: true } } } },
    },
    orderBy: { displayOrder: "asc" },
  });
  const orders = await prisma.order.findMany({
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

export async function adminUpdateRegistry(
  id: string,
  input: { status?: RegistryStatus; visibility?: RegistryVisibility },
) {
  const registry = await prisma.giftRegistry.findFirst({ where: { id } });
  if (!registry) throw new NotFoundError("Registry not found");
  const updated = await prisma.giftRegistry.update({
    where: { id },
    data: { status: input.status, visibility: input.visibility },
  });
  return shapeRegistry(updated, { includePrivate: true });
}

export async function adminListExtractions(q: { page?: number; pageSize?: number; status?: ExtractionStatus; search?: string }) {
  const { parsePagination } = await import("../../lib/response");
  const { page, pageSize, skip, take } = parsePagination(q);
  const where = {
    ...(q.status ? { extractionStatus: q.status } : {}),
    ...(q.search ? { sourceUrl: { contains: q.search, mode: "insensitive" as const } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.externalProductExtraction.findMany({ where, orderBy: { extractedAt: "desc" }, skip, take }),
    prisma.externalProductExtraction.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function adminRetryExtraction(id: string) {
  const row = await prisma.externalProductExtraction.findFirst({ where: { id } });
  if (!row) throw new NotFoundError("Extraction not found");
  return extractExternalProduct(row.sourceUrl, { force: true });
}

export async function adminOverrideExtraction(
  id: string,
  input: { title?: string; description?: string; image?: string; priceInPaise?: number | null; storeName?: string },
) {
  const row = await prisma.externalProductExtraction.findFirst({ where: { id } });
  if (!row) throw new NotFoundError("Extraction not found");
  return prisma.externalProductExtraction.update({
    where: { id },
    data: {
      ...input,
      extractionStatus: ExtractionStatus.MANUAL,
      extractionMethod: "admin-override",
      extractedAt: new Date(),
    },
  });
}
