/** SKU → package tiers that may select this product (mirrors seed) */
export declare const PRODUCT_TIER_MAP: Record<string, Array<"standard" | "premium" | "luxe">>;
export declare const AUTO_PACKAGING_SKU: Record<string, string>;
export declare const AUTO_THANKYOU_SKU: Record<string, string | null>;
export type BuilderLocation = "jaipur" | "outside";
export type BuilderSelections = {
    welcomeItem?: string | null;
    activity1?: string | null;
    activity2?: string | null;
    returnGift?: string | null;
    familyActivity?: string | null;
    decor?: boolean;
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
    gstPercent: number;
    gstInPaise: number;
    totalInPaise: number;
    includedLabels: string[];
};
export declare function listBuilderProducts(q: {
    theme: string;
    category: string;
    tier: string;
}): Promise<{
    id: string;
    title: string;
    slug: string;
    sku: string;
    description: string;
    priceInPaise: number;
    minOrderQuantity: number;
    pricingMode: "PER_CHILD" | "PER_GROUP";
    categories: {
        slug: string;
        name: string;
    }[];
    imageUrl: string | null;
}[]>;
export declare function computeBuilderQuote(input: BuilderQuoteInput): Promise<BuilderQuoteResult>;
