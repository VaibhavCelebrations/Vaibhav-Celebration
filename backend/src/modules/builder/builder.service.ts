// NOTE: Prisma enums used as string literals below (PER_CARD, CHILDREN_ACTIVITY, etc.)
// because the generated enum objects are not reliably available at runtime in all contexts.
import { prisma } from "../../db/prisma";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { toMediaRef } from "../../lib/media-ref";
import { getGstPercent, gstOn, computeShippingForSubtotal } from "../../lib/settings";
import { isGiftRegistryMatrixService } from "../upgrades/upgrades.service";

/** Category slug on ProductCategory → ExtraServiceCategory for filtering */
const CATEGORY_SLUG_BY_SLOT: Record<string, string> = {
  "welcome-items": "welcome-items",
  "children-activities": "children-activities",
  "family-activities": "family-activities",
  "return-gifts": "return-gifts",
  packaging: "packaging",
  "thank-you-tags": "thank-you-tags",
};

/** SKU → package tiers that may select this product (mirrors seed) */
export const PRODUCT_TIER_MAP: Record<string, Array<"standard" | "premium" | "luxe">> = {
  "SP-WEL-BDG": ["premium", "luxe"],
  "SP-WEL-HDB": ["premium", "luxe"],
  "SP-WEL-ID": ["premium", "luxe"],
  "SP-WEL-QR": ["luxe"],
  "SP-ACT-HDG": ["standard", "premium", "luxe"],
  "SP-ACT-PUZ": ["standard", "premium", "luxe"],
  "SP-ACT-BNG": ["standard", "premium", "luxe"],
  "SP-FAM-BNG": ["luxe"],
  "SP-RG-STAT": ["standard", "premium", "luxe"],
  "SP-RG-LBOX": ["standard", "premium", "luxe"],
  "SP-RG-BAG": ["premium", "luxe"],
  "SP-PACK-BAS": ["standard"],
  "SP-PACK-THM": ["premium"],
  "SP-PACK-CUS": ["luxe"],
  "SP-TAG-THANK": ["luxe"],
};

export const AUTO_PACKAGING_SKU: Record<string, string> = {
  standard: "SP-PACK-BAS",
  premium: "SP-PACK-THM",
  luxe: "SP-PACK-CUS",
};

export const AUTO_THANKYOU_SKU: Record<string, string | null> = {
  standard: null,
  premium: null,
  luxe: "SP-TAG-THANK",
};

/** Group / per-group SKUs — charged ×1 (or MOQ units as group fee) */
const PER_GROUP_SKUS = new Set(["SP-ACT-BNG", "SP-FAM-BNG"]);

export type BuilderLocation = "jaipur" | "outside";

export type BuilderSelections = {
  welcomeItem?: string | null;
  activity1?: string | null;
  activity2?: string | null;
  returnGift?: string | null;
  familyActivity?: string | null;
  decor?: boolean;
  /** Per-SKU personalization opt-in (true = customer wants personalization). */
  personalization?: Record<string, boolean>;
  /** Optional Gift Registry customize line (₹500) when the package includes Gift Registry. */
  giftRegistryCustomize?: boolean;
};

export type BuilderQuoteInput = {
  packageSlug: string;
  themeSlug: string;
  guestCount: number;
  location: BuilderLocation;
  selections: BuilderSelections;
};

export type BuilderLineItem = {
  key: string;
  label: string;
  sublabel?: string;
  section: "package" | "per-child" | "per-group" | "fixed" | "decor" | "auto";
  sku?: string;
  packageServiceItemId?: string;
  quantity: number;
  unitPriceInPaise: number;
  lineTotalInPaise: number;
  moqApplied?: boolean;
  personalizationSelected?: boolean;
  personalizationCostInPaise?: number;
};

export type BuilderQuoteResult = {
  packageId: string;
  packageSlug: string;
  packageTitle: string;
  themeId: string;
  themeSlug: string;
  themeTitle: string;
  guestCount: number;
  location: BuilderLocation;
  lineItems: BuilderLineItem[];
  basePriceInPaise: number;
  customizationTotalInPaise: number;
  subtotalInPaise: number;
  shippingInPaise: number;
  shippingWaived: boolean;
  freeShippingThresholdInPaise: number;
  amountUntilFreeShippingInPaise: number;
  gstPercent: number;
  gstInPaise: number;
  totalInPaise: number;
  includedLabels: string[];
  hasPersonalization: boolean;
  giftRegistryIncluded: boolean;
  giftRegistryCustomizePriceInPaise: number;
};

function perChildQty(guestCount: number, moq: number): { qty: number; moqApplied: boolean } {
  const qty = Math.max(guestCount, moq);
  return { qty, moqApplied: guestCount < moq };
}

function perGroupQty(guestCount: number, moq: number): { qty: number; moqApplied: boolean } {
  // Charge unit price ×1 for the group, but if guests < MOQ, charge unit price × MOQ (plan literal)
  if (guestCount < moq) return { qty: moq, moqApplied: true };
  return { qty: 1, moqApplied: false };
}

export async function listBuilderProducts(q: {
  theme: string;
  category: string;
  tier: string;
}) {
  const tier = q.tier as "standard" | "premium" | "luxe";
  if (!["standard", "premium", "luxe"].includes(tier)) {
    throw new ValidationError("tier must be standard, premium, or luxe");
  }
  const categorySlug = CATEGORY_SLUG_BY_SLOT[q.category] ?? q.category;

  const rows = await prisma.product.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      categoryTags: { some: { category: { slug: categorySlug } } },
      themeTags: { some: { theme: { slug: q.theme, deletedAt: null, isActive: true } } },
    },
    include: {
      images: { include: { media: true }, orderBy: { displayOrder: "asc" } },
      categoryTags: { include: { category: true } },
      inventory: true,
      personalizationFields: { orderBy: { fieldKey: "asc" } },
    },
    orderBy: { title: "asc" },
  });

  const allowed = rows.filter((p) => {
    const tiers = PRODUCT_TIER_MAP[p.sku];
    if (!tiers) return false;
    return tiers.includes(tier) && !p.sku.startsWith("SP-PACK-") && p.sku !== "SP-TAG-THANK";
  });

  return allowed.map((p) => {
    const firstImage = p.images[0];
    const media = firstImage?.media ?? null;
    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      sku: p.sku,
      description: p.description,
      priceInPaise: p.priceInPaise,
      minOrderQuantity: p.minOrderQuantity,
      pricingMode: PER_GROUP_SKUS.has(p.sku) ? ("PER_GROUP" as const) : ("PER_CHILD" as const),
      categories: p.categoryTags.map((t) => ({ slug: t.category.slug, name: t.category.name })),
      imageUrl: media ? toMediaRef(media)?.url ?? null : null,
      personalizationEnabled: p.personalizationEnabled,
      personalizationCostInPaise: p.personalizationCostInPaise,
      personalizationFields: p.personalizationFields.map((f) => ({
        id: f.id,
        fieldKey: f.fieldKey,
        label: f.label,
        fieldType: f.fieldType,
        isRequired: f.isRequired,
        maxLength: f.maxLength,
      })),
    };
  });
}

export async function computeBuilderQuote(input: BuilderQuoteInput): Promise<BuilderQuoteResult> {
  if (input.guestCount < 5) {
    throw new ValidationError("Minimum 5 children per booking");
  }
  if (!["jaipur", "outside"].includes(input.location)) {
    throw new ValidationError("location must be jaipur or outside");
  }

  const pkg = await prisma.package.findFirst({
    where: { slug: input.packageSlug, deletedAt: null, isActive: true },
    include: {
      serviceItems: {
        where: { extraService: { deletedAt: null } },
        orderBy: { displayOrder: "asc" },
        include: { extraService: true },
      },
    },
  });
  if (!pkg) throw new NotFoundError("Package not found");

  const theme = await prisma.theme.findFirst({
    where: { slug: input.themeSlug, deletedAt: null, isActive: true },
  });
  if (!theme) throw new NotFoundError("Theme not found");

  const link = await prisma.themePackage.findFirst({
    where: { themeId: theme.id, packageId: pkg.id, isActive: true },
  });
  if (!link) throw new ValidationError("Selected theme is not available for this package");

  const basePriceInPaise = link.priceOverrideInPaise ?? pkg.priceInPaise;
  const lineItems: BuilderLineItem[] = [];

  lineItems.push({
    key: "base",
    label: `${pkg.title} — ${theme.title}`,
    sublabel: "Base package",
    section: "package",
    quantity: 1,
    unitPriceInPaise: basePriceInPaise,
    lineTotalInPaise: basePriceInPaise,
  });

  const included = pkg.serviceItems.filter(
    (s) =>
      s.isIncluded &&
      s.extraService.isActive &&
      !s.extraService.deletedAt &&
      s.extraService.category !== "DECOR",
  );

  const includedLabels = included
    .filter((s) => s.extraService.pricingMode !== "PER_CHILD_CHOOSABLE")
    .map((s) => s.extraService.label);

  // Helper: find PSI by ExtraService slug
  const psiBySlug = (slug: string) =>
    pkg.serviceItems.find((s) => s.extraService.slug === slug && s.isIncluded);

  // Countdown PER_CARD — additional charge
  const countdown = included.find((s) => s.extraService.pricingMode === "PER_CARD");
  if (countdown && countdown.extraService.choiceCount && countdown.extraService.customizationPriceInPaise > 0) {
    const qty = countdown.extraService.choiceCount;
    const unit = countdown.extraService.customizationPriceInPaise;
    lineItems.push({
      key: `countdown-${countdown.extraService.slug}`,
      label: countdown.extraService.label,
      sublabel: `₹${(unit / 100).toFixed(0)} × ${qty}`,
      section: "fixed",
      packageServiceItemId: countdown.id,
      quantity: qty,
      unitPriceInPaise: unit,
      lineTotalInPaise: unit * qty,
    });
  }

  async function addProductLine(opts: {
    key: string;
    sku: string;
    labelPrefix: string;
    section: BuilderLineItem["section"];
    packageServiceItemId?: string;
  }) {
    const product = await prisma.product.findFirst({
      where: { sku: opts.sku, deletedAt: null, isActive: true },
    });
    if (!product) throw new ValidationError(`Product not found: ${opts.sku}`);

    const tiers = PRODUCT_TIER_MAP[product.sku] ?? [];
    if (!tiers.includes(input.packageSlug as "standard" | "premium" | "luxe")) {
      throw new ValidationError(`Product ${opts.sku} is not available for ${input.packageSlug}`);
    }

    const isGroup = PER_GROUP_SKUS.has(product.sku);
    const { qty, moqApplied } = isGroup
      ? perGroupQty(input.guestCount, product.minOrderQuantity)
      : perChildQty(input.guestCount, product.minOrderQuantity);

    const personalizationSelected = Boolean(
      product.personalizationEnabled && input.selections.personalization?.[product.sku],
    );
    const personalizationCostInPaise = personalizationSelected ? product.personalizationCostInPaise : 0;
    const unitWithPersonalization = product.priceInPaise + personalizationCostInPaise;

    lineItems.push({
      key: opts.key,
      label: personalizationSelected
        ? `${opts.labelPrefix}: ${product.title} (personalized)`
        : `${opts.labelPrefix}: ${product.title}`,
      sublabel: moqApplied
        ? `Minimum ${product.minOrderQuantity} units — charged for ${qty}`
        : isGroup
          ? `₹${(unitWithPersonalization / 100).toFixed(0)} × ${qty} group`
          : `₹${(unitWithPersonalization / 100).toFixed(0)} × ${qty}`,
      section: opts.section,
      sku: product.sku,
      packageServiceItemId: opts.packageServiceItemId,
      quantity: qty,
      unitPriceInPaise: unitWithPersonalization,
      lineTotalInPaise: unitWithPersonalization * qty,
      moqApplied,
      personalizationSelected,
      personalizationCostInPaise,
    });
  }

  const sel = input.selections;
  const tier = input.packageSlug as "standard" | "premium" | "luxe";

  // Validate choosable requirements
  const activitySvc = included.find((s) => s.extraService.category === "CHILDREN_ACTIVITY");
  const welcomeSvc = included.find((s) => s.extraService.category === "WELCOME_ITEM");
  const giftSvc = included.find((s) => s.extraService.category === "RETURN_GIFT");
  const familySvc = included.find((s) => s.extraService.category === "FAMILY_ACTIVITY");

  if (welcomeSvc) {
    if (!sel.welcomeItem) throw new ValidationError("Please choose a welcome item");
    await addProductLine({
      key: "welcome",
      sku: sel.welcomeItem,
      labelPrefix: "Welcome item",
      section: "per-child",
      packageServiceItemId: welcomeSvc.id,
    });
  }

  if (activitySvc) {
    const need = activitySvc.extraService.choiceCount ?? 1;
    if (!sel.activity1) throw new ValidationError("Please choose activity 1");
    await addProductLine({
      key: "activity1",
      sku: sel.activity1,
      labelPrefix: "Activity",
      section: PER_GROUP_SKUS.has(sel.activity1) ? "per-group" : "per-child",
      packageServiceItemId: activitySvc.id,
    });
    if (need >= 2) {
      if (!sel.activity2) throw new ValidationError("Please choose activity 2");
      if (sel.activity1 === sel.activity2) throw new ValidationError("Please choose two different activities");
      await addProductLine({
        key: "activity2",
        sku: sel.activity2,
        labelPrefix: "Activity",
        section: PER_GROUP_SKUS.has(sel.activity2) ? "per-group" : "per-child",
        packageServiceItemId: activitySvc.id,
      });
    }
  }

  if (giftSvc) {
    if (!sel.returnGift) throw new ValidationError("Please choose a return gift");
    await addProductLine({
      key: "returnGift",
      sku: sel.returnGift,
      labelPrefix: "Return gift",
      section: "per-child",
      packageServiceItemId: giftSvc.id,
    });
  }

  if (familySvc) {
    if (!sel.familyActivity) throw new ValidationError("Please choose a family activity");
    await addProductLine({
      key: "family",
      sku: sel.familyActivity,
      labelPrefix: "Family activity",
      section: "per-group",
      packageServiceItemId: familySvc.id,
    });
  }

  // Auto packaging
  const packSku = AUTO_PACKAGING_SKU[tier];
  if (packSku) {
    await addProductLine({
      key: "packaging",
      sku: packSku,
      labelPrefix: "Packaging",
      section: "auto",
    });
  }

  // Auto thank-you tag
  const thankSku = AUTO_THANKYOU_SKU[tier];
  if (thankSku) {
    const thankPsi = psiBySlug("thankyou-tag");
    await addProductLine({
      key: "thankyou",
      sku: thankSku,
      labelPrefix: "Thank-you tag",
      section: "auto",
      packageServiceItemId: thankPsi?.id,
    });
  }

  // Decor
  if (input.location === "jaipur") {
    const decorSlug =
      tier === "standard" ? "decor-jaipur-std" : tier === "premium" ? "decor-jaipur-prm" : "decor-jaipur-lux";
    const decorPsi = pkg.serviceItems.find(
      (s) => s.extraService.slug === decorSlug && s.extraService.locationScope === "JAIPUR_ONLY",
    );
    if (sel.decor && decorPsi) {
      const unit = decorPsi.extraService.customizationPriceInPaise;
      lineItems.push({
        key: "decor",
        label: decorPsi.extraService.label,
        sublabel: "Flat rate — Jaipur",
        section: "decor",
        packageServiceItemId: decorPsi.id,
        quantity: 1,
        unitPriceInPaise: unit,
        lineTotalInPaise: unit,
      });
    }
  } else {
    // Outside — free guide, informational only (₹0)
    const guideSlug =
      tier === "standard" ? "decor-guide-std" : tier === "premium" ? "decor-guide-prm" : "decor-guide-lux";
    const guide = pkg.serviceItems.find((s) => s.extraService.slug === guideSlug);
    if (guide) {
      includedLabels.push(guide.extraService.label);
    }
  }

  const giftRegistryPsi = pkg.serviceItems.find(
    (s) =>
      s.isIncluded &&
      s.extraService.isActive &&
      !s.extraService.deletedAt &&
      isGiftRegistryMatrixService(s.extraService),
  );
  const giftRegistryIncluded = Boolean(giftRegistryPsi);
  const giftRegistryCustomizePriceInPaise = giftRegistryPsi?.extraService.customizationPriceInPaise ?? 0;
  if (sel.giftRegistryCustomize && giftRegistryPsi && giftRegistryCustomizePriceInPaise > 0) {
    lineItems.push({
      key: "gift-registry-customize",
      label: `${giftRegistryPsi.extraService.label} customization`,
      sublabel: "Fixed customize price",
      section: "fixed",
      packageServiceItemId: giftRegistryPsi.id,
      quantity: 1,
      unitPriceInPaise: giftRegistryCustomizePriceInPaise,
      lineTotalInPaise: giftRegistryCustomizePriceInPaise,
    });
  }

  const customizationTotalInPaise = lineItems
    .filter((l) => l.key !== "base")
    .reduce((sum, l) => sum + l.lineTotalInPaise, 0);
  const subtotalInPaise = basePriceInPaise + customizationTotalInPaise;

  const shipping = await computeShippingForSubtotal(subtotalInPaise);
  const gstPercent = await getGstPercent();
  const taxable = subtotalInPaise + shipping.shippingInPaise;
  const gstInPaise = gstOn(taxable, gstPercent);
  const totalInPaise = taxable + gstInPaise;
  const hasPersonalization = lineItems.some((l) => l.personalizationSelected);

  return {
    packageId: pkg.id,
    packageSlug: pkg.slug,
    packageTitle: pkg.title,
    themeId: theme.id,
    themeSlug: theme.slug,
    themeTitle: theme.title,
    guestCount: input.guestCount,
    location: input.location,
    lineItems,
    basePriceInPaise,
    customizationTotalInPaise,
    subtotalInPaise,
    shippingInPaise: shipping.shippingInPaise,
    shippingWaived: shipping.shippingWaived,
    freeShippingThresholdInPaise: shipping.freeShippingThresholdInPaise,
    amountUntilFreeShippingInPaise: shipping.amountUntilFreeShippingInPaise,
    gstPercent,
    gstInPaise,
    totalInPaise,
    includedLabels,
    hasPersonalization,
    giftRegistryIncluded,
    giftRegistryCustomizePriceInPaise,
  };
}
