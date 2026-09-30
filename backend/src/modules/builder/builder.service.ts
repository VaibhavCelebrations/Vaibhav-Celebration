// NOTE: Prisma enums used as string literals below (PER_CARD, CHILDREN_ACTIVITY, etc.)
// because the generated enum objects are not reliably available at runtime in all contexts.
import { prisma } from "../../db/prisma";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { toMediaRef, type MediaRef } from "../../lib/media-ref";
import { cached, delPattern } from "../../lib/redis";
import { getGstPercent, gstOn, computeShippingForSubtotal } from "../../lib/settings";
import { isGiftRegistryMatrixService } from "../upgrades/upgrades.service";

/** Options responses are cached; also busted by any admin change (see invalidateBuilderCaches). */
const OPTIONS_TTL = 5 * 60;

/** Call after any admin change that affects what the builder offers (services, matrix, products). */
export function invalidateBuilderCaches() {
  void delPattern("pub:builder:*");
}

/**
 * SKU → package tiers for the auto-assigned packaging / thank-you products only.
 * Customer-chosen products are managed per service in the admin panel (ServiceProduct).
 */
export const PRODUCT_TIER_MAP: Record<string, Array<"essential" | "signature" | "grand">> = {
  "SP-PACK-BAS": ["essential"],
  "SP-PACK-THM": ["signature"],
  "SP-PACK-CUS": ["grand"],
  "SP-TAG-THANK": ["grand"],
};

export const AUTO_PACKAGING_SKU: Record<string, string> = {
  essential: "SP-PACK-BAS",
  signature: "SP-PACK-THM",
  grand: "SP-PACK-CUS",
};

export const AUTO_THANKYOU_SKU: Record<string, string | null> = {
  essential: null,
  signature: null,
  grand: "SP-TAG-THANK",
};

/** Legacy group-priced SKUs (bingo). New services set `isPerGroup` instead. */
const PER_GROUP_SKUS = new Set(["SP-ACT-BNG", "SP-FAM-BNG"]);

export type BuilderLocation = "jaipur" | "outside";

export type BuilderSelections = {
  /** ExtraService id → SKUs picked by the customer (admin-defined product-choice services). */
  choices?: Record<string, string[]>;
  /** @deprecated legacy slots — mapped onto `choices` by service category for old carts / links. */
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
  /** SKUs of optional add-on products for the chosen theme. */
  addons?: string[];
  /** Custom plan only: preview services bought individually at their Customize price. */
  services?: string[];
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
  section: "package" | "per-child" | "per-group" | "fixed" | "decor" | "auto" | "addon";
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

export type BuilderProductOption = {
  id: string;
  title: string;
  slug: string;
  sku: string;
  description: string;
  priceInPaise: number;
  minOrderQuantity: number;
  pricingMode: "PER_CHILD" | "PER_GROUP";
  /** First image — kept for older clients; `images` has the full gallery. */
  imageUrl: string | null;
  images: MediaRef[];
  personalizationEnabled: boolean;
  personalizationCostInPaise: number;
  personalizationFields: Array<{
    id: string;
    fieldKey: string;
    label: string;
    fieldType: string;
    isRequired: boolean;
    maxLength: number | null;
  }>;
  /** The product's category and the celebration stage that category sits under. */
  category: { name: string; slug: string; celebrationStage: string | null } | null;
};

/** Where a service is shown in the Customize step, derived from its products' categories. */
type ServicePlacement = {
  /** Before / During / After (null = category not yet assigned a stage in admin). */
  celebrationStage: string | null;
  /** Category of the service's products — ordered by the category's display order. */
  categoryName: string | null;
  categoryOrder: number;
};

export type BuilderChoiceService = ServicePlacement & {
  serviceId: string;
  label: string;
  description: string | null;
  /** How many products the customer must pick (admin value, capped by what the theme offers). */
  selectionCount: number;
  isPerGroup: boolean;
  products: BuilderProductOption[];
};

const STAGE_ORDER: Record<string, number> = { BEFORE: 0, DURING: 1, AFTER: 2 };
const stageRank = (s: string | null) => (s ? (STAGE_ORDER[s] ?? 99) : 99);

/**
 * A service sits under the stage of the category most of its products belong to (ties go to the
 * earlier stage), so the admin controls the Customize sections purely through product categories.
 */
function placeService(products: ChoiceProductRow[]): ServicePlacement {
  const counts = new Map<string, { n: number; cat: CategoryRow }>();
  for (const p of products) {
    const cat = primaryCategory(p);
    if (!cat) continue;
    const entry = counts.get(cat.slug) ?? { n: 0, cat };
    entry.n += 1;
    counts.set(cat.slug, entry);
  }
  const best = [...counts.values()].sort(
    (a, b) => b.n - a.n || stageRank(a.cat.celebrationStage) - stageRank(b.cat.celebrationStage) || a.cat.displayOrder - b.cat.displayOrder,
  )[0];
  return best
    ? { celebrationStage: best.cat.celebrationStage, categoryName: best.cat.name, categoryOrder: best.cat.displayOrder }
    : { celebrationStage: null, categoryName: null, categoryOrder: 9999 };
}

/** Before -> During -> After (uncategorized last), then category order; stable for ties. */
function byPlacement(a: ServicePlacement, b: ServicePlacement): number {
  return stageRank(a.celebrationStage) - stageRank(b.celebrationStage) || a.categoryOrder - b.categoryOrder;
}

function perChildQty(guestCount: number, moq: number): { qty: number; moqApplied: boolean } {
  const qty = Math.max(guestCount, moq);
  return { qty, moqApplied: guestCount < moq };
}

function perGroupQty(guestCount: number, moq: number): { qty: number; moqApplied: boolean } {
  // Charge unit price ×1 for the group, but if guests < MOQ, charge unit price × MOQ (plan literal)
  if (guestCount < moq) return { qty: moq, moqApplied: true };
  return { qty: 1, moqApplied: false };
}

function isGroupPriced(svc: { isPerGroup: boolean }, sku: string) {
  return svc.isPerGroup || PER_GROUP_SKUS.has(sku);
}

type CategoryRow = { name: string; slug: string; displayOrder: number; isActive: boolean; celebrationStage: string | null };

type ChoiceProductRow = {
  id: string;
  title: string;
  slug: string;
  sku: string;
  description: string;
  priceInPaise: number;
  minOrderQuantity: number;
  personalizationEnabled: boolean;
  personalizationCostInPaise: number;
  categoryTags?: Array<{ category: CategoryRow }>;
};

/** Products belong to one category in the admin; prefer an active one if several are tagged. */
function primaryCategory(p: ChoiceProductRow): CategoryRow | null {
  const cats = (p.categoryTags ?? []).map((t) => t.category);
  return cats.find((c) => c.isActive) ?? cats[0] ?? null;
}

type ChoiceProductRowWithMedia = ChoiceProductRow & {
  images: Array<{ media: Parameters<typeof toMediaRef>[0] }>;
  personalizationFields: BuilderProductOption["personalizationFields"];
};

/** One indexed query for every product offered by the given services under a theme. */
async function loadServiceProducts(serviceIds: string[], themeId: string, withMedia: boolean) {
  const bySvc = new Map<string, ChoiceProductRow[]>();
  if (!serviceIds.length) return bySvc;
  const rows = await prisma.serviceProduct.findMany({
    where: {
      extraServiceId: { in: serviceIds },
      themeId,
      product: { deletedAt: null, isActive: true },
    },
    orderBy: [{ displayOrder: "asc" }, { product: { title: "asc" } }],
    select: {
      extraServiceId: true,
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          sku: true,
          description: true,
          priceInPaise: true,
          minOrderQuantity: true,
          personalizationEnabled: true,
          personalizationCostInPaise: true,
          categoryTags: {
            select: {
              category: {
                select: { name: true, slug: true, displayOrder: true, isActive: true, celebrationStage: true },
              },
            },
          },
          ...(withMedia
            ? {
                images: {
                  orderBy: { displayOrder: "asc" as const },
                  select: { media: true },
                },
                personalizationFields: { orderBy: { fieldKey: "asc" as const } },
              }
            : {}),
        },
      },
    },
  });
  for (const r of rows) {
    const list = bySvc.get(r.extraServiceId) ?? [];
    list.push(r.product as ChoiceProductRow);
    bySvc.set(r.extraServiceId, list);
  }
  return bySvc;
}

function toProductOption(p: ChoiceProductRowWithMedia, isGroup: boolean): BuilderProductOption {
  const images = p.images.map((i) => toMediaRef(i.media)).filter((m): m is MediaRef => m !== null);
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    sku: p.sku,
    description: p.description,
    priceInPaise: p.priceInPaise,
    minOrderQuantity: p.minOrderQuantity,
    pricingMode: isGroup ? "PER_GROUP" : "PER_CHILD",
    imageUrl: images[0]?.url ?? null,
    images,
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
    category: (() => {
      const c = primaryCategory(p);
      return c ? { name: c.name, slug: c.slug, celebrationStage: c.celebrationStage } : null;
    })(),
  };
}

/** Prices one picked product: per-child × max(guests, MOQ), or per-group with MOQ, plus optional personalization. */
function makeProductLine(
  guestCount: number,
  personalization: Record<string, boolean> | undefined,
  opts: {
    key: string;
    product: ChoiceProductRow;
    labelPrefix: string;
    section: BuilderLineItem["section"];
    isGroup: boolean;
    packageServiceItemId?: string;
  },
): BuilderLineItem {
  const { product, isGroup } = opts;
  const { qty, moqApplied } = isGroup
    ? perGroupQty(guestCount, product.minOrderQuantity)
    : perChildQty(guestCount, product.minOrderQuantity);

  const personalizationSelected = Boolean(product.personalizationEnabled && personalization?.[product.sku]);
  const personalizationCostInPaise = personalizationSelected ? product.personalizationCostInPaise : 0;
  const unitWithPersonalization = product.priceInPaise + personalizationCostInPaise;

  return {
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
  };
}

/** Map legacy slot fields (welcomeItem, activity1, …) onto per-service `choices` for old carts / links. */
function resolveChoices(
  sel: BuilderSelections,
  services: Array<{ id: string; category: string | null }>,
): Record<string, string[]> {
  const legacyByCategory: Record<string, Array<string | null | undefined>> = {
    WELCOME_ITEM: [sel.welcomeItem],
    CHILDREN_ACTIVITY: [sel.activity1, sel.activity2],
    RETURN_GIFT: [sel.returnGift],
    FAMILY_ACTIVITY: [sel.familyActivity],
  };
  const out: Record<string, string[]> = {};
  for (const svc of services) {
    const explicit = sel.choices?.[svc.id];
    if (explicit) {
      out[svc.id] = explicit;
      continue;
    }
    const legacy = svc.category ? legacyByCategory[svc.category] : undefined;
    out[svc.id] = (legacy ?? []).filter((v): v is string => Boolean(v));
  }
  return out;
}

/** An included service the customer does not choose anything for — shown with its own images/videos. */
export type BuilderPreviewService = {
  serviceId: string;
  label: string;
  description: string | null;
  /** Before / During / After, set on the service by the admin. */
  celebrationStage: string | null;
  /** ALL | JAIPUR_ONLY | OUTSIDE_JAIPUR — the client hides previews that don't apply to the chosen location. */
  locationScope: string;
  media: MediaRef[];
};

/** Decor as offered for a package: a paid add-on in Jaipur, a free guide elsewhere. */
export type BuilderDecorOption = {
  serviceId: string;
  label: string;
  description: string | null;
  priceInPaise: number;
  media: MediaRef[];
};

export type BuilderOptions = {
  services: BuilderChoiceService[];
  previews: BuilderPreviewService[];
  decor: { jaipur: BuilderDecorOption | null; guide: BuilderDecorOption | null };
  /** Gift Registry for this package: included with the tier, or a paid add-on. Null when not offered. */
  giftRegistry: { included: boolean; priceInPaise: number; description: string | null } | null;
  /** Optional add-on products the admin tagged with this theme. */
  addons: BuilderProductOption[];
};

/**
 * Add-on products for a theme: products the admin marked "Add-on" and tagged with the theme.
 * They are grouped by theme only (not by service or category) and priced per child like other picks.
 */
async function loadThemeAddons(themeId: string): Promise<ChoiceProductRowWithMedia[]> {
  const rows = await prisma.product.findMany({
    where: { isAddon: true, isActive: true, deletedAt: null, themeTags: { some: { themeId } } },
    orderBy: [{ title: "asc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      sku: true,
      description: true,
      priceInPaise: true,
      minOrderQuantity: true,
      personalizationEnabled: true,
      personalizationCostInPaise: true,
      categoryTags: {
        select: { category: { select: { name: true, slug: true, displayOrder: true, isActive: true, celebrationStage: true } } },
      },
      images: { orderBy: { displayOrder: "asc" as const }, select: { media: true } },
      personalizationFields: { orderBy: { fieldKey: "asc" as const } },
    },
  });
  return rows as ChoiceProductRowWithMedia[];
}

/** Quote lines for the add-ons the customer picked — each must still be an add-on of this theme. */
async function addonLines(themeId: string, guestCount: number, sel: BuilderSelections): Promise<BuilderLineItem[]> {
  const skus = sel.addons ?? [];
  if (!skus.length) return [];
  if (new Set(skus).size !== skus.length) throw new ValidationError("Each add-on can only be added once");
  const available = await loadThemeAddons(themeId);
  return skus.map((sku) => {
    const product = available.find((p) => p.sku === sku);
    if (!product) {
      throw new ValidationError("One of your add-ons is no longer available for this theme. Please review your add-ons.");
    }
    return makeProductLine(guestCount, sel.personalization, {
      key: `addon-${sku}`,
      product,
      labelPrefix: "Add-on",
      section: "addon",
      isGroup: false,
    });
  });
}

/** Decor service slugs are fixed per tier (seeded); the matrix row carries price, copy and previews. */
function decorSlugs(tier: string) {
  const suffix = tier === "essential" ? "std" : tier === "signature" ? "prm" : "lux";
  return { jaipur: `decor-jaipur-${suffix}`, guide: `decor-guide-${suffix}` };
}

type ServiceWithPreview = {
  id: string;
  label: string;
  description: string | null;
  customizationPriceInPaise: number;
  hasPreview: boolean;
  previewMedia: Array<{ themeId: string; media: Parameters<typeof toMediaRef>[0] }>;
};

/** A service's preview files for one theme — empty unless the admin turned Preview on. */
function previewMediaOf(svc: ServiceWithPreview, themeId: string): MediaRef[] {
  if (!svc.hasPreview) return [];
  return svc.previewMedia
    .filter((m) => m.themeId === themeId)
    .map((m) => toMediaRef(m.media))
    .filter((m): m is MediaRef => m !== null);
}

function toDecorOption(svc: ServiceWithPreview | undefined, themeId: string): BuilderDecorOption | null {
  if (!svc) return null;
  return {
    serviceId: svc.id,
    label: svc.label,
    description: svc.description,
    priceInPaise: svc.customizationPriceInPaise,
    media: previewMediaOf(svc, themeId),
  };
}

/**
 * Everything the "Customize" step needs in a single request: the package's product-choice
 * services (as configured in the admin package matrix) with, for the chosen theme, the products
 * the admin allowed for each; the included services that carry a preview; and the decor option.
 * Cached; busted by any admin change.
 */
export async function getBuilderOptions(q: { theme: string; package: string }): Promise<BuilderOptions> {
  // "v3": the response became an object, and previews became per theme. The key is versioned so an older API instance sharing
  // this cache never reads the new shape (or the reverse) during a rollout.
  return cached(`pub:builder:options:v4:${q.package}:${q.theme}`, OPTIONS_TTL, async () => {
    const [pkg, theme] = await Promise.all([
      prisma.package.findFirst({
        where: { slug: q.package, deletedAt: null, isActive: true },
        select: {
          slug: true,
          serviceItems: {
            where: { extraService: { deletedAt: null, isActive: true } },
            orderBy: { displayOrder: "asc" },
            select: {
              isIncluded: true,
              extraService: {
                include: { previewMedia: { orderBy: { displayOrder: "asc" }, include: { media: true } } },
              },
            },
          },
        },
      }),
      prisma.theme.findFirst({
        where: { slug: q.theme, deletedAt: null, isActive: true },
        select: { id: true },
      }),
    ]);
    if (!pkg) throw new NotFoundError("Package not found");
    if (!theme) throw new NotFoundError("Theme not found");

    const included = pkg.serviceItems.filter((i) => i.isIncluded).map((i) => i.extraService);
    const services = included.filter((s) => s.isProductChoice);

    const previews: BuilderPreviewService[] = included
      .filter((s) => s.hasPreview && s.category !== "DECOR")
      .map((s) => ({
        serviceId: s.id,
        label: s.label,
        description: s.description,
        celebrationStage: s.celebrationStage,
        locationScope: s.locationScope,
        media: previewMediaOf(s, theme.id),
      }))
      .filter((p) => p.media.length > 0)
      .sort((a, b) => stageRank(a.celebrationStage) - stageRank(b.celebrationStage));

    // Decor rows are matched by slug whether or not the matrix box is ticked — same rule as the quote.
    const slugs = decorSlugs(pkg.slug);
    const bySlug = (slug: string) => pkg.serviceItems.find((i) => i.extraService.slug === slug)?.extraService;
    const decor = { jaipur: toDecorOption(bySlug(slugs.jaipur), theme.id), guide: toDecorOption(bySlug(slugs.guide), theme.id) };

    // Same lookup as the quote, so the step shows exactly what will be charged.
    const registryItem = pkg.serviceItems.find((i) => isGiftRegistryMatrixService(i.extraService));
    const giftRegistry = registryItem
      ? {
          included: registryItem.isIncluded,
          priceInPaise: registryItem.extraService.customizationPriceInPaise,
          description: registryItem.extraService.description,
        }
      : null;

    const productsBySvc = await loadServiceProducts(
      services.map((s) => s.id),
      theme.id,
      true,
    );

    const result: BuilderChoiceService[] = [];
    for (const svc of services) {
      const rows = (productsBySvc.get(svc.id) ?? []) as ChoiceProductRowWithMedia[];
      if (!rows.length) continue; // nothing configured for this theme → not required
      result.push({
        serviceId: svc.id,
        label: svc.label,
        description: svc.description,
        selectionCount: Math.min(svc.selectionCount, rows.length),
        isPerGroup: svc.isPerGroup,
        ...placeService(rows),
        products: rows.map((p) => toProductOption(p, isGroupPriced(svc, p.sku))),
      });
    }
    const addons = (await loadThemeAddons(theme.id)).map((p) => toProductOption(p, false));
    return { services: result.sort(byPlacement), previews, decor, giftRegistry, addons };
  });
}

export async function computeBuilderQuote(input: BuilderQuoteInput): Promise<BuilderQuoteResult> {
  if (input.guestCount < 5) {
    throw new ValidationError("Minimum 5 children per booking");
  }
  if (!["jaipur", "outside"].includes(input.location)) {
    throw new ValidationError("location must be jaipur or outside");
  }

  if (input.packageSlug === CUSTOM_PLAN_SLUG) return computeCustomPlanQuote(input);

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
    .filter((s) => !s.extraService.isProductChoice && s.extraService.pricingMode !== "PER_CHILD_CHOOSABLE")
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

  type LineProduct = ChoiceProductRow;

  function addProductLine(opts: {
    key: string;
    product: LineProduct;
    labelPrefix: string;
    section: BuilderLineItem["section"];
    isGroup: boolean;
    packageServiceItemId?: string;
  }) {
    lineItems.push(makeProductLine(input.guestCount, input.selections.personalization, opts));
  }

  /** Auto-assigned (not customer-chosen) products: packaging, thank-you tag. */
  async function addAutoProductLine(opts: {
    key: string;
    sku: string;
    labelPrefix: string;
    packageServiceItemId?: string;
  }) {
    const product = await prisma.product.findFirst({
      where: { sku: opts.sku, deletedAt: null, isActive: true },
    });
    if (!product) throw new ValidationError(`Product not found: ${opts.sku}`);

    const tiers = PRODUCT_TIER_MAP[product.sku] ?? [];
    if (!tiers.includes(input.packageSlug as "essential" | "signature" | "grand")) {
      throw new ValidationError(`Product ${opts.sku} is not available for ${input.packageSlug}`);
    }
    addProductLine({
      key: opts.key,
      product,
      labelPrefix: opts.labelPrefix,
      section: "auto",
      isGroup: PER_GROUP_SKUS.has(product.sku),
      packageServiceItemId: opts.packageServiceItemId,
    });
  }

  const sel = input.selections;
  const tier = input.packageSlug;

  // Admin-defined product-choice services (package matrix + per-theme product lists)
  const choicePsis = included.filter((s) => s.extraService.isProductChoice);
  if (choicePsis.length) {
    const productsBySvc = await loadServiceProducts(
      choicePsis.map((s) => s.extraService.id),
      theme.id,
      false,
    );
    const choices = resolveChoices(
      sel,
      choicePsis.map((s) => s.extraService),
    );

    for (const psi of choicePsis) {
      const svc = psi.extraService;
      const available = productsBySvc.get(svc.id) ?? [];
      const need = Math.min(svc.selectionCount, available.length);
      if (need === 0) continue; // nothing offered for this theme → nothing to pick

      const picked = choices[svc.id] ?? [];
      if (new Set(picked).size !== picked.length) {
        throw new ValidationError(`Please choose different options for ${svc.label}`);
      }
      if (picked.length !== need) {
        throw new ValidationError(
          need === 1 ? `Please choose 1 option for ${svc.label}` : `Please choose ${need} options for ${svc.label}`,
        );
      }

      for (const [i, sku] of picked.entries()) {
        const product = available.find((p) => p.sku === sku);
        if (!product) {
          throw new ValidationError(`"${sku}" is not available for ${svc.label} in this theme`);
        }
        const isGroup = isGroupPriced(svc, product.sku);
        addProductLine({
          key: `choice-${svc.id}-${i}`,
          product,
          labelPrefix: svc.label,
          section: isGroup ? "per-group" : "per-child",
          isGroup,
          packageServiceItemId: psi.id,
        });
      }
    }
  }

  // Auto packaging
  const packSku = AUTO_PACKAGING_SKU[tier];
  if (packSku) {
    await addAutoProductLine({ key: "packaging", sku: packSku, labelPrefix: "Packaging" });
  }

  // Auto thank-you tag
  const thankSku = AUTO_THANKYOU_SKU[tier];
  if (thankSku) {
    const thankPsi = psiBySlug("thankyou-tag");
    await addAutoProductLine({
      key: "thankyou",
      sku: thankSku,
      labelPrefix: "Thank-you tag",
      packageServiceItemId: thankPsi?.id,
    });
  }

  // Decor
  if (input.location === "jaipur") {
    const decorSlug = decorSlugs(tier).jaipur;
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
    const guideSlug = decorSlugs(tier).guide;
    const guide = pkg.serviceItems.find((s) => s.extraService.slug === guideSlug);
    if (guide) {
      includedLabels.push(guide.extraService.label);
    }
  }

  // Optional add-on products for this theme
  lineItems.push(...(await addonLines(theme.id, input.guestCount, sel)));

  const giftRegistryPsi = pkg.serviceItems.find(
    (s) =>
      s.extraService.isActive &&
      !s.extraService.deletedAt &&
      isGiftRegistryMatrixService(s.extraService),
  );

  const giftRegistryIncluded = giftRegistryPsi?.isIncluded ?? false;
  const giftRegistryCustomizePriceInPaise = giftRegistryPsi?.extraService.customizationPriceInPaise ?? 0;

  if (giftRegistryPsi) {
    if (giftRegistryIncluded) {
      // Included by default, no customization charge
      includedLabels.push(giftRegistryPsi.extraService.label);
    } else if (sel.giftRegistryCustomize && giftRegistryCustomizePriceInPaise > 0) {
      // Opted-in as an add-on for standard tier
      lineItems.push({
        key: "gift-registry-addon",
        label: giftRegistryPsi.extraService.label,
        sublabel: "Digital add-on",
        section: "fixed",
        packageServiceItemId: giftRegistryPsi.id,
        quantity: 1,
        unitPriceInPaise: giftRegistryCustomizePriceInPaise,
        lineTotalInPaise: giftRegistryCustomizePriceInPaise,
      });
    }
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

/* ─── Custom plan (à la carte) ─────────────────────────────────────────────
 * A custom celebration has no fixed package: the customer picks any products the
 * admin has configured (per service, per theme) across ALL packages. Every
 * product is priced with the same per-child / per-group / MOQ / personalization
 * rules as a package, there is no base price, and the result flows through the
 * normal PACKAGE-order pipeline (payment, invoice, email, WhatsApp, registry)
 * anchored to a hidden, inactive "custom-plan" package row.
 */

export const CUSTOM_PLAN_SLUG = "custom-plan";
export const CUSTOM_PLAN_TITLE = "Custom Celebration";

export type CustomPlanService = ServicePlacement & {
  serviceId: string;
  label: string;
  description: string | null;
  category: string | null;
  isPerGroup: boolean;
  /** Titles of the packages that include this service (informational). */
  packageTitles: string[];
  products: BuilderProductOption[];
};

/** A preview service sold on its own in the custom plan, shown with the chosen theme's images/videos. */
export type CustomPlanPreviewService = {
  serviceId: string;
  label: string;
  description: string | null;
  celebrationStage: string | null;
  /** The service's Customize price, charged once. */
  priceInPaise: number;
  media: MediaRef[];
};

export type CustomPlanOptions = {
  themeSlug: string;
  services: CustomPlanService[];
  /** Preview services that have a price and a preview for this theme. */
  previewServices: CustomPlanPreviewService[];
  /** Optional add-on products the admin tagged with this theme. */
  addons: BuilderProductOption[];
  giftRegistry: { available: boolean; label: string; description: string | null; priceInPaise: number };
};

/** The hidden package a custom order hangs off (created on first use). */
async function ensureCustomPlanPackage() {
  const existing = await prisma.package.findFirst({ where: { slug: CUSTOM_PLAN_SLUG } });
  if (existing) return existing;
  try {
    return await prisma.package.create({
      data: {
        title: CUSTOM_PLAN_TITLE,
        slug: CUSTOM_PLAN_SLUG,
        internalKey: CUSTOM_PLAN_SLUG,
        priceInPaise: 0,
        tierRank: 99,
        displayOrder: 99,
        isActive: false,
        isCustomizable: true,
        description: "Build-your-own celebration. Internal record — not shown as a public package.",
      },
    });
  } catch (err) {
    // Two first-time checkouts racing — the loser just reads the winner's row.
    const row = await prisma.package.findFirst({ where: { slug: CUSTOM_PLAN_SLUG } });
    if (row) return row;
    throw err;
  }
}

type CatalogService = {
  id: string;
  label: string;
  description: string | null;
  category: string | null;
  isPerGroup: boolean;
  isProductChoice: boolean;
  customizationPriceInPaise: number;
  slug: string | null;
};

/** Distinct product-choice services included in at least one active package, plus the gift-registry service. */
async function loadCustomPlanCatalog() {
  const packages = await prisma.package.findMany({
    where: { deletedAt: null, isActive: true, slug: { not: CUSTOM_PLAN_SLUG } },
    orderBy: [{ tierRank: "asc" }, { displayOrder: "asc" }],
    select: {
      title: true,
      serviceItems: {
        where: { isIncluded: true, extraService: { deletedAt: null, isActive: true } },
        orderBy: { displayOrder: "asc" },
        select: { extraService: true },
      },
    },
  });

  const services = new Map<string, { svc: CatalogService; packageTitles: string[] }>();
  let giftRegistry: CatalogService | null = null;
  for (const pkg of packages) {
    for (const { extraService: svc } of pkg.serviceItems) {
      if (isGiftRegistryMatrixService(svc)) {
        giftRegistry ??= svc;
        continue;
      }
      if (!svc.isProductChoice) continue;
      const entry = services.get(svc.id) ?? { svc, packageTitles: [] };
      entry.packageTitles.push(pkg.title);
      services.set(svc.id, entry);
    }
  }
  return { services, giftRegistry };
}

/**
 * Preview services a custom plan can buy for one theme: active, with Preview on, a Customize
 * price above zero (so nothing is given away), and at least one preview file for that theme.
 * Décor and the Gift Registry have their own handling and are left out.
 */
async function loadCustomPlanPreviewServices(themeId: string): Promise<CustomPlanPreviewService[]> {
  const rows = await prisma.extraService.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      hasPreview: true,
      customizationPriceInPaise: { gt: 0 },
      previewMedia: { some: { themeId } },
    },
    orderBy: [{ displayOrder: "asc" }, { label: "asc" }],
    include: { previewMedia: { where: { themeId }, orderBy: { displayOrder: "asc" }, include: { media: true } } },
  });
  return rows
    .filter((s) => s.category !== "DECOR" && !isGiftRegistryMatrixService(s))
    .map((s) => ({
      serviceId: s.id,
      label: s.label,
      description: s.description,
      celebrationStage: s.celebrationStage,
      priceInPaise: s.customizationPriceInPaise,
      media: s.previewMedia.map((m) => toMediaRef(m.media)).filter((m): m is MediaRef => m !== null),
    }))
    .filter((s) => s.media.length > 0)
    .sort((a, b) => stageRank(a.celebrationStage) - stageRank(b.celebrationStage));
}

/** Everything the custom-plan "Build" and "Add-ons" steps need for one theme. Cached; busted by any admin change. */
export async function getCustomPlanOptions(q: { theme: string }): Promise<CustomPlanOptions> {
  // "v2": products gained `images`; versioned for the same rollout reason as getBuilderOptions.
  return cached(`pub:builder:custom-options:v3:${q.theme}`, OPTIONS_TTL, async () => {
    const theme = await prisma.theme.findFirst({
      where: { slug: q.theme, deletedAt: null, isActive: true },
      select: { id: true, slug: true },
    });
    if (!theme) throw new NotFoundError("Theme not found");

    const { services, giftRegistry } = await loadCustomPlanCatalog();
    const productsBySvc = await loadServiceProducts([...services.keys()], theme.id, true);

    const result: CustomPlanService[] = [];
    for (const { svc, packageTitles } of services.values()) {
      const rows = (productsBySvc.get(svc.id) ?? []) as ChoiceProductRowWithMedia[];
      if (!rows.length) continue; // nothing configured for this theme
      result.push({
        serviceId: svc.id,
        label: svc.label,
        description: svc.description,
        category: svc.category,
        ...placeService(rows),
        isPerGroup: svc.isPerGroup,
        packageTitles,
        products: rows.map((p) => toProductOption(p, isGroupPriced(svc, p.sku))),
      });
    }
    result.sort(byPlacement);

    const [previewServices, addonRows] = await Promise.all([loadCustomPlanPreviewServices(theme.id), loadThemeAddons(theme.id)]);

    return {
      themeSlug: theme.slug,
      services: result,
      previewServices,
      addons: addonRows.map((p) => toProductOption(p, false)),
      giftRegistry: {
        available: Boolean(giftRegistry),
        label: "Gift Registry",
        description: giftRegistry?.description ?? null,
        priceInPaise: giftRegistry?.customizationPriceInPaise ?? 0,
      },
    };
  });
}

async function computeCustomPlanQuote(input: BuilderQuoteInput): Promise<BuilderQuoteResult> {
  const [customPkg, theme] = await Promise.all([
    ensureCustomPlanPackage(),
    prisma.theme.findFirst({ where: { slug: input.themeSlug, deletedAt: null, isActive: true } }),
  ]);
  if (!theme) throw new NotFoundError("Theme not found");

  const { services, giftRegistry } = await loadCustomPlanCatalog();
  const productsBySvc = await loadServiceProducts([...services.keys()], theme.id, false);

  const lineItems: BuilderLineItem[] = [
    {
      key: "base",
      label: `${CUSTOM_PLAN_TITLE} — ${theme.title}`,
      sublabel: "Build-your-own celebration",
      section: "package",
      quantity: 1,
      unitPriceInPaise: 0,
      lineTotalInPaise: 0,
    },
  ];

  const sel = input.selections;
  for (const [serviceId, skus] of Object.entries(sel.choices ?? {})) {
    if (!skus.length) continue;
    const entry = services.get(serviceId);
    const available = productsBySvc.get(serviceId) ?? [];
    if (!entry || !available.length) {
      throw new ValidationError("One of your selections is no longer available. Please review your choices.");
    }
    if (new Set(skus).size !== skus.length) {
      throw new ValidationError(`Please choose different options for ${entry.svc.label}`);
    }
    for (const [i, sku] of skus.entries()) {
      const product = available.find((p) => p.sku === sku);
      if (!product) {
        throw new ValidationError(`"${sku}" is not available for ${entry.svc.label} in this theme`);
      }
      const isGroup = isGroupPriced(entry.svc, product.sku);
      lineItems.push(
        makeProductLine(input.guestCount, sel.personalization, {
          key: `choice-${serviceId}-${i}`,
          product,
          labelPrefix: entry.svc.label,
          section: isGroup ? "per-group" : "per-child",
          isGroup,
        }),
      );
    }
  }

  // Preview services bought on their own, at their Customize price
  const serviceIds = sel.services ?? [];
  if (serviceIds.length) {
    if (new Set(serviceIds).size !== serviceIds.length) throw new ValidationError("Each service can only be added once");
    const offered = await loadCustomPlanPreviewServices(theme.id);
    for (const id of serviceIds) {
      const svc = offered.find((s) => s.serviceId === id);
      if (!svc) throw new ValidationError("One of your selections is no longer available for this theme. Please review your choices.");
      lineItems.push({
        key: `service-${id}`,
        label: svc.label,
        sublabel: "One-time",
        section: "fixed",
        quantity: 1,
        unitPriceInPaise: svc.priceInPaise,
        lineTotalInPaise: svc.priceInPaise,
      });
    }
  }

  // Optional add-on products for this theme
  lineItems.push(...(await addonLines(theme.id, input.guestCount, sel)));

  if (lineItems.length === 1) {
    throw new ValidationError("Choose at least one item to build your celebration");
  }

  const giftRegistryCustomizePriceInPaise = giftRegistry?.customizationPriceInPaise ?? 0;
  const giftRegistrySelected = Boolean(sel.giftRegistryCustomize);
  if (giftRegistrySelected) {
    if (!giftRegistry) throw new ValidationError("Gift Registry is not available right now");
    lineItems.push({
      key: "gift-registry-addon",
      label: "Gift Registry",
      sublabel: "Digital add-on",
      section: "fixed",
      quantity: 1,
      unitPriceInPaise: giftRegistryCustomizePriceInPaise,
      lineTotalInPaise: giftRegistryCustomizePriceInPaise,
    });
  }

  const customizationTotalInPaise = lineItems.reduce((sum, l) => sum + l.lineTotalInPaise, 0);
  const subtotalInPaise = customizationTotalInPaise;
  const shipping = await computeShippingForSubtotal(subtotalInPaise);
  const gstPercent = await getGstPercent();
  const taxable = subtotalInPaise + shipping.shippingInPaise;
  const gstInPaise = gstOn(taxable, gstPercent);

  return {
    packageId: customPkg.id,
    packageSlug: CUSTOM_PLAN_SLUG,
    packageTitle: CUSTOM_PLAN_TITLE,
    themeId: theme.id,
    themeSlug: theme.slug,
    themeTitle: theme.title,
    guestCount: input.guestCount,
    location: input.location,
    lineItems,
    basePriceInPaise: 0,
    customizationTotalInPaise,
    subtotalInPaise,
    shippingInPaise: shipping.shippingInPaise,
    shippingWaived: shipping.shippingWaived,
    freeShippingThresholdInPaise: shipping.freeShippingThresholdInPaise,
    amountUntilFreeShippingInPaise: shipping.amountUntilFreeShippingInPaise,
    gstPercent,
    gstInPaise,
    totalInPaise: taxable + gstInPaise,
    includedLabels: giftRegistrySelected ? ["Gift Registry"] : [],
    hasPersonalization: lineItems.some((l) => l.personalizationSelected),
    giftRegistryIncluded: giftRegistrySelected,
    giftRegistryCustomizePriceInPaise,
  };
}
