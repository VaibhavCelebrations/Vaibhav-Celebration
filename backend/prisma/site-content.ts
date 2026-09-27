/**
 * Content shared by `seed.ts` (fresh databases) and `scripts/sync-business-data.ts`
 * (non-destructive update of an existing database), so both always agree.
 */

type Stage = "BEFORE" | "DURING" | "AFTER";

/** Product category → parent celebration stage (Customize-step section). */
export const CATEGORY_STAGES: Record<string, Stage> = {
  "welcome-items": "DURING",
  "children-activities": "DURING",
  "family-activities": "DURING",
  "return-gifts": "AFTER",
  packaging: "AFTER",
  "thank-you-tags": "AFTER",
};

/** End of day in India (IST) for a calendar date. */
const istEndOfDay = (date: string) => new Date(`${date}T23:59:59+05:30`);

/**
 * Festival collections. Created empty — products (hampers) are added from the admin
 * Collections screen. Empty collections stay hidden on the website, and each one
 * disappears automatically once `endsAt` passes (its products are kept).
 */
export const FESTIVE_COLLECTIONS = [
  {
    slug: "navratri-2026",
    title: "Navratri Hampers",
    description:
      "Celebrate the nine nights with thoughtfully curated Navratri hampers — festive gifting for family, friends and little ones.",
    endsAt: istEndOfDay("2026-10-20"),
    displayOrder: 1,
  },
  {
    slug: "diwali-2026",
    title: "Diwali Hampers",
    description:
      "Light up the season with handpicked Diwali hampers — sweets, keepsakes and festive gifts for everyone you love.",
    endsAt: istEndOfDay("2026-11-09"),
    displayOrder: 2,
  },
] as const;

/** Seasonal pop-up. Starts switched OFF — turn it on in admin once the collection has products. */
export const SEASONAL_POPUP = {
  title: "Navratri Hampers Are Here",
  bodyText:
    "Celebrate the nine nights with thoughtfully curated Navratri hampers — perfect for family, friends and little ones.",
  ctaLabel: "Shop Navratri Hampers",
  ctaUrl: "/gifts/collection/navratri-2026",
  placements: ["HOMEPAGE", "THEMES_PAGE", "PACKAGES_PAGE", "GALLERY_PAGE"] as const,
  triggerAfterSeconds: 5,
  isActive: false,
  endsAt: istEndOfDay("2026-10-20"),
};

/** Grand-tier packaging, named as the client specified. */
export const GRAND_PACKAGING = {
  sku: "SP-PACK-CUS",
  title: "Customized/Personalized Space Box or Bag",
};

export const GRAND_PACKAGE_DESCRIPTION =
  "Signature celebration with keepsake PDF, family activity, a customized/personalized box or bag, and priority consultation.";
