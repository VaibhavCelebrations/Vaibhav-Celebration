import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  packageFindFirst: vi.fn(),
  packageFindMany: vi.fn(),
  themeFindFirst: vi.fn(),
  serviceProductFindMany: vi.fn(),
}));

vi.mock("../../db/prisma", () => ({
  prisma: {
    package: { findFirst: mocks.packageFindFirst, findMany: mocks.packageFindMany, create: vi.fn() },
    theme: { findFirst: mocks.themeFindFirst },
    serviceProduct: { findMany: mocks.serviceProductFindMany },
  },
}));

vi.mock("../../lib/settings", () => ({
  getGstPercent: async () => 18,
  gstOn: (amount: number, pct: number) => Math.round((amount * pct) / 100),
  computeShippingForSubtotal: async (subtotal: number) => ({
    shippingInPaise: subtotal >= 299_900 ? 0 : 19_900,
    shippingWaived: subtotal >= 299_900,
    freeShippingThresholdInPaise: 299_900,
    amountUntilFreeShippingInPaise: Math.max(0, 299_900 - subtotal),
  }),
}));

import { CUSTOM_PLAN_SLUG, computeBuilderQuote } from "./builder.service";

const service = (over: Record<string, unknown>) => ({
  id: "svcA",
  label: "Return Gift",
  description: null,
  category: "RETURN_GIFT",
  slug: null,
  isProductChoice: true,
  isPerGroup: false,
  customizationPriceInPaise: 0,
  ...over,
});

const product = (over: Record<string, unknown>) => ({
  id: "p1",
  title: "Lunchbox",
  slug: "lunchbox",
  sku: "SKU-LUNCH",
  description: "",
  priceInPaise: 10_000,
  minOrderQuantity: 1,
  personalizationEnabled: false,
  personalizationCostInPaise: 0,
  ...over,
});

const base = { packageSlug: CUSTOM_PLAN_SLUG, themeSlug: "t", guestCount: 10, location: "jaipur" as const };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.themeFindFirst.mockResolvedValue({ id: "theme1", slug: "t", title: "Space" });
  // ensureCustomPlanPackage → existing hidden row
  mocks.packageFindFirst.mockResolvedValue({ id: "customPkg", slug: CUSTOM_PLAN_SLUG });
  // The same choice service is included by two packages — must be offered once.
  mocks.packageFindMany.mockResolvedValue([
    {
      title: "Essential",
      serviceItems: [
        { extraService: service({}) },
        { extraService: service({ id: "svcGroup", label: "Bingo", isPerGroup: true, category: "CHILDREN_ACTIVITY" }) },
      ],
    },
    {
      title: "Signature",
      serviceItems: [
        { extraService: service({}) },
        { extraService: service({ id: "gr", label: "Gift Registry", slug: "gift-registry", category: "GIFT_REGISTRY", isProductChoice: false, customizationPriceInPaise: 50_000 }) },
      ],
    },
  ]);
  mocks.serviceProductFindMany.mockResolvedValue([
    { extraServiceId: "svcA", product: product({}) },
    { extraServiceId: "svcA", product: product({ id: "p2", sku: "SKU-PERS", title: "Tee", priceInPaise: 20_000, personalizationEnabled: true, personalizationCostInPaise: 5_000 }) },
    { extraServiceId: "svcA", product: product({ id: "p3", sku: "SKU-BULK", title: "Bulk", priceInPaise: 1_000, minOrderQuantity: 25 }) },
    { extraServiceId: "svcGroup", product: product({ id: "p4", sku: "SKU-BINGO", title: "Bingo Set", priceInPaise: 30_000 }) },
  ]);
});

describe("custom plan quote", () => {
  it("prices per-child, per-group, MOQ and personalization with no base price", async () => {
    const q = await computeBuilderQuote({
      ...base,
      selections: {
        choices: { svcA: ["SKU-LUNCH", "SKU-PERS", "SKU-BULK"], svcGroup: ["SKU-BINGO"] },
        personalization: { "SKU-PERS": true },
      },
    });

    const line = (sku: string) => q.lineItems.find((l) => l.sku === sku)!;
    expect(line("SKU-LUNCH")).toMatchObject({ quantity: 10, lineTotalInPaise: 100_000, section: "per-child" });
    expect(line("SKU-PERS")).toMatchObject({ quantity: 10, unitPriceInPaise: 25_000, lineTotalInPaise: 250_000, personalizationSelected: true });
    expect(line("SKU-BULK")).toMatchObject({ quantity: 25, lineTotalInPaise: 25_000, moqApplied: true });
    expect(line("SKU-BINGO")).toMatchObject({ quantity: 1, lineTotalInPaise: 30_000, section: "per-group" });

    expect(q.packageSlug).toBe(CUSTOM_PLAN_SLUG);
    expect(q.basePriceInPaise).toBe(0);
    expect(q.subtotalInPaise).toBe(405_000);
    expect(q.shippingWaived).toBe(true);
    expect(q.gstInPaise).toBe(72_900);
    expect(q.totalInPaise).toBe(477_900);
    expect(q.hasPersonalization).toBe(true);
    expect(q.giftRegistryIncluded).toBe(false);
  });

  it("adds the gift registry add-on at the admin price and flags it included", async () => {
    const q = await computeBuilderQuote({
      ...base,
      selections: { choices: { svcA: ["SKU-LUNCH"] }, giftRegistryCustomize: true },
    });
    const gr = q.lineItems.find((l) => l.key === "gift-registry-addon")!;
    expect(gr).toMatchObject({ label: "Gift Registry", lineTotalInPaise: 50_000, section: "fixed" });
    expect(q.giftRegistryIncluded).toBe(true);
    expect(q.subtotalInPaise).toBe(150_000);
    expect(q.shippingInPaise).toBe(19_900);
  });

  it("ignores personalization opt-in for products that are not customizable", async () => {
    const q = await computeBuilderQuote({
      ...base,
      selections: { choices: { svcA: ["SKU-LUNCH"] }, personalization: { "SKU-LUNCH": true } },
    });
    expect(q.hasPersonalization).toBe(false);
    expect(q.subtotalInPaise).toBe(100_000);
  });

  it("rejects an empty plan, unknown SKUs and services not offered", async () => {
    await expect(computeBuilderQuote({ ...base, selections: { choices: {} } })).rejects.toThrow(/at least one item/i);
    await expect(computeBuilderQuote({ ...base, selections: { choices: { svcA: ["NOPE"] } } })).rejects.toThrow(/not available/i);
    await expect(computeBuilderQuote({ ...base, selections: { choices: { ghost: ["SKU-LUNCH"] } } })).rejects.toThrow(/no longer available/i);
    await expect(computeBuilderQuote({ ...base, selections: { choices: { svcA: ["SKU-LUNCH", "SKU-LUNCH"] } } })).rejects.toThrow(/different options/i);
  });

  it("enforces the 5-children minimum", async () => {
    await expect(
      computeBuilderQuote({ ...base, guestCount: 3, selections: { choices: { svcA: ["SKU-LUNCH"] } } }),
    ).rejects.toThrow(/Minimum 5/);
  });
});
