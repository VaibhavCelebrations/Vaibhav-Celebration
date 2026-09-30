/**
 * Script to update legal pages with comprehensive policy content.
 * Run: npx tsx scripts/update-legal-pages.ts
 * 
 * Publishes the four policy files in prisma/legal-content. Each page whose text changed gets a
 * new version; the previous text stays in LegalPageVersion. Unchanged pages are left alone.
 */

import { LegalPageType } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { prisma } from "../src/db/prisma";
import { saveLegalPage } from "../src/modules/content/legal.service";
import { triggerRevalidate } from "../src/integrations/revalidate/client";

async function main() {
  console.log("🔄 Updating legal pages with comprehensive policy content...\n");

  const legalContentDir = path.join(__dirname, "../prisma/legal-content");

  const updates = [
    {
      type: LegalPageType.PRIVACY_POLICY,
      title: "Privacy Policy",
      file: "privacy-policy.html",
    },
    {
      type: LegalPageType.TERMS_OF_SERVICE,
      title: "Terms & Conditions",
      file: "terms-of-service.html",
    },
    {
      type: LegalPageType.REFUND_POLICY,
      title: "Refund & Cancellation Policy",
      file: "refund-policy.html",
    },
    {
      type: LegalPageType.CANCELLATION_POLICY,
      title: "Shipping & Delivery Policy",
      file: "shipping-policy.html",
    },
  ];

  for (const update of updates) {
    const filePath = path.join(legalContentDir, update.file);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${update.file}, skipping...`);
      continue;
    }

    const bodyHtml = fs.readFileSync(filePath, "utf-8");
    
    const before = await prisma.legalPage.findUnique({ where: { type: update.type } });
    if (before && before.title === update.title && before.bodyHtml === bodyHtml) {
      console.log(`➖ Unchanged: ${update.title} (version ${before.version})`);
      continue;
    }
    const page = await saveLegalPage(update.type, { title: update.title, bodyHtml, publishedAt: new Date() });

    console.log(`✅ Updated: ${update.title} (version ${page.version})`);
  }

  // The storefront caches legal pages; ask it to refetch them.
  const revalidated = await triggerRevalidate([
    "/legal/privacy-policy",
    "/legal/terms-of-service",
    "/legal/refund-policy",
    "/legal/cancellation-policy",
  ]);
  console.log(`\nStorefront refresh: ${revalidated.skipped ? "skipped (not configured)" : revalidated.ok ? "ok" : "failed"}`);
  console.log("✨ Legal pages are up to date.");
}

main()
  .catch((e) => {
    console.error("❌ Update failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
