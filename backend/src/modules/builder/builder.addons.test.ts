import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Add-on products and individually bought preview services in a custom-plan quote.
 * Prisma and settings are mocked: this file never touches a database.
 */
const mocks = vi.hoisted(() => ({
  packageFindFirst: vi.fn(),
  packageFindMany: vi.fn(),
  themeFindFirst: vi.fn(),
  serviceProductFindMany: vi.fn(),
  productFindMany: vi.fn(),
  extraServiceFindMany: vi.fn(),
}));

vi.mock("../../db/prisma", () => ({
  prisma: {
    package: { findFirst: mocks.packageFindFirst, findMany: mocks.packageFindMany, create: vi.fn() },
    theme: { findFirst: mocks.themeFindFirst },
    serviceProduct: { findMany: mocks.serviceProductFindMany },
    product: { findMany: mocks.productFindMany },
    extraService: { findMany: mocks.extraServiceFindMany },
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

const addon = (over: Record<string, unknown> = {}) => ({
  id: "a1",
  title: "Balloon Set",
  slug: "balloon-set",
  sku: "ADD-BALLOON",
  description: "",
  priceInPaise: 5_000,
  minOrderQuantity: 1,
  personalizationEnabled: true,
  personalizationCostInPaise: 1_000,
  categoryTags: [],
  images: [],
  personalizationFields: [],
  ...over,
});

const previewService = (over: Record<string, unknown> = {}) => ({
  id: "svcInvite",
  label: "Video Invite",
  description: null,
  category: "DIGITAL",
  slug: "digital-invite-vid",
  celebrationStage: "BEFORE",
  customizationPriceInPaise: 49_900,
  previewMedia: [{ media: { id: "m1", url: "https://cdn/x.mp4", altText: null, type: "video/mp4", width: null, height: null, deletedAt: null } }],
  ...over,
});

const base = { packageSlug: CUSTOM_PLAN_SLUG, themeSlug: "space", guestCount: 10, location: "jaipur" as const };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.themeFindFirst.mockResolvedValue({ id: "theme1", slug: "space", title: "Space" });
  mocks.packageFindFirst.mockResolvedValue({ id: "customPkg", slug: CUSTOM_PLAN_SLUG });
  mocks.packageFindMany.mockResolvedValue([]);
  mocks.serviceProductFindMany.mockResolvedValue([]);
  mocks.productFindMany.mockResolvedValue([addon()]);
  mocks.extraServiceFindMany.mockResolvedValue([previewService()]);
});

describe("add-ons and preview services in a custom plan", () => {
  it("prices an add-on per child and asks only for this theme's add-on products", async () => {
    const quote = await computeBuilderQuote({ ...base, selections: { addons: ["ADD-BALLOON"] } });

    const line = quote.lineItems.find((l) => l.key === "addon-ADD-BALLOON");
    expect(line).toMatchObject({ section: "addon", quantity: 10, unitPriceInPaise: 5_000, lineTotalInPaise: 50_000 });
    expect(mocks.productFindMany.mock.calls[0][0].where).toMatchObject({
      isAddon: true,
      isActive: true,
      themeTags: { some: { themeId: "theme1" } },
    });
  });

  it("adds the personalization charge to an add-on when opted in", async () => {
    const quote = await computeBuilderQuote({
      ...base,
      selections: { addons: ["ADD-BALLOON"], personalization: { "ADD-BALLOON": true } },
    });
    expect(quote.lineItems.find((l) => l.key === "addon-ADD-BALLOON")).toMatchObject({
      unitPriceInPaise: 6_000,
      lineTotalInPaise: 60_000,
      personalizationSelected: true,
    });
    expect(quote.hasPersonalization).toBe(true);
  });

  it("applies the add-on's minimum order quantity", async () => {
    mocks.productFindMany.mockResolvedValue([addon({ minOrderQuantity: 25 })]);
    const quote = await computeBuilderQuote({ ...base, selections: { addons: ["ADD-BALLOON"] } });
    expect(quote.lineItems.find((l) => l.key === "addon-ADD-BALLOON")).toMatchObject({ quantity: 25, moqApplied: true });
  });

  it("rejects an add-on that is not offered for the theme", async () => {
    await expect(computeBuilderQuote({ ...base, selections: { addons: ["SOMETHING-ELSE"] } })).rejects.toThrow(/no longer available for this theme/);
  });

  it("rejects the same add-on twice", async () => {
    await expect(computeBuilderQuote({ ...base, selections: { addons: ["ADD-BALLOON", "ADD-BALLOON"] } })).rejects.toThrow(/only be added once/);
  });

  it("charges a preview service once at its Customize price, for this theme only", async () => {
    const quote = await computeBuilderQuote({ ...base, selections: { services: ["svcInvite"] } });

    expect(quote.lineItems.find((l) => l.key === "service-svcInvite")).toMatchObject({
      label: "Video Invite",
      section: "fixed",
      quantity: 1,
      lineTotalInPaise: 49_900,
    });
    expect(quote.subtotalInPaise).toBe(49_900);
    expect(mocks.extraServiceFindMany.mock.calls[0][0].where).toMatchObject({
      hasPreview: true,
      customizationPriceInPaise: { gt: 0 },
      previewMedia: { some: { themeId: "theme1" } },
    });
  });

  it("rejects a service that has no preview for the theme", async () => {
    mocks.extraServiceFindMany.mockResolvedValue([]);
    await expect(computeBuilderQuote({ ...base, selections: { services: ["svcInvite"] } })).rejects.toThrow(/no longer available for this theme/);
  });

  it("still requires at least one item", async () => {
    await expect(computeBuilderQuote({ ...base, selections: {} })).rejects.toThrow(/at least one item/);
  });
});
