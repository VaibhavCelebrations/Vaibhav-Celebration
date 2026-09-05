import { prisma } from "../../db/prisma";

export async function getInventoryValuation() {
  const items = await prisma.product.findMany({
    where: {
      deletedAt: null,
      inventory: { isNot: null },
    },
    select: {
      id: true,
      title: true,
      sku: true,
      purchasePriceInPaise: true,
      inventory: {
        select: {
          quantityAvailable: true,
          lowStockThreshold: true,
          statusFlag: true,
        },
      },
    },
    orderBy: { title: "asc" },
  });

  const processed = items
    .filter((p) => (p.inventory?.quantityAvailable ?? 0) > 0)
    .map((p) => ({
      id: p.id,
      title: p.title,
      sku: p.sku,
      quantity: p.inventory!.quantityAvailable,
      unitCost: p.purchasePriceInPaise ?? 0,
      totalValue: (p.inventory!.quantityAvailable) * (p.purchasePriceInPaise ?? 0),
    }));

  const totalValuation = processed.reduce((sum, item) => sum + item.totalValue, 0);

  return { items: processed, totalValuation };
}

export async function getLowStockAlerts() {
  const items = await prisma.product.findMany({
    where: {
      deletedAt: null,
      inventory: {
        statusFlag: { in: ["LOW_STOCK", "OUT_OF_STOCK"] },
      },
    },
    select: {
      id: true,
      title: true,
      sku: true,
      inventory: {
        select: {
          quantityAvailable: true,
          lowStockThreshold: true,
          statusFlag: true,
          lastRestockedAt: true,
        },
      },
    },
    orderBy: {
      inventory: { quantityAvailable: "asc" },
    },
  });

  return items.map((p) => ({
    id: p.id,
    title: p.title,
    sku: p.sku,
    quantity: p.inventory!.quantityAvailable,
    threshold: p.inventory!.lowStockThreshold,
    status: p.inventory!.statusFlag,
    lastRestockedAt: p.inventory!.lastRestockedAt,
  }));
}
