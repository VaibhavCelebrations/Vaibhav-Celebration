import { apiFetch } from "./api-client";

export type BuilderProduct = {
  id: string;
  title: string;
  slug: string;
  sku: string;
  description: string;
  priceInPaise: number;
  minOrderQuantity: number;
  pricingMode: "PER_CHILD" | "PER_GROUP";
  imageUrl: string | null;
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
  category: { name: string; slug: string; celebrationStage: CelebrationStage | null } | null;
};

/** Parent grouping of product categories (set per category in admin) — the Customize-step sections. */
export type CelebrationStage = "BEFORE" | "DURING" | "AFTER";

export const CELEBRATION_STAGES: CelebrationStage[] = ["BEFORE", "DURING", "AFTER"];

export const CELEBRATION_STAGE_LABELS: Record<CelebrationStage, string> = {
  BEFORE: "Before the Celebration",
  DURING: "During the Celebration",
  AFTER: "After the Celebration",
};

/** Where a service sits in the Customize step — derived from its products' categories. */
export type ServicePlacement = {
  celebrationStage: CelebrationStage | null;
  categoryName: string | null;
  categoryOrder: number;
};

/** A product-choice service from the admin package matrix, with the products allowed for the theme. */
export type BuilderChoiceService = ServicePlacement & {
  serviceId: string;
  label: string;
  description: string | null;
  /** How many products the customer must pick. */
  selectionCount: number;
  isPerGroup: boolean;
  products: BuilderProduct[];
};

/**
 * Split services into the Before / During / After sections (already ordered by the API).
 * Services whose products have no staged category go into a trailing "More options" group.
 */
export function groupByStage<T extends ServicePlacement>(services: T[]) {
  const groups: Array<{ stage: CelebrationStage | null; label: string; services: T[] }> = [];
  for (const stage of [...CELEBRATION_STAGES, null]) {
    const items = services.filter((s) => (s.celebrationStage ?? null) === stage);
    if (items.length) groups.push({ stage, label: stage ? CELEBRATION_STAGE_LABELS[stage] : "More Options", services: items });
  }
  return groups;
}

export type BuilderSelections = {
  /** ExtraService id → picked product SKUs. */
  choices?: Record<string, string[]>;
  /** @deprecated legacy slots, still accepted by the API for old carts. */
  welcomeItem?: string | null;
  activity1?: string | null;
  activity2?: string | null;
  returnGift?: string | null;
  familyActivity?: string | null;
  decor?: boolean;
  personalization?: Record<string, boolean>;
  giftRegistryCustomize?: boolean;
};

export type BuilderQuoteInput = {
  packageSlug: string;
  themeSlug: string;
  guestCount: number;
  location: "jaipur" | "outside";
  selections: BuilderSelections;
};

export type BuilderLineItem = {
  key: string;
  label: string;
  sublabel?: string;
  section: string;
  sku?: string;
  quantity: number;
  unitPriceInPaise: number;
  lineTotalInPaise: number;
  moqApplied?: boolean;
  personalizationSelected?: boolean;
  personalizationCostInPaise?: number;
};

export type BuilderQuote = {
  packageId: string;
  packageSlug: string;
  packageTitle: string;
  themeId: string;
  themeSlug: string;
  themeTitle: string;
  guestCount: number;
  location: "jaipur" | "outside";
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
  giftRegistryIncluded?: boolean;
  giftRegistryCustomizePriceInPaise?: number;
};

export async function getBuilderOptions(params: { theme: string; package: string }) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch<BuilderChoiceService[]>(`/builder/options?${qs}`);
}

export async function getBuilderQuote(input: BuilderQuoteInput) {
  return apiFetch<BuilderQuote>("/builder/quote", { method: "POST", body: input, cache: "no-store" });
}

/* ─── Custom plan (build your own celebration) ─────────────────────── */

/** Slug of the internal package a custom celebration is ordered under. */
export const CUSTOM_PLAN_SLUG = "custom-plan";

/** A product-choice service from any package, with the products the admin allowed for the theme. */
export type CustomPlanService = ServicePlacement & {
  serviceId: string;
  label: string;
  description: string | null;
  category: string | null;
  isPerGroup: boolean;
  packageTitles: string[];
  products: BuilderProduct[];
};

export type CustomPlanOptions = {
  themeSlug: string;
  services: CustomPlanService[];
  giftRegistry: { available: boolean; label: string; description: string | null; priceInPaise: number };
};

export async function getCustomPlanOptions(theme: string) {
  return apiFetch<CustomPlanOptions>(`/builder/custom-options?theme=${encodeURIComponent(theme)}`);
}
