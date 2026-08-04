import { prisma } from "../../db/prisma";
import { NotFoundError } from "../../lib/errors";

const wishlistInclude = {
  product: {
    include: {
      images: { include: { media: true }, orderBy: { displayOrder: "asc" as const }, take: 1 },
      inventory: true,
    },
  },
} as const;

function shapeWishlistItem(item: {
  id: string;
  productId: string;
  addedAt: Date;
  product: {
    title: string;
    slug: string;
    priceInPaise: number;
    isActive: boolean;
    images: Array<{ media: { url: string; altText: string | null } | null }>;
    inventory: { quantityAvailable: number; statusFlag: string } | null;
  };
}) {
  return {
    id: item.id,
    productId: item.productId,
    title: item.product.title,
    slug: item.product.slug,
    priceInPaise: item.product.priceInPaise,
    image: item.product.images[0]?.media ?? null,
    isActive: item.product.isActive,
    stockStatus: item.product.inventory?.statusFlag ?? "OUT_OF_STOCK",
    addedAt: item.addedAt.toISOString(),
  };
}

export async function listWishlist(userId: string) {
  const items = await prisma.wishlistItem.findMany({ where: { userId }, include: wishlistInclude, orderBy: { addedAt: "desc" } });
  return items.map(shapeWishlistItem);
}

export async function addToWishlist(userId: string, productId: string) {
  const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
  if (!product) throw new NotFoundError("Product not found");
  await prisma.wishlistItem.upsert({
    where: { userId_productId: { userId, productId } },
    create: { userId, productId },
    update: {},
  });
  return listWishlist(userId);
}

export async function removeFromWishlist(userId: string, productId: string) {
  await prisma.wishlistItem.deleteMany({ where: { userId, productId } });
  return listWishlist(userId);
}

export async function isProductWishlisted(userId: string, productId: string): Promise<boolean> {
  const item = await prisma.wishlistItem.findUnique({ where: { userId_productId: { userId, productId } } });
  return item !== null;
}
