import { prisma } from "../../db/prisma";
import { Prisma } from "@prisma/client";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { computeQuote } from "./cart-pricing.service";

const cartItemInclude = {
  product: { include: { images: { include: { media: true }, orderBy: { displayOrder: "asc" as const }, take: 1 }, inventory: true } },
} as const;

async function getOrCreateCart(userId: string) {
  const existing = await prisma.cart.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.cart.create({ data: { userId } });
}

function shapeCartItem(item: {
  id: string;
  productId: string;
  quantity: number;
  personalizationValues: unknown;
  product: {
    title: string;
    slug: string;
    priceInPaise: number;
    isActive: boolean;
    minOrderQuantity: number;
    maxOrderQuantity: number | null;
    images: Array<{ media: { url: string; altText: string | null } | null }>;
    inventory: { quantityAvailable: number; statusFlag: string } | null;
  };
}) {
  return {
    id: item.id,
    productId: item.productId,
    title: item.product.title,
    slug: item.product.slug,
    unitPriceInPaise: item.product.priceInPaise,
    quantity: item.quantity,
    personalizationValues: item.personalizationValues,
    image: item.product.images[0]?.media ?? null,
    isActive: item.product.isActive,
    stockAvailable: item.product.inventory?.quantityAvailable ?? 0,
    stockStatus: item.product.inventory?.statusFlag ?? "OUT_OF_STOCK",
    maxOrderQuantity: item.product.maxOrderQuantity,
  };
}

export async function getCart(userId: string) {
  const cart = await getOrCreateCart(userId);
  const items = await prisma.cartItem.findMany({ where: { cartId: cart.id }, include: cartItemInclude, orderBy: { addedAt: "asc" } });
  const shaped = items.map(shapeCartItem);
  const quote = await computeQuote(shaped.filter((i) => i.isActive).map((i) => ({ productId: i.productId, unitPriceInPaise: i.unitPriceInPaise, quantity: i.quantity })));
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

export async function addCartItem(userId: string, input: { productId: string; quantity: number; personalizationValues?: unknown }) {
  const cart = await getOrCreateCart(userId);
  const existing = await prisma.cartItem.findUnique({ where: { cartId_productId: { cartId: cart.id, productId: input.productId } } });
  const nextQuantity = (existing?.quantity ?? 0) + input.quantity;
  await assertPurchasable(input.productId, nextQuantity);

  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId: input.productId } },
    create: {
      cartId: cart.id,
      productId: input.productId,
      quantity: input.quantity,
      personalizationValues: (input.personalizationValues ?? null) as never,
    },
    update: {
      quantity: nextQuantity,
      personalizationValues: (input.personalizationValues ?? existing?.personalizationValues ?? null) as never,
    },
  });

  return getCart(userId);
}

export async function updateCartItemQuantity(userId: string, productId: string, quantity: number) {
  const cart = await getOrCreateCart(userId);
  const existing = await prisma.cartItem.findUnique({ where: { cartId_productId: { cartId: cart.id, productId } } });
  if (!existing) throw new NotFoundError("Item not found in cart");

  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: existing.id } });
    return getCart(userId);
  }

  await assertPurchasable(productId, quantity);
  await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity } });
  return getCart(userId);
}

export async function removeCartItem(userId: string, productId: string) {
  const cart = await getOrCreateCart(userId);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
  return getCart(userId);
}

export async function clearCart(userId: string) {
  const cart = await getOrCreateCart(userId);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  return getCart(userId);
}
