import { apiFetch } from "./api-client";

export type PublicExtraService = {
  id: string;
  label: string;
  description: string | null;
  requirements: string | null;
  customizationPriceInPaise: number;
};

export type PublicPackageServiceItem = {
  id: string;
  extraServiceId: string;
  isIncluded: boolean;
  displayOrder: number;
  extraService: PublicExtraService;
};

export type PublicPackage = {
  id: string;
  title: string;
  slug: string;
  priceInPaise: number;
  tierRank: number;
  isRecommended: boolean;
  isActive: boolean;
  isCustomizable: boolean;
  displayOrder: number;
  description: string | null;
  serviceItems: PublicPackageServiceItem[];
};

export async function fetchPublicPackages(): Promise<PublicPackage[]> {
  return apiFetch<PublicPackage[]>("/packages", { next: { revalidate: 60 } });
}

export type QuoteResult = {
  packageId: string;
  packageTitle: string;
  basePriceInPaise: number;
  customizationTotalInPaise: number;
  subtotalInPaise: number;
  gstPercent: number;
  gstInPaise: number;
  totalInPaise: number;
  includedServices: Array<{ label: string; extraServiceId: string }>;
  availableCustomizations: Array<{
    optionId: string;
    label: string;
    customizationPriceInPaise: number;
  }>;
  options: Array<{
    optionId: string;
    label: string;
    quantity: number;
    unitPriceInPaise: number;
    lineTotalInPaise: number;
  }>;
};

export async function fetchQuote(input: {
  packageId: string;
  themeId?: string;
  selectedOptions?: Array<{ optionId: string; quantity: number }>;
}): Promise<QuoteResult> {
  return apiFetch<QuoteResult>("/pricing/quote", {
    method: "POST",
    body: input,
    cache: "no-store",
  });
}

export function formatINR(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}
