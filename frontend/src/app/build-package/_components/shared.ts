import { ClipboardCheck, CreditCard, Gift, PackagePlus, Palette } from "lucide-react";
import type { BuilderChoiceService, BuilderOptions, BuilderSelections } from "@/lib/builder-api";
import type { PackageCard, ThemeCard } from "@/lib/cms/types";
import { estimateLine, isDateWithin7Days } from "@/app/custom-plan/_components/shared";

export { formatEventDate, getTodayDateString, isDateWithin7Days, estimateLine } from "@/app/custom-plan/_components/shared";

export type BuilderLocation = "jaipur" | "outside";

/** Minimum / maximum children per booking — enforced again by the quote and order APIs. */
export const MIN_GUESTS = 5;
export const MAX_GUESTS = 200;

/**
 * The package journey. All but the last step live on this page; the last is /checkout, where
 * contact and delivery details are entered once.
 */
export const STEPS = [
  { label: "Theme & details", icon: Palette },
  { label: "Customize", icon: Gift },
  { label: "Add-ons", icon: PackagePlus },
  { label: "Review", icon: ClipboardCheck },
  { label: "Checkout", icon: CreditCard },
] as const;

export const STEP_BASICS = 0;
export const STEP_CUSTOMIZE = 1;
export const STEP_ADDONS = 2;
export const STEP_REVIEW = 3;

/** What the customer decides on the first step. */
export type Basics = {
  pkgSlug: string | null;
  themeSlug: string | null;
  guestCount: number;
  location: BuilderLocation;
  eventDate: string;
  /** Optional — used to name the gift registry and greet the family. */
  childName: string;
};

export type BasicsErrors = Partial<Record<"pkgSlug" | "themeSlug" | "guestCount" | "eventDate", string>>;

export function validateBasics(
  b: Basics,
  packagesBySlug: Record<string, PackageCard>,
  themesBySlug: Record<string, ThemeCard>,
): BasicsErrors {
  const e: BasicsErrors = {};
  if (!b.pkgSlug || !packagesBySlug[b.pkgSlug]) e.pkgSlug = "Choose a package";
  if (!b.themeSlug || !themesBySlug[b.themeSlug]) e.themeSlug = "Choose a theme";
  if (!Number.isFinite(b.guestCount) || b.guestCount < MIN_GUESTS) e.guestCount = `Minimum ${MIN_GUESTS} children per booking`;
  else if (b.guestCount > MAX_GUESTS) e.guestCount = `For more than ${MAX_GUESTS} children, please contact us`;
  if (!b.eventDate) e.eventDate = "Choose the celebration date";
  else if (isDateWithin7Days(b.eventDate)) e.eventDate = "Orders must be placed at least 7 days before the celebration date";
  return e;
}

/** Old links used "lux" for the top tier. */
export function normalizePackageSlug(value: string | null): string | null {
  if (!value) return null;
  return value === "lux" ? "grand" : value;
}

/** sessionStorage key for the parts of the draft that are not in the URL. */
export const DRAFT_KEY = "vc_builder_state";

export type Draft = { eventDate?: string; childName?: string; selections?: BuilderSelections };

/** Services that still need picks before the package can be priced. */
export function incompleteServices(services: BuilderChoiceService[], selections: BuilderSelections) {
  return services.filter((svc) => (selections.choices?.[svc.serviceId]?.length ?? 0) !== svc.selectionCount);
}

/** Drop picks the theme/package no longer offers, and opt-ins for products no longer picked. */
export function pruneSelections(selections: BuilderSelections, options: BuilderOptions): BuilderSelections {
  const choices: Record<string, string[]> = {};
  for (const svc of options.services) {
    const offered = new Set(svc.products.map((p) => p.sku));
    choices[svc.serviceId] = (selections.choices?.[svc.serviceId] ?? []).filter((sku) => offered.has(sku)).slice(0, svc.selectionCount);
  }
  const offeredAddons = new Set((options.addons ?? []).map((p) => p.sku));
  const addons = [...new Set(selections.addons ?? [])].filter((sku) => offeredAddons.has(sku));
  const picked = new Set([...Object.values(choices).flat(), ...addons]);
  const personalization = Object.fromEntries(
    Object.entries(selections.personalization ?? {}).filter(([sku, on]) => on && picked.has(sku)),
  );
  return { ...selections, choices, addons, personalization };
}

/**
 * Running figure shown before the server can price the package (choices incomplete): the package
 * price plus what has been picked so far. Excludes GST and delivery; the quote API is authoritative.
 */
export function estimateSubtotalInPaise(
  pkg: PackageCard | null | undefined,
  options: BuilderOptions | null,
  selections: BuilderSelections,
  guestCount: number,
  location: BuilderLocation,
): number | null {
  if (!pkg) return null;
  let total = Math.round(pkg.basePrice * 100);
  if (!options) return total;
  for (const svc of options.services) {
    for (const sku of selections.choices?.[svc.serviceId] ?? []) {
      const product = svc.products.find((p) => p.sku === sku);
      if (!product) continue;
      total += estimateLine(product, guestCount, product.pricingMode === "PER_GROUP", Boolean(selections.personalization?.[sku])).total;
    }
  }
  for (const sku of selections.addons ?? []) {
    const product = (options.addons ?? []).find((p) => p.sku === sku);
    if (product) total += estimateLine(product, guestCount, false, Boolean(selections.personalization?.[sku])).total;
  }
  if (selections.decor && location === "jaipur" && options.decor.jaipur) total += options.decor.jaipur.priceInPaise;
  if (selections.giftRegistryCustomize && options.giftRegistry && !options.giftRegistry.included) {
    total += options.giftRegistry.priceInPaise;
  }
  return total;
}
