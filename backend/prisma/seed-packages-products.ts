/**
 * Additive seed for package builder catalog.
 * NEVER calls clearDevData — safe to re-run via: npm run db:seed:packages
 */
import {
  ExtraServiceCategory,
  LocationScope,
  PricingMode,
  PrismaClient,
} from "@prisma/client";

const prisma = new PrismaClient();

type ServiceDef = {
  slug: string;
  label: string;
  description: string;
  category: ExtraServiceCategory;
  pricingMode: PricingMode;
  locationScope: LocationScope;
  choiceCount: number | null;
  customizationPriceInPaise: number;
  displayOrder: number;
  /** which package slugs include this service */
  tiers: Array<"standard" | "premium" | "luxe">;
};

const SERVICES: ServiceDef[] = [
  {
    slug: "digital-invite-std",
    label: "Static / Minimal Animated Invite",
    description: "Static or minimal animated digital invitation",
    category: "DIGITAL",
    pricingMode: "FIXED",
    locationScope: "ALL",
    choiceCount: null,
    customizationPriceInPaise: 0,
    displayOrder: 1,
    tiers: ["standard"],
  },
  {
    slug: "digital-invite-vid",
    label: "Premium Animated / Video Invite",
    description: "Premium animated or video invitation",
    category: "DIGITAL",
    pricingMode: "FIXED",
    locationScope: "ALL",
    choiceCount: null,
    customizationPriceInPaise: 0,
    displayOrder: 2,
    tiers: ["premium", "luxe"],
  },
  {
    slug: "reminder-one",
    label: "Celebration Reminder",
    description: "One celebration reminder message",
    category: "DIGITAL",
    pricingMode: "FIXED",
    locationScope: "ALL",
    choiceCount: null,
    customizationPriceInPaise: 0,
    displayOrder: 3,
    tiers: ["standard"],
  },
  {
    slug: "countdown-3",
    label: "Countdown Cards ×3",
    description: "Three countdown cards",
    category: "DIGITAL",
    pricingMode: "PER_CARD",
    locationScope: "ALL",
    choiceCount: 3,
    customizationPriceInPaise: 15000, // ₹150 per card
    displayOrder: 4,
    tiers: ["premium"],
  },
  {
    slug: "countdown-5",
    label: "Countdown Cards ×5",
    description: "Five countdown cards",
    category: "DIGITAL",
    pricingMode: "PER_CARD",
    locationScope: "ALL",
    choiceCount: 5,
    customizationPriceInPaise: 15000,
    displayOrder: 5,
    tiers: ["luxe"],
  },
  {
    slug: "brief-pdf",
    label: "Parent Party Brief PDF",
    description: "Parent party brief as PDF",
    category: "DIGITAL",
    pricingMode: "FIXED",
    locationScope: "ALL",
    choiceCount: null,
    customizationPriceInPaise: 0,
    displayOrder: 6,
    tiers: ["premium"],
  },
  {
    slug: "brief-animated",
    label: "Animated Parent Party Brief",
    description: "Animated parent party brief",
    category: "DIGITAL",
    pricingMode: "FIXED",
    locationScope: "ALL",
    choiceCount: null,
    customizationPriceInPaise: 0,
    displayOrder: 7,
    tiers: ["luxe"],
  },
  {
    slug: "photo-1",
    label: "Highlight Picture",
    description: "1 edited highlight picture",
    category: "DIGITAL",
    pricingMode: "FIXED",
    locationScope: "ALL",
    choiceCount: null,
    customizationPriceInPaise: 0,
    displayOrder: 8,
    tiers: ["standard"],
  },
  {
    slug: "photo-3",
    label: "Edited Highlight Pictures ×3",
    description: "3 edited highlight pictures",
    category: "DIGITAL",
    pricingMode: "FIXED",
    locationScope: "ALL",
    choiceCount: null,
    customizationPriceInPaise: 0,
    displayOrder: 9,
    tiers: ["premium"],
  },
  {
    slug: "keepsake-7",
    label: "Animated Seven-page Keepsake PDF",
    description: "7-page keepsake PDF",
    category: "KEEPSAKE",
    pricingMode: "FIXED",
    locationScope: "ALL",
    choiceCount: null,
    customizationPriceInPaise: 0,
    displayOrder: 10,
    tiers: ["luxe"],
  },
  {
    slug: "gift-registry",
    label: "Gift Registry Access",
    description: "Gift registry access",
    category: "GIFT_REGISTRY",
    pricingMode: "FIXED",
    locationScope: "ALL",
    choiceCount: null,
    customizationPriceInPaise: 0,
    displayOrder: 11,
    tiers: ["premium", "luxe"],
  },
  {
    slug: "consultation-priority",
    label: "Priority Consultation",
    description: "Priority consultation booking",
    category: "CONSULTATION",
    pricingMode: "FIXED",
    locationScope: "ALL",
    choiceCount: null,
    customizationPriceInPaise: 0,
    displayOrder: 12,
    tiers: ["luxe"],
  },
  {
    slug: "personalization-basic",
    label: "Basic Personalization",
    description: "Basic personalization of package elements",
    category: "PERSONALIZATION",
    pricingMode: "FIXED",
    locationScope: "ALL",
    choiceCount: null,
    customizationPriceInPaise: 0,
    displayOrder: 13,
    tiers: ["standard"],
  },
  {
    slug: "personalization-moderate",
    label: "Moderate Personalization",
    description: "Moderate personalization of package elements",
    category: "PERSONALIZATION",
    pricingMode: "FIXED",
    locationScope: "ALL",
    choiceCount: null,
    customizationPriceInPaise: 0,
    displayOrder: 14,
    tiers: ["premium"],
  },
  {
    slug: "personalization-high",
    label: "High Personalization",
    description: "High personalization of package elements",
    category: "PERSONALIZATION",
    pricingMode: "FIXED",
    locationScope: "ALL",
    choiceCount: null,
    customizationPriceInPaise: 0,
    displayOrder: 15,
    tiers: ["luxe"],
  },
  {
    slug: "activity-choose-1",
    label: "Children Activity (choose 1)",
    description: "Choose 1 children activity — priced per selected product × children",
    category: "CHILDREN_ACTIVITY",
    pricingMode: "PER_CHILD_CHOOSABLE",
    locationScope: "ALL",
    choiceCount: 1,
    customizationPriceInPaise: 0,
    displayOrder: 16,
    tiers: ["standard"],
  },
  {
    slug: "activity-choose-2",
    label: "Children Activities (choose 2)",
    description: "Choose 2 children activities — both priced × children",
    category: "CHILDREN_ACTIVITY",
    pricingMode: "PER_CHILD_CHOOSABLE",
    locationScope: "ALL",
    choiceCount: 2,
    customizationPriceInPaise: 0,
    displayOrder: 17,
    tiers: ["premium", "luxe"],
  },
  {
    slug: "welcome-item-1",
    label: "Welcome Item (choose 1)",
    description: "Choose 1 welcome item per child",
    category: "WELCOME_ITEM",
    pricingMode: "PER_CHILD_CHOOSABLE",
    locationScope: "ALL",
    choiceCount: 1,
    customizationPriceInPaise: 0,
    displayOrder: 18,
    tiers: ["premium", "luxe"],
  },
  {
    slug: "return-gift-1",
    label: "Return Gift (choose 1)",
    description: "Choose 1 return gift — priced × children",
    category: "RETURN_GIFT",
    pricingMode: "PER_CHILD_CHOOSABLE",
    locationScope: "ALL",
    choiceCount: 1,
    customizationPriceInPaise: 0,
    displayOrder: 19,
    tiers: ["standard", "premium", "luxe"],
  },
  {
    slug: "family-activity-1",
    label: "Family Activity (choose 1)",
    description: "Choose 1 family activity — per group",
    category: "FAMILY_ACTIVITY",
    pricingMode: "PER_CHILD_CHOOSABLE",
    locationScope: "ALL",
    choiceCount: 1,
    customizationPriceInPaise: 0,
    displayOrder: 20,
    tiers: ["luxe"],
  },
  {
    slug: "thankyou-tag",
    label: "Personalized Thank-you Tag",
    description: "Auto-included thank-you tag per child (Luxe)",
    category: "THANK_YOU_TAG",
    pricingMode: "PER_CHILD",
    locationScope: "ALL",
    choiceCount: null,
    customizationPriceInPaise: 0,
    displayOrder: 21,
    tiers: ["luxe"],
  },
  {
    slug: "decor-jaipur-std",
    label: "Decor — Jaipur Standard",
    description: "Theme décor through Jaipur vendor (Standard)",
    category: "DECOR",
    pricingMode: "FIXED",
    locationScope: "JAIPUR_ONLY",
    choiceCount: null,
    customizationPriceInPaise: 500000, // ₹5,000
    displayOrder: 22,
    tiers: ["standard"],
  },
  {
    slug: "decor-jaipur-prm",
    label: "Decor — Jaipur Premium",
    description: "Theme décor through Jaipur vendor (Premium)",
    category: "DECOR",
    pricingMode: "FIXED",
    locationScope: "JAIPUR_ONLY",
    choiceCount: null,
    customizationPriceInPaise: 1000000, // ₹10,000
    displayOrder: 23,
    tiers: ["premium"],
  },
  {
    slug: "decor-jaipur-lux",
    label: "Decor — Jaipur Luxe",
    description: "Theme décor through Jaipur vendor (Luxe)",
    category: "DECOR",
    pricingMode: "FIXED",
    locationScope: "JAIPUR_ONLY",
    choiceCount: null,
    customizationPriceInPaise: 2000000, // ₹20,000
    displayOrder: 24,
    tiers: ["luxe"],
  },
  {
    slug: "decor-guide-std",
    label: "Basic Decor Guide (Outside Jaipur)",
    description: "Free basic décor guide for celebrations outside Jaipur",
    category: "DECOR",
    pricingMode: "FIXED",
    locationScope: "OUTSIDE_JAIPUR",
    choiceCount: null,
    customizationPriceInPaise: 0,
    displayOrder: 25,
    tiers: ["standard"],
  },
  {
    slug: "decor-guide-prm",
    label: "Detailed Decor Guide (Outside Jaipur)",
    description: "Free detailed décor guide for celebrations outside Jaipur",
    category: "DECOR",
    pricingMode: "FIXED",
    locationScope: "OUTSIDE_JAIPUR",
    choiceCount: null,
    customizationPriceInPaise: 0,
    displayOrder: 26,
    tiers: ["premium"],
  },
  {
    slug: "decor-guide-lux",
    label: "Premium Luxe Decor Guide (Outside Jaipur)",
    description: "Free premium décor guide for celebrations outside Jaipur",
    category: "DECOR",
    pricingMode: "FIXED",
    locationScope: "OUTSIDE_JAIPUR",
    choiceCount: null,
    customizationPriceInPaise: 0,
    displayOrder: 27,
    tiers: ["luxe"],
  },
];

type ProductDef = {
  sku: string;
  title: string;
  slug: string;
  description: string;
  categorySlug: string;
  priceInPaise: number;
  minOrderQuantity: number;
  pricingHint: "per-child" | "per-group";
  /** which package tiers can select this product */
  tiers: Array<"standard" | "premium" | "luxe">;
  /** auto-assigned packaging / thank-you (not user-choosable) */
  autoForTier?: "standard" | "premium" | "luxe";
};

const SPACE_PRODUCTS: ProductDef[] = [
  {
    sku: "SP-WEL-BDG",
    title: "Space Badge",
    slug: "space-badge",
    description: "Theme welcome badge for each child",
    categorySlug: "welcome-items",
    priceInPaise: 5000,
    minOrderQuantity: 5,
    pricingHint: "per-child",
    tiers: ["premium", "luxe"],
  },
  {
    sku: "SP-WEL-HDB",
    title: "Personalised Wristband",
    slug: "space-wristband",
    description: "Personalised space theme wristband",
    categorySlug: "welcome-items",
    priceInPaise: 3000,
    minOrderQuantity: 5,
    pricingHint: "per-child",
    tiers: ["premium", "luxe"],
  },
  {
    sku: "SP-WEL-ID",
    title: "Space ID Card",
    slug: "space-id-card",
    description: "Space theme ID card for each child",
    categorySlug: "welcome-items",
    priceInPaise: 5000,
    minOrderQuantity: 5,
    pricingHint: "per-child",
    tiers: ["premium", "luxe"],
  },
  {
    sku: "SP-WEL-QR",
    title: "QR Space ID Card",
    slug: "qr-space-id-card",
    description: "QR-enabled space ID card",
    categorySlug: "welcome-items",
    priceInPaise: 6000,
    minOrderQuantity: 5,
    pricingHint: "per-child",
    tiers: ["luxe"],
  },
  {
    sku: "SP-ACT-HDG",
    title: "Astronaut Headgear",
    slug: "astronaut-headgear",
    description: "Astronaut headgear activity",
    categorySlug: "children-activities",
    priceInPaise: 8000,
    minOrderQuantity: 5,
    pricingHint: "per-child",
    tiers: ["standard", "premium", "luxe"],
  },
  {
    sku: "SP-ACT-PUZ",
    title: "Space Puzzle",
    slug: "space-puzzle",
    description: "Space theme puzzle activity",
    categorySlug: "children-activities",
    priceInPaise: 5000,
    minOrderQuantity: 5,
    pricingHint: "per-child",
    tiers: ["standard", "premium", "luxe"],
  },
  {
    sku: "SP-ACT-BNG",
    title: "Space Bingo",
    slug: "space-bingo",
    description: "Space bingo — priced per group",
    categorySlug: "children-activities",
    priceInPaise: 19900,
    minOrderQuantity: 10,
    pricingHint: "per-group",
    tiers: ["standard", "premium", "luxe"],
  },
  {
    sku: "SP-FAM-BNG",
    title: "Cosmic Family Bingo",
    slug: "cosmic-family-bingo",
    description: "Family activity — cosmic bingo per group",
    categorySlug: "family-activities",
    priceInPaise: 19900,
    minOrderQuantity: 10,
    pricingHint: "per-group",
    tiers: ["luxe"],
  },
  {
    sku: "SP-RG-STAT",
    title: "Space Stationery Set",
    slug: "space-stationery-set",
    description: "Space theme stationery return gift",
    categorySlug: "return-gifts",
    priceInPaise: 12000,
    minOrderQuantity: 5,
    pricingHint: "per-child",
    tiers: ["standard", "premium", "luxe"],
  },
  {
    sku: "SP-RG-LBOX",
    title: "Space Lunchbox",
    slug: "space-lunchbox",
    description: "Space theme lunchbox return gift",
    categorySlug: "return-gifts",
    priceInPaise: 15000,
    minOrderQuantity: 5,
    pricingHint: "per-child",
    tiers: ["standard", "premium", "luxe"],
  },
  {
    sku: "SP-RG-BAG",
    title: "Space Mini Backpack",
    slug: "space-mini-backpack",
    description: "Space mini backpack — premium upgrade gift",
    categorySlug: "return-gifts",
    priceInPaise: 23000,
    minOrderQuantity: 5,
    pricingHint: "per-child",
    tiers: ["premium", "luxe"],
  },
  {
    sku: "SP-PACK-BAS",
    title: "Simple Packaging",
    slug: "simple-packaging",
    description: "Simple packaging auto-included with Standard",
    categorySlug: "packaging",
    priceInPaise: 3000,
    minOrderQuantity: 5,
    pricingHint: "per-child",
    tiers: ["standard"],
    autoForTier: "standard",
  },
  {
    sku: "SP-PACK-THM",
    title: "Space Theme Gift Bag",
    slug: "space-theme-gift-bag",
    description: "Theme gift bag auto-included with Premium",
    categorySlug: "packaging",
    priceInPaise: 3500,
    minOrderQuantity: 5,
    pricingHint: "per-child",
    tiers: ["premium"],
    autoForTier: "premium",
  },
  {
    sku: "SP-PACK-CUS",
    title: "Custom Space Gift Bag",
    slug: "custom-space-gift-bag",
    description: "Customized theme gift bag auto-included with Luxe",
    categorySlug: "packaging",
    priceInPaise: 8500,
    minOrderQuantity: 5,
    pricingHint: "per-child",
    tiers: ["luxe"],
    autoForTier: "luxe",
  },
  {
    sku: "SP-TAG-THANK",
    title: "Space Thank-you Tag",
    slug: "space-thank-you-tag",
    description: "Personalized thank-you tag auto-included with Luxe",
    categorySlug: "thank-you-tags",
    priceInPaise: 1000,
    minOrderQuantity: 5,
    pricingHint: "per-child",
    tiers: ["luxe"],
    autoForTier: "luxe",
  },
];

const CATEGORIES = [
  { name: "Welcome Items", slug: "welcome-items", displayOrder: 1 },
  { name: "Children Activities", slug: "children-activities", displayOrder: 2 },
  { name: "Family Activities", slug: "family-activities", displayOrder: 3 },
  { name: "Return Gifts", slug: "return-gifts", displayOrder: 4 },
  { name: "Packaging", slug: "packaging", displayOrder: 5 },
  { name: "Thank-you Tags", slug: "thank-you-tags", displayOrder: 6 },
];

const PACKAGES = [
  {
    slug: "standard",
    title: "Thoughtful Essentials",
    priceInPaise: 4990000,
    tierRank: 1,
    isRecommended: false,
    displayOrder: 1,
    description:
      "Thoughtful essentials for a coordinated celebration — static invite, one activity, return gift, and basic personalization.",
  },
  {
    slug: "premium",
    title: "Complete Celebration Experience",
    priceInPaise: 7990000,
    tierRank: 2,
    isRecommended: true,
    displayOrder: 2,
    description:
      "Complete celebration experience with video invite, welcome item, two activities, countdown cards, and gift registry.",
  },
  {
    slug: "luxe",
    title: "The Signature Celebration Experience",
    priceInPaise: 11990000,
    tierRank: 3,
    isRecommended: false,
    displayOrder: 3,
    description:
      "Signature celebration with keepsake PDF, family activity, custom gift bags, thank-you tags, and priority consultation.",
  },
];

async function upsertPackages() {
  // Rename lux → luxe if the old slug still exists
  const oldLux = await prisma.package.findFirst({ where: { slug: "lux", deletedAt: null } });
  if (oldLux) {
    const existingLuxe = await prisma.package.findFirst({ where: { slug: "luxe" } });
    if (!existingLuxe) {
      await prisma.package.update({
        where: { id: oldLux.id },
        data: {
          slug: "luxe",
          title: "The Signature Celebration Experience",
          description: PACKAGES[2]!.description,
        },
      });
      console.log("Renamed package slug lux → luxe");
    }
  }

  const bySlug: Record<string, { id: string }> = {};
  for (const pkg of PACKAGES) {
    const row = await prisma.package.upsert({
      where: { slug: pkg.slug },
      create: {
        ...pkg,
        isActive: true,
        isCustomizable: true,
      },
      update: {
        title: pkg.title,
        priceInPaise: pkg.priceInPaise,
        tierRank: pkg.tierRank,
        isRecommended: pkg.isRecommended,
        displayOrder: pkg.displayOrder,
        description: pkg.description,
        isActive: true,
        deletedAt: null,
      },
    });
    bySlug[pkg.slug] = { id: row.id };
    console.log(`Upserted package: ${pkg.slug}`);
  }
  return bySlug;
}

async function upsertExtraServices() {
  const bySlug: Record<string, { id: string; def: ServiceDef }> = {};
  for (const svc of SERVICES) {
    const existing = await prisma.extraService.findFirst({ where: { slug: svc.slug } });
    const data = {
      slug: svc.slug,
      label: svc.label,
      description: svc.description,
      category: svc.category,
      pricingMode: svc.pricingMode,
      locationScope: svc.locationScope,
      choiceCount: svc.choiceCount,
      customizationPriceInPaise: svc.customizationPriceInPaise,
      displayOrder: svc.displayOrder,
      isActive: true,
      deletedAt: null,
    };
    const row = existing
      ? await prisma.extraService.update({ where: { id: existing.id }, data })
      : await prisma.extraService.create({ data });
    bySlug[svc.slug] = { id: row.id, def: svc };
  }
  console.log(`Upserted ${SERVICES.length} ExtraServices`);
  return bySlug;
}

async function upsertPackageMatrix(
  packagesBySlug: Record<string, { id: string }>,
  servicesBySlug: Record<string, { id: string; def: ServiceDef }>,
) {
  let order = 0;
  for (const [slug, { id: extraServiceId, def }] of Object.entries(servicesBySlug)) {
    for (const tier of ["standard", "premium", "luxe"] as const) {
      const pkg = packagesBySlug[tier];
      if (!pkg) continue;
      const isIncluded = def.tiers.includes(tier);
      await prisma.packageServiceItem.upsert({
        where: {
          packageId_extraServiceId: {
            packageId: pkg.id,
            extraServiceId,
          },
        },
        create: {
          packageId: pkg.id,
          extraServiceId,
          isIncluded,
          displayOrder: def.displayOrder,
        },
        update: {
          isIncluded,
          displayOrder: def.displayOrder,
        },
      });
      order += 1;
    }
    void slug;
  }
  console.log(`Upserted PackageServiceItem matrix (${order} rows)`);
}

async function upsertCategories() {
  const bySlug: Record<string, string> = {};
  for (const cat of CATEGORIES) {
    const row = await prisma.productCategory.upsert({
      where: { slug: cat.slug },
      create: { ...cat, isActive: true },
      update: { name: cat.name, displayOrder: cat.displayOrder, isActive: true },
    });
    bySlug[cat.slug] = row.id;
  }
  return bySlug;
}

async function upsertSpaceProducts(categoryIds: Record<string, string>) {
  const spaceTheme =
    (await prisma.theme.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { slug: "space-theme-celebration" },
          { slug: "space-theme" },
          { slug: "space" },
          { slug: { contains: "space", mode: "insensitive" } },
        ],
      },
    }));
  if (!spaceTheme) {
    console.warn("Space theme not found — products will be created without theme tags");
  } else {
    console.log(`Linking products to theme: ${spaceTheme.slug}`);
  }

  for (const p of SPACE_PRODUCTS) {
    const categoryId = categoryIds[p.categorySlug];
    if (!categoryId) throw new Error(`Missing category ${p.categorySlug}`);

    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
    const product = existing
      ? await prisma.product.update({
          where: { sku: p.sku },
          data: {
            title: p.title,
            slug: p.slug,
            description: p.description,
            priceInPaise: p.priceInPaise,
            compareAtPriceInPaise: null,
            minOrderQuantity: p.minOrderQuantity,
            isActive: true,
            deletedAt: null,
          },
        })
      : await prisma.product.create({
          data: {
            title: p.title,
            slug: p.slug,
            sku: p.sku,
            description: p.description,
            priceInPaise: p.priceInPaise,
            compareAtPriceInPaise: null,
            minOrderQuantity: p.minOrderQuantity,
            isActive: true,
            inventory: {
              create: { quantityAvailable: 999, lowStockThreshold: 10 },
            },
          },
        });

    // Ensure category tag
    await prisma.productCategoryTag.upsert({
      where: { productId_categoryId: { productId: product.id, categoryId } },
      create: { productId: product.id, categoryId },
      update: {},
    });

    if (spaceTheme) {
      await prisma.productThemeTag.upsert({
        where: { productId_themeId: { productId: product.id, themeId: spaceTheme.id } },
        create: { productId: product.id, themeId: spaceTheme.id },
        update: {},
      });
    }
  }
  console.log(`Upserted ${SPACE_PRODUCTS.length} Space products`);
}

async function linkThemesToPackages(packagesBySlug: Record<string, { id: string }>) {
  const themes = await prisma.theme.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, slug: true },
  });
  for (const theme of themes) {
    for (const pkg of Object.values(packagesBySlug)) {
      const existing = await prisma.themePackage.findFirst({
        where: { themeId: theme.id, packageId: pkg.id },
      });
      if (!existing) {
        await prisma.themePackage.create({
          data: { themeId: theme.id, packageId: pkg.id, isActive: true },
        });
      }
    }
  }
  console.log(`Linked ${themes.length} themes to packages`);
}

async function deactivateOrphanExtraServices() {
  // Old seed ExtraServices have no slug — hide them from package inclusions
  const result = await prisma.extraService.updateMany({
    where: { slug: null, deletedAt: null },
    data: { isActive: false },
  });
  if (result.count) {
    console.log(`Deactivated ${result.count} orphan ExtraServices (no slug)`);
  }
  // Also clear their inclusion flags so packages page doesn't list them
  const orphans = await prisma.extraService.findMany({
    where: { slug: null },
    select: { id: true },
  });
  if (orphans.length) {
    await prisma.packageServiceItem.updateMany({
      where: { extraServiceId: { in: orphans.map((o) => o.id) } },
      data: { isIncluded: false },
    });
  }
}

async function archiveUnusedPackages() {
  const live = ["standard", "premium", "luxe"];
  const result = await prisma.package.updateMany({
    where: { deletedAt: null, slug: { notIn: live } },
    data: { isActive: false, deletedAt: new Date() },
  });
  if (result.count) {
    console.log(`Archived ${result.count} unused packages (not in ${live.join(", ")})`);
  }
}

async function upsertFestiveCollection() {
  const festiveCat = await prisma.productCategory.upsert({
    where: { slug: "festive" },
    create: { name: "Occasion & Festive Gifting", slug: "festive", displayOrder: 10, isActive: true },
    update: { name: "Occasion & Festive Gifting", isActive: true },
  });
  await prisma.productCategory.upsert({
    where: { slug: "personalized" },
    create: { name: "Personalized Return Gifts", slug: "personalized", displayOrder: 11, isActive: true },
    update: { name: "Personalized Return Gifts", isActive: true },
  });

  const products = await prisma.product.findMany({
    where: { deletedAt: null, isActive: true },
    include: { categoryTags: { include: { category: true } } },
    orderBy: { createdAt: "desc" },
    take: 24,
  });

  for (const product of products) {
    const isReturnGift = product.categoryTags.some((t) => t.category.slug === "return-gifts");
    if (isReturnGift) {
      await prisma.productCategoryTag.upsert({
        where: { productId_categoryId: { productId: product.id, categoryId: festiveCat.id } },
        create: { productId: product.id, categoryId: festiveCat.id },
        update: {},
      });
    }
  }

  const collectionProducts = products.slice(0, 12);
  const existing = await prisma.productCollection.findFirst({ where: { slug: "festive" } });
  const collection = existing
    ? await prisma.productCollection.update({
        where: { id: existing.id },
        data: {
          title: "Festive Collection",
          description:
            "Thoughtfully curated gifts for festivals, Kanjak, and seasonal celebrations — ready to shop without a full package.",
          isActive: true,
          showOnHomepage: true,
          deletedAt: null,
          displayOrder: 1,
        },
      })
    : await prisma.productCollection.create({
        data: {
          title: "Festive Collection",
          slug: "festive",
          description:
            "Thoughtfully curated gifts for festivals, Kanjak, and seasonal celebrations — ready to shop without a full package.",
          isActive: true,
          showOnHomepage: true,
          displayOrder: 1,
        },
      });

  await prisma.productCollectionItem.deleteMany({ where: { collectionId: collection.id } });
  if (collectionProducts.length) {
    await prisma.productCollectionItem.createMany({
      data: collectionProducts.map((product, index) => ({
        collectionId: collection.id,
        productId: product.id,
        displayOrder: index,
      })),
    });
  }
  console.log(`Upserted Festive Collection with ${collectionProducts.length} products`);
}

async function main() {
  console.log("=== Additive package/product seed (no clearDevData) ===");
  const packagesBySlug = await upsertPackages();
  const servicesBySlug = await upsertExtraServices();
  await upsertPackageMatrix(packagesBySlug, servicesBySlug);
  await deactivateOrphanExtraServices();
  const categoryIds = await upsertCategories();
  await upsertSpaceProducts(categoryIds);
  await linkThemesToPackages(packagesBySlug);
  await archiveUnusedPackages();
  await upsertFestiveCollection();
  console.log("=== Done ===");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
