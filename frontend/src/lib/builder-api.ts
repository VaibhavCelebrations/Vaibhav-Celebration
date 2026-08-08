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
};

export type BuilderSelections = {
  welcomeItem?: string | null;
  activity1?: string | null;
  activity2?: string | null;
  returnGift?: string | null;
  familyActivity?: string | null;
  decor?: boolean;
};

export type BuilderQuoteInput = {
  packageSlug: "standard" | "premium" | "luxe";
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
  gstPercent: number;
  gstInPaise: number;
  totalInPaise: number;
  includedLabels: string[];
};

export type BuilderBookingResult = {
  bookingCode: string;
  razorpayOrderId: string;
  razorpayKeyId: string;
  amountInPaise: number;
  currency: string;
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

export async function createBuilderBooking(input: {
  eventDate: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  builder: BuilderQuoteInput;
}) {
  return apiFetch<BuilderBookingResult>("/bookings", {
    method: "POST",
    body: input,
    cache: "no-store",
  });
}
