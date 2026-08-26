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
  categories: Array<{ slug: string; name: string }>;
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
  stockAvailable: number;
};

export type BuilderSelections = {
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
  packageSlug: "essential" | "signature" | "grand";
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

export async function listBuilderProducts(params: {
  theme: string;
  category: string;
  tier: string;
}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch<BuilderProduct[]>(`/builder/products?${qs}`, { cache: "no-store" });
}

export async function getBuilderQuote(input: BuilderQuoteInput) {
  return apiFetch<BuilderQuote>("/builder/quote", { method: "POST", body: input, cache: "no-store" });
}
