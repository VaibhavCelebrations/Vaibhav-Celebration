import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { delPattern } from "../../lib/redis";
import { invalidateBuilderCaches } from "../builder/builder.service";

export type ThemeProductsInput = Array<{ themeId: string; productIds: string[] }>;

export type ExtraServiceWriteInput = {
  themeProducts?: ThemeProductsInput;
} & Record<string, unknown>;

function invalidate() {
  void delPattern("pub:packages:*");
  invalidateBuilderCaches();
}

export async function listExtraServices(includeInactive = false) {
  return prisma.extraService.findMany({
    where: { deletedAt: null, ...(includeInactive ? {} : { isActive: true }) },
    orderBy: [{ displayOrder: "asc" }, { label: "asc" }],
  });
}

export async function getExtraService(id: string) {
  const item = await prisma.extraService.findFirst({
    where: { id, deletedAt: null },
  });
  if (!item) throw new NotFoundError("Extra service not found");
  return item;
}

/** Theme → product ids the customer may pick for this service. */
export async function getExtraServiceProducts(id: string) {
  await getExtraService(id);
  const rows = await prisma.serviceProduct.findMany({
    where: { extraServiceId: id },
    orderBy: [{ displayOrder: "asc" }],
    select: { themeId: true, productId: true },
  });
  const byTheme = new Map<string, string[]>();
  for (const r of rows) {
    const list = byTheme.get(r.themeId) ?? [];
    list.push(r.productId);
    byTheme.set(r.themeId, list);
  }
  return [...byTheme].map(([themeId, productIds]) => ({ themeId, productIds }));
}

/** Replace the full per-theme product list of a service (order = order given). */
async function replaceServiceProducts(
  tx: Prisma.TransactionClient,
  extraServiceId: string,
  themeProducts: ThemeProductsInput,
) {
  const themeIds = [...new Set(themeProducts.map((t) => t.themeId))];
  const productIds = [...new Set(themeProducts.flatMap((t) => t.productIds))];

  const [themes, products] = await Promise.all([
    tx.theme.count({ where: { id: { in: themeIds }, deletedAt: null } }),
    tx.product.count({ where: { id: { in: productIds }, deletedAt: null } }),
  ]);
  if (themes !== themeIds.length) throw new ValidationError("One or more themes no longer exist");
  if (products !== productIds.length) throw new ValidationError("One or more products no longer exist");

  // A product can only be offered under the theme it is tagged with
  const pairs = themeProducts.flatMap((t) => [...new Set(t.productIds)].map((productId) => ({ themeId: t.themeId, productId })));
  if (pairs.length) {
    const tagged = await tx.productThemeTag.count({ where: { OR: pairs } });
    if (tagged !== pairs.length) {
      throw new ValidationError("Some products are not tagged with the theme they were selected under");
    }
  }

  await tx.serviceProduct.deleteMany({ where: { extraServiceId } });
  const data = themeProducts.flatMap((t) =>
    [...new Set(t.productIds)].map((productId, displayOrder) => ({
      extraServiceId,
      themeId: t.themeId,
      productId,
      displayOrder,
    })),
  );
  if (data.length) await tx.serviceProduct.createMany({ data });
}

/**
 * A product-choice service must offer at least `selectionCount` products for every active theme,
 * otherwise a customer choosing that theme could not complete the step.
 */
async function assertThemeCoverage(tx: Prisma.TransactionClient, extraServiceId: string, selectionCount: number) {
  const [themes, counts] = await Promise.all([
    tx.theme.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, title: true },
      orderBy: { displayOrder: "asc" },
    }),
    tx.serviceProduct.groupBy({
      by: ["themeId"],
      where: { extraServiceId, product: { deletedAt: null, isActive: true } },
      _count: { _all: true },
    }),
  ]);
  const countByTheme = new Map(counts.map((c) => [c.themeId, c._count._all]));
  const short = themes.filter((t) => (countByTheme.get(t.id) ?? 0) < selectionCount);
  if (short.length) {
    throw new ValidationError(
      `Select at least ${selectionCount} product${selectionCount === 1 ? "" : "s"} for every theme. Missing: ${short
        .map((t) => `${t.title} (${countByTheme.get(t.id) ?? 0}/${selectionCount})`)
        .join(", ")}`,
    );
  }
}

function normalizeChoiceFields(data: Record<string, unknown>, current?: { isProductChoice: boolean }) {
  const isChoice = (data.isProductChoice as boolean | undefined) ?? current?.isProductChoice ?? false;
  if (data.isProductChoice === true) {
    // Choice services are priced from the picked products, never as a flat option.
    data.pricingMode = "PER_CHILD_CHOOSABLE";
  } else if (data.isProductChoice === false && current?.isProductChoice) {
    data.pricingMode = null;
  }
  return isChoice;
}

export async function createExtraService(input: ExtraServiceWriteInput) {
  const { themeProducts, ...raw } = input;
  const data = raw as Prisma.ExtraServiceUncheckedCreateInput;
  const isChoice = normalizeChoiceFields(data as Record<string, unknown>);

  const item = await prisma.$transaction(async (tx) => {
    const item = await tx.extraService.create({ data });
    const packages = await tx.package.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true },
      orderBy: [{ tierRank: "asc" }, { displayOrder: "asc" }],
    });
    if (packages.length) {
      await tx.packageServiceItem.createMany({
        data: packages.map((pkg, index) => ({
          packageId: pkg.id,
          extraServiceId: item.id,
          isIncluded: false,
          displayOrder: data.displayOrder ?? index,
        })),
      });
    }
    if (themeProducts) await replaceServiceProducts(tx, item.id, themeProducts);
    if (isChoice) await assertThemeCoverage(tx, item.id, item.selectionCount);
    return item;
  });
  invalidate();
  return item;
}

export async function updateExtraService(id: string, input: ExtraServiceWriteInput) {
  const { themeProducts, ...raw } = input;
  const data = raw as Prisma.ExtraServiceUncheckedUpdateInput;

  await prisma.$transaction(async (tx) => {
    const current = await tx.extraService.findFirst({ where: { id, deletedAt: null } });
    if (!current) throw new NotFoundError("Extra service not found");

    const isChoice = normalizeChoiceFields(data as Record<string, unknown>, current);
    // Unrelated edits (label, price…) must not be blocked by an incomplete product setup.
    const touchesChoice = Boolean(themeProducts) || "isProductChoice" in data || "selectionCount" in data;
    if (Object.keys(data).length) await tx.extraService.update({ where: { id }, data });
    if (themeProducts) await replaceServiceProducts(tx, id, themeProducts);

    if (isChoice && touchesChoice) {
      const next = await tx.extraService.findUniqueOrThrow({ where: { id }, select: { selectionCount: true } });
      await assertThemeCoverage(tx, id, next.selectionCount);
    }
  });
  invalidate();
  return prisma.extraService.findUniqueOrThrow({ where: { id } });
}

export async function deleteExtraService(id: string) {
  const updated = await prisma.extraService.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date(), isActive: false },
  });
  if (!updated.count) throw new NotFoundError("Extra service not found");
  invalidate();
}
