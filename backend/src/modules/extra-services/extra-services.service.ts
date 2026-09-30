import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { toMediaRef, type MediaRef } from "../../lib/media-ref";
import { delPattern } from "../../lib/redis";
import { invalidateBuilderCaches } from "../builder/builder.service";

export type ThemeProductsInput = Array<{ themeId: string; productIds: string[] }>;

export type ThemePreviewsInput = Array<{ themeId: string; mediaIds: string[] }>;

export type ExtraServiceWriteInput = {
  themeProducts?: ThemeProductsInput;
  /** Per-theme preview files (media library ids, in order); replaces the service's full set when present. */
  themePreviews?: ThemePreviewsInput;
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

/**
 * A service is shown to the customer in exactly one way: as a Preview (its own images/videos,
 * nothing to choose) or as a Customize choice (pick N products), never both. Turning one on in a
 * request turns the other off; asking for both at once is rejected.
 */
function normalizeChoiceFields(
  data: Record<string, unknown>,
  current?: { isProductChoice: boolean; hasPreview: boolean },
) {
  if (data.isProductChoice === true && data.hasPreview === true) {
    throw new ValidationError("A service can show a preview or let the customer choose products, not both");
  }
  if (data.hasPreview === true) data.isProductChoice = false;
  if (data.isProductChoice === true) data.hasPreview = false;

  const isChoice = (data.isProductChoice as boolean | undefined) ?? current?.isProductChoice ?? false;
  const hasPreview = (data.hasPreview as boolean | undefined) ?? current?.hasPreview ?? false;
  if (data.isProductChoice === true) {
    // Choice services are priced from the picked products, never as a flat option.
    data.pricingMode = "PER_CHILD_CHOOSABLE";
  } else if (data.isProductChoice === false && current?.isProductChoice) {
    data.pricingMode = null;
  }
  return { isChoice, hasPreview };
}

/** Replace a service's preview images/videos for every theme (order within a theme = order given). */
async function replacePreviewMedia(tx: Prisma.TransactionClient, extraServiceId: string, themePreviews: ThemePreviewsInput) {
  const themeIds = [...new Set(themePreviews.map((t) => t.themeId))];
  const mediaIds = [...new Set(themePreviews.flatMap((t) => t.mediaIds))];
  const [themes, media] = await Promise.all([
    tx.theme.count({ where: { id: { in: themeIds }, deletedAt: null } }),
    tx.mediaAsset.count({ where: { id: { in: mediaIds }, deletedAt: null } }),
  ]);
  if (themes !== themeIds.length) throw new ValidationError("One or more themes no longer exist");
  if (media !== mediaIds.length) throw new ValidationError("One or more preview files no longer exist in the media library");

  await tx.extraServiceMedia.deleteMany({ where: { extraServiceId } });
  const data = themePreviews.flatMap((t) =>
    [...new Set(t.mediaIds)].map((mediaId, displayOrder) => ({ extraServiceId, themeId: t.themeId, mediaId, displayOrder })),
  );
  if (data.length) await tx.extraServiceMedia.createMany({ data });
}

/**
 * A preview is shown for the theme the customer picked, so every active theme needs its own
 * files — otherwise a customer choosing the uncovered theme would see no preview at all.
 */
async function assertPreviewComplete(tx: Prisma.TransactionClient, extraServiceId: string) {
  const [svc, themes, counts] = await Promise.all([
    tx.extraService.findUniqueOrThrow({ where: { id: extraServiceId }, select: { celebrationStage: true } }),
    tx.theme.findMany({ where: { deletedAt: null, isActive: true }, select: { id: true, title: true }, orderBy: { displayOrder: "asc" } }),
    tx.extraServiceMedia.groupBy({ by: ["themeId"], where: { extraServiceId }, _count: { _all: true } }),
  ]);
  if (!svc.celebrationStage) {
    throw new ValidationError("Choose where the preview appears: Before, During or After the celebration");
  }
  const covered = new Set(counts.map((c) => c.themeId));
  const missing = themes.filter((t) => !covered.has(t.id));
  if (missing.length) {
    throw new ValidationError(`Add at least one preview image or video for every theme. Missing: ${missing.map((t) => t.title).join(", ")}`);
  }
}

/** Theme → preview images/videos of a service, each theme's list in display order. */
export async function getExtraServicePreviewMedia(id: string) {
  await getExtraService(id);
  const rows = await prisma.extraServiceMedia.findMany({
    where: { extraServiceId: id },
    orderBy: { displayOrder: "asc" },
    include: { media: true },
  });
  const byTheme = new Map<string, MediaRef[]>();
  for (const r of rows) {
    const ref = toMediaRef(r.media);
    if (!ref) continue;
    const list = byTheme.get(r.themeId) ?? [];
    list.push(ref);
    byTheme.set(r.themeId, list);
  }
  return [...byTheme].map(([themeId, media]) => ({ themeId, media }));
}

export async function createExtraService(input: ExtraServiceWriteInput) {
  const { themeProducts, themePreviews, ...raw } = input;
  const data = raw as Prisma.ExtraServiceUncheckedCreateInput;
  const { isChoice, hasPreview } = normalizeChoiceFields(data as Record<string, unknown>);

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
    if (themePreviews) await replacePreviewMedia(tx, item.id, themePreviews);
    if (isChoice) await assertThemeCoverage(tx, item.id, item.selectionCount);
    if (hasPreview) await assertPreviewComplete(tx, item.id);
    return item;
  });
  invalidate();
  return item;
}

export async function updateExtraService(id: string, input: ExtraServiceWriteInput) {
  const { themeProducts, themePreviews, ...raw } = input;
  const data = raw as Prisma.ExtraServiceUncheckedUpdateInput;

  await prisma.$transaction(async (tx) => {
    const current = await tx.extraService.findFirst({ where: { id, deletedAt: null } });
    if (!current) throw new NotFoundError("Extra service not found");

    const { isChoice, hasPreview } = normalizeChoiceFields(data as Record<string, unknown>, current);
    // Unrelated edits (label, price…) must not be blocked by an incomplete product or preview setup.
    const touchesChoice = Boolean(themeProducts) || "isProductChoice" in data || "selectionCount" in data;
    const touchesPreview = Boolean(themePreviews) || "hasPreview" in data || "celebrationStage" in data;
    if (Object.keys(data).length) await tx.extraService.update({ where: { id }, data });
    if (themeProducts) await replaceServiceProducts(tx, id, themeProducts);
    if (themePreviews) await replacePreviewMedia(tx, id, themePreviews);

    if (isChoice && touchesChoice) {
      const next = await tx.extraService.findUniqueOrThrow({ where: { id }, select: { selectionCount: true } });
      await assertThemeCoverage(tx, id, next.selectionCount);
    }
    if (hasPreview && touchesPreview) await assertPreviewComplete(tx, id);
  });
  invalidate();
  return prisma.extraService.findUniqueOrThrow({ where: { id } });
}

/**
 * Save a new order for the services. The same order is written to every package's list, so the
 * package matrix, the packages page and the builder all show services in the order the admin set.
 * Services not named keep their relative order after the named ones.
 */
export async function reorderExtraServices(orderedIds: string[]) {
  const unique = [...new Set(orderedIds)];
  await prisma.$transaction(
    async (tx) => {
      const all = await tx.extraService.findMany({
        where: { deletedAt: null },
        orderBy: [{ displayOrder: "asc" }, { label: "asc" }],
        select: { id: true },
      });
      const known = new Set(all.map((s) => s.id));
      if (unique.some((id) => !known.has(id))) {
        throw new ValidationError("One or more services no longer exist. Reload and try again.");
      }
      const named = new Set(unique);
      const finalOrder = [...unique, ...all.map((s) => s.id).filter((id) => !named.has(id))];
      for (const [index, id] of finalOrder.entries()) {
        await tx.extraService.update({ where: { id }, data: { displayOrder: index } });
        await tx.packageServiceItem.updateMany({ where: { extraServiceId: id }, data: { displayOrder: index } });
      }
    },
    { timeout: 30_000 },
  );
  invalidate();
  void delPattern("adm:packages:*");
  return listExtraServices(true);
}

export async function deleteExtraService(id: string) {
  const updated = await prisma.extraService.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date(), isActive: false },
  });
  if (!updated.count) throw new NotFoundError("Extra service not found");
  invalidate();
}
