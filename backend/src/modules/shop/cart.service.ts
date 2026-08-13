import { prisma } from "../../db/prisma";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { computeQuote } from "./cart-pricing.service";
import { availableToReserve } from "../registry/registry-qty";

const cartItemInclude = {
  product: { include: { images: { include: { media: true }, orderBy: { displayOrder: "asc" as const }, take: 1 }, inventory: true } },
} as const;

async function getOrCreateCart(userId: string) {
  const existing = await prisma.cart.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.cart.create({ data: { userId } });
}

function shapeCartItem(
  item: {
    id: string;
    productId: string;
    registryItemId: string;
    quantity: number;
    personalizationValues: unknown;
    personalizationSelected: boolean;
    personalizationCostSnapshot: number;
    product: {
      title: string;
      slug: string;
      priceInPaise: number;
      isActive: boolean;
      minOrderQuantity: number;
      maxOrderQuantity: number | null;
      personalizationEnabled: boolean;
      personalizationCostInPaise: number;
      images: Array<{ media: { url: string; altText: string | null } | null }>;
      inventory: { quantityAvailable: number; statusFlag: string } | null;
    };
  },
  registryMeta?: {
    registryCode: string;
    title: string;
    recipientName: string | null;
    available: number;
  } | null,
) {
  const personalizationCostInPaise = item.personalizationSelected ? item.product.personalizationCostInPaise : 0;
  return {
    id: item.id,
    productId: item.productId,
    registryItemId: item.registryItemId || null,
    title: item.product.title,
    slug: item.product.slug,
    unitPriceInPaise: item.product.priceInPaise,
    quantity: item.quantity,
    personalizationValues: item.personalizationValues,
    personalizationSelected: item.personalizationSelected,
    personalizationCostInPaise,
    personalizationEnabled: item.product.personalizationEnabled,
    image: item.product.images[0]?.media ?? null,
    isActive: item.product.isActive,
    stockAvailable: item.product.inventory?.quantityAvailable ?? 0,
    stockStatus: item.product.inventory?.statusFlag ?? "OUT_OF_STOCK",
    maxOrderQuantity: registryMeta ? Math.min(item.product.maxOrderQuantity ?? registryMeta.available, registryMeta.available) : item.product.maxOrderQuantity,
    registry: registryMeta
      ? {
          registryCode: registryMeta.registryCode,
          giftTitle: registryMeta.title,
          recipientName: registryMeta.recipientName,
        }
      : null,
  };
}

export async function getCart(userId: string) {
  const cart = await getOrCreateCart(userId);
  const items = await prisma.cartItem.findMany({ where: { cartId: cart.id }, include: cartItemInclude, orderBy: { addedAt: "asc" } });
  const registryIds = items.map((i) => i.registryItemId).filter(Boolean);
  const registryItems = registryIds.length
    ? await prisma.giftRegistryItem.findMany({
        where: { id: { in: registryIds } },
        include: { registry: true, internalProduct: true },
      })
    : [];
  const registryMap = new Map(registryItems.map((r) => [r.id, r]));

  const shaped = items.map((item) => {
    const registryItem = item.registryItemId ? registryMap.get(item.registryItemId) : undefined;
    return shapeCartItem(
      item,
      registryItem
        ? {
            registryCode: registryItem.registry.registryCode,
            title: registryItem.internalProduct?.title ?? registryItem.manualTitle ?? "Registry gift",
            recipientName: registryItem.registry.ownerDisplayName ?? registryItem.registry.childOrPersonName,
            available: availableToReserve(registryItem) + item.quantity,
          }
        : null,
    );
  });
  const quote = await computeQuote(
    shaped
      .filter((i) => i.isActive)
      .map((i) => ({
        productId: i.productId,
        unitPriceInPaise: i.unitPriceInPaise,
        quantity: i.quantity,
        personalizationCostInPaise: i.personalizationCostInPaise,
      })),
  );
  return { items: shaped, quote, itemCount: shaped.reduce((sum, i) => sum + i.quantity, 0) };
}

async function assertPurchasable(productId: string, requestedQuantity: number) {
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    include: { inventory: true },
  });
  if (!product || !product.isActive) throw new NotFoundError("Product not found or unavailable");
  if (requestedQuantity < product.minOrderQuantity) {
    throw new ValidationError(`Minimum order quantity for this product is ${product.minOrderQuantity}`);
  }
  if (product.maxOrderQuantity && requestedQuantity > product.maxOrderQuantity) {
    throw new ValidationError(`Maximum order quantity for this product is ${product.maxOrderQuantity}`);
  }
  const available = product.inventory?.quantityAvailable ?? 0;
  if (available < requestedQuantity) {
    throw new ValidationError(`Only ${available} left in stock`, { available });
  }
  return product;
}

function hasPersonalizationValues(values: unknown): boolean {
  if (Array.isArray(values) && values.length > 0) return true;
  if (values && typeof values === "object" && Object.keys(values as object).length > 0) return true;
  return false;
}

export async function addCartItem(
  userId: string,
  input: { productId: string; quantity: number; personalizationValues?: unknown; registryItemId?: string },
) {
  const cart = await getOrCreateCart(userId);
  const registryItemId = input.registryItemId ?? "";
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId_registryItemId: { cartId: cart.id, productId: input.productId, registryItemId } },
  });
  const nextQuantity = (existing?.quantity ?? 0) + input.quantity;
  const product = await assertPurchasable(input.productId, nextQuantity);

  if (registryItemId) {
    const registryItem = await prisma.giftRegistryItem.findFirst({
      where: { id: registryItemId, internalProductId: input.productId },
      include: { registry: true },
    });
    if (!registryItem) throw new ValidationError("Registry gift not found");
    const alreadyInCart = existing?.quantity ?? 0;
    if (availableToReserve(registryItem) < nextQuantity - alreadyInCart) {
      throw new ValidationError("Not enough remaining quantity on this registry gift");
    }
  }

  const wantsPersonalization = hasPersonalizationValues(input.personalizationValues) || existing?.personalizationSelected;
  const selected = Boolean(product.personalizationEnabled && wantsPersonalization);
  const cost = selected ? product.personalizationCostInPaise : 0;
  const values = input.personalizationValues ?? existing?.personalizationValues ?? null;

  await prisma.cartItem.upsert({
    where: { cartId_productId_registryItemId: { cartId: cart.id, productId: input.productId, registryItemId } },
    create: {
      cartId: cart.id,
      productId: input.productId,
      registryItemId,
      quantity: input.quantity,
      personalizationValues: values as never,
      personalizationSelected: selected,
      personalizationCostSnapshot: cost,
    },
    update: {
      quantity: nextQuantity,
      personalizationValues: values as never,
      personalizationSelected: selected,
      personalizationCostSnapshot: cost,
    },
  });

  return getCart(userId);
}

async function findCartLine(cartId: string, key: string) {
  return prisma.cartItem.findFirst({
    where: { cartId, OR: [{ id: key }, { productId: key, registryItemId: "" }] },
  });
}

export async function updateCartItemQuantity(userId: string, productId: string, quantity: number) {
  const cart = await getOrCreateCart(userId);
  const existing = await findCartLine(cart.id, productId);
  if (!existing) throw new NotFoundError("Item not found in cart");

  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: existing.id } });
    return getCart(userId);
  }

  await assertPurchasable(existing.productId, quantity);
  if (existing.registryItemId) {
    const registryItem = await prisma.giftRegistryItem.findFirst({ where: { id: existing.registryItemId } });
    if (registryItem && availableToReserve(registryItem) + existing.quantity < quantity) {
      throw new ValidationError("Not enough remaining quantity on this registry gift");
    }
  }
  await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity } });
  return getCart(userId);
}

export async function removeCartItem(userId: string, productId: string) {
  const cart = await getOrCreateCart(userId);
  const existing = await findCartLine(cart.id, productId);
  if (existing) await prisma.cartItem.delete({ where: { id: existing.id } });
  else await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
  return getCart(userId);
}

export async function clearCart(userId: string) {
  const cart = await getOrCreateCart(userId);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  return getCart(userId);
}
