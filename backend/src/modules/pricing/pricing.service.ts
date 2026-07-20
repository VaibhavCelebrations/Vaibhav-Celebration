import { prisma } from "../../db/prisma";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { getGstPercent, gstOn } from "../../lib/settings";

export type QuoteOptionInput = { optionId: string; quantity: number };

export type QuoteResult = {
  packageId: string;
  themeId: string | null;
  packageTitle: string;
  themeTitle: string | null;
  basePriceInPaise: number;
  priceOverrideApplied: boolean;
  options: Array<{
    optionId: string;
    label: string;
    quantity: number;
    unitPriceInPaise: number;
    lineTotalInPaise: number;
  }>;
  customizationTotalInPaise: number;
  subtotalInPaise: number;
  gstPercent: number;
  gstInPaise: number;
  totalInPaise: number;
  features: Array<{ label: string; quantity: number | null }>;
};

/**
 * Authoritative pricing engine — Document 04 §3.2.
 * Frontend must never compute final totals; only this module does.
 */
export async function computeQuote(input: {
  packageId: string;
  themeId?: string | null;
  selectedOptions?: QuoteOptionInput[];
}): Promise<QuoteResult> {
  const pkg = await prisma.package.findFirst({
    where: { id: input.packageId, deletedAt: null, isActive: true },
    include: {
      features: { where: { deletedAt: null }, orderBy: { displayOrder: "asc" } },
      customizationOptions: { where: { deletedAt: null }, orderBy: { displayOrder: "asc" } },
    },
  });
  if (!pkg) throw new NotFoundError("Package not found");

  let basePriceInPaise = pkg.priceInPaise;
  let priceOverrideApplied = false;
  let themeTitle: string | null = null;

  if (input.themeId) {
    const link = await prisma.themePackage.findFirst({
      where: { themeId: input.themeId, packageId: pkg.id },
      include: { theme: { select: { title: true, deletedAt: true, isActive: true } } },
    });
    if (!link || link.theme.deletedAt || !link.theme.isActive) {
      throw new ValidationError("Selected theme is not available for this package");
    }
    themeTitle = link.theme.title;
    if (link.priceOverrideInPaise != null) {
      basePriceInPaise = link.priceOverrideInPaise;
      priceOverrideApplied = true;
    }
  }

  const optionMap = new Map(pkg.customizationOptions.map((o) => [o.id, o]));
  const options: QuoteResult["options"] = [];

  for (const sel of input.selectedOptions ?? []) {
    if (sel.quantity <= 0) continue;
    const opt = optionMap.get(sel.optionId);
    if (!opt) throw new ValidationError(`Unknown customization option: ${sel.optionId}`);
    const maxQty = opt.maxQuantity ?? 99;
    if (sel.quantity < opt.minQuantity || sel.quantity > maxQty) {
      throw new ValidationError(
        `Quantity for "${opt.label}" must be between ${opt.minQuantity} and ${maxQty}`,
      );
    }
    const lineTotalInPaise = opt.extraPriceInPaise * sel.quantity;
    options.push({
      optionId: opt.id,
      label: opt.label,
      quantity: sel.quantity,
      unitPriceInPaise: opt.extraPriceInPaise,
      lineTotalInPaise,
    });
  }

  const customizationTotalInPaise = options.reduce((s, o) => s + o.lineTotalInPaise, 0);
  const subtotalInPaise = basePriceInPaise + customizationTotalInPaise;
  const gstPercent = await getGstPercent();
  const gstInPaise = gstOn(subtotalInPaise, gstPercent);
  const totalInPaise = subtotalInPaise + gstInPaise;

  return {
    packageId: pkg.id,
    themeId: input.themeId ?? null,
    packageTitle: pkg.title,
    themeTitle,
    basePriceInPaise,
    priceOverrideApplied,
    options,
    customizationTotalInPaise,
    subtotalInPaise,
    gstPercent,
    gstInPaise,
    totalInPaise,
    features: pkg.features.map((f) => ({ label: f.label, quantity: f.quantity })),
  };
}
