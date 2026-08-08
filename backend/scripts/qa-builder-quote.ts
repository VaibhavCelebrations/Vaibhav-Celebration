/**
 * QA smoke checks for builder quote engine.
 * Run: npx tsx scripts/qa-builder-quote.ts
 */
import { computeBuilderQuote, listBuilderProducts } from "../src/modules/builder/builder.service";

async function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`OK: ${msg}`);
}

async function main() {
  const theme = "space-theme-celebration";

  // Products for luxe
  const activities = await listBuilderProducts({
    theme,
    category: "children-activities",
    tier: "luxe",
  });
  await assert(activities.length >= 2, `luxe activities available (${activities.length})`);

  const gifts = await listBuilderProducts({ theme, category: "return-gifts", tier: "standard" });
  await assert(gifts.some((g) => g.sku === "SP-RG-STAT"), "standard return gifts include stationery");

  // MOQ: guests=5, bingo MOQ=10
  const quoteMoq = await computeBuilderQuote({
    packageSlug: "standard",
    themeSlug: theme,
    guestCount: 5,
    location: "outside",
    selections: {
      activity1: "SP-ACT-BNG",
      returnGift: "SP-RG-STAT",
      decor: false,
    },
  });
  const bingo = quoteMoq.lineItems.find((l) => l.sku === "SP-ACT-BNG");
  await assert(!!bingo && bingo.moqApplied === true && bingo.quantity === 10, "bingo MOQ charges for 10 when guests=5");

  // Jaipur decor opt-in
  const quoteDecor = await computeBuilderQuote({
    packageSlug: "luxe",
    themeSlug: theme,
    guestCount: 10,
    location: "jaipur",
    selections: {
      welcomeItem: "SP-WEL-BDG",
      activity1: "SP-ACT-HDG",
      activity2: "SP-ACT-PUZ",
      returnGift: "SP-RG-LBOX",
      familyActivity: "SP-FAM-BNG",
      decor: true,
    },
  });
  const decor = quoteDecor.lineItems.find((l) => l.key === "decor");
  await assert(!!decor && decor.lineTotalInPaise === 2000000, "luxe Jaipur decor = ₹20,000");
  await assert(quoteDecor.gstInPaise > 0, "GST applied");
  await assert(
    quoteDecor.lineItems.some((l) => l.sku === "SP-PACK-CUS"),
    "luxe auto packaging Custom Space Gift Bag",
  );
  await assert(
    quoteDecor.lineItems.some((l) => l.sku === "SP-TAG-THANK"),
    "luxe auto thank-you tag",
  );

  // Outside Jaipur must not charge Jaipur decor even if decor=true
  const quoteOutside = await computeBuilderQuote({
    packageSlug: "premium",
    themeSlug: theme,
    guestCount: 8,
    location: "outside",
    selections: {
      welcomeItem: "SP-WEL-BDG",
      activity1: "SP-ACT-HDG",
      activity2: "SP-ACT-PUZ",
      returnGift: "SP-RG-BAG",
      decor: true,
    },
  });
  await assert(
    !quoteOutside.lineItems.some((l) => l.key === "decor"),
    "outside Jaipur never charges Jaipur decor",
  );

  console.log("\nAll builder QA checks passed.");
  console.log(`Sample luxe total: ₹${(quoteDecor.totalInPaise / 100).toLocaleString("en-IN")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
