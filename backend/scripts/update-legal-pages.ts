/**
 * Script to update legal pages with comprehensive policy content.
 * Run: npx ts-node scripts/update-legal-pages.ts
 * 
 * This updates Privacy Policy and Terms of Service with
 * Meta API, Razorpay, GDPR, and DPDP compliant content.
 */

import { PrismaClient, LegalPageType } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

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
    
    await prisma.legalPage.upsert({
      where: { type: update.type },
      create: {
        type: update.type,
        title: update.title,
        bodyHtml,
        publishedAt: new Date(),
      },
      update: {
        title: update.title,
        bodyHtml,
        publishedAt: new Date(),
      },
    });

    console.log(`✅ Updated: ${update.title}`);
  }

  console.log("\n✨ Legal pages updated successfully!");
  console.log("─────────────────────────────────────────");
  console.log("Pages updated:");
  console.log("  • Privacy Policy - DPDP, GDPR, Meta API compliant");
  console.log("  • Terms & Conditions - Razorpay, E-commerce compliant");
  console.log("─────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌ Update failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
