/**
 * Brings an EXISTING database in line with the official business details and current site content.
 * Non-destructive and safe to re-run: it only updates specific rows or creates missing ones.
 * Nothing is deleted — outdated content is unpublished / deactivated, pop-ups are soft-deleted.
 *
 * Run:  npm run db:sync-business            (apply)
 *       npm run db:sync-business -- --dry-run (show what would change)
 */
import { config as loadDotenv } from "dotenv";
import fs from "fs/promises";
import path from "path";
import { BlogStatus, type LegalPageType, PopupPlacement, PrismaClient, type Prisma } from "@prisma/client";
import { BUSINESS, BUSINESS_SETTINGS } from "../src/lib/business";
import { delPattern, getRedisClient } from "../src/lib/redis";
import { triggerRevalidate } from "../src/integrations/revalidate/client";
import {
  CATEGORY_STAGES,
  FESTIVE_COLLECTIONS,
  GRAND_PACKAGE_DESCRIPTION,
  GRAND_PACKAGING,
  SEASONAL_POPUP,
} from "../prisma/site-content";

loadDotenv({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

/** Content that belongs to the old wedding/farmhouse-venue concept, not Vaibhav Celebrations. */
const OFF_CONCEPT = /wedding|bridal|farmhouse|faridabad|surajkund|venue tour/i;

let changes = 0;
async function apply(label: string, run: () => Promise<unknown>) {
  changes += 1;
  console.log(`${DRY_RUN ? "[dry-run] would" : "✔"} ${label}`);
  if (!DRY_RUN) await run();
}

function fixLegalHtml(html: string) {
  return html
    .replace(/<tr><td><strong>Email<\/strong><\/td><td>privacy@vaibhavcelebrations\.in<\/td><\/tr>\s*/g, "")
    .replace(/<tr><td><strong>Grievance Email<\/strong><\/td><td>grievance@vaibhavcelebrations\.in<\/td><\/tr>\s*/g, "")
    .replace(/(privacy|grievance)@vaibhavcelebrations\.in/g, BUSINESS.email)
    .replace(/Trimur Apartments/g, "Trimurti Apartments");
}

async function syncSettings() {
  const existing = new Map((await prisma.operationalSetting.findMany()).map((s) => [s.key, s.value]));
  for (const { key, value } of BUSINESS_SETTINGS) {
    if (existing.get(key) === value) continue;
    await apply(`setting ${key} = "${value}"`, () =>
      prisma.operationalSetting.upsert({ where: { key }, create: { key, value }, update: { value } }),
    );
  }
}

async function syncContactPage() {
  const page = await prisma.pageContent.findUnique({ where: { pageKey: "contact" } });
  if (!page) return;
  const sections = (page.sections ?? {}) as Record<string, unknown>;
  const info = (sections.info ?? {}) as Record<string, unknown>;
  const next = { ...info, phone: BUSINESS.phone, email: BUSINESS.email, address: BUSINESS.address, hours: BUSINESS.hours };
  if (JSON.stringify(next) === JSON.stringify(info)) return;
  await apply("contact page: phone / email / address / hours", () =>
    prisma.pageContent.update({
      where: { pageKey: "contact" },
      data: { sections: { ...sections, info: next } as Prisma.InputJsonValue },
    }),
  );
}

/** Same mapping as scripts/update-legal-pages.ts (the footer's "Shipping & Delivery" is CANCELLATION_POLICY). */
const LEGAL_FILES: Record<LegalPageType, { title: string; file: string }> = {
  PRIVACY_POLICY: { title: "Privacy Policy", file: "privacy-policy.html" },
  TERMS_OF_SERVICE: { title: "Terms & Conditions", file: "terms-of-service.html" },
  REFUND_POLICY: { title: "Refund & Cancellation Policy", file: "refund-policy.html" },
  CANCELLATION_POLICY: { title: "Shipping & Delivery Policy", file: "shipping-policy.html" },
};

async function syncLegalPages() {
  const existing = new Map((await prisma.legalPage.findMany()).map((p) => [p.type, p]));
  for (const [type, { title, file }] of Object.entries(LEGAL_FILES) as Array<[LegalPageType, { title: string; file: string }]>) {
    const page = existing.get(type);
    const isPlaceholder = !page || /placeholder legal content/i.test(page.bodyHtml);
    if (isPlaceholder) {
      // Only replace untouched placeholder pages with the full policy — never overwrite admin edits.
      const bodyHtml = fixLegalHtml(await fs.readFile(path.resolve(__dirname, "../prisma/legal-content", file), "utf8"));
      await apply(`legal page ${type}: publish full "${title}" (replacing placeholder)`, () =>
        prisma.legalPage.upsert({
          where: { type },
          create: { type, title, bodyHtml, publishedAt: new Date() },
          update: { title, bodyHtml, publishedAt: new Date() },
        }),
      );
      continue;
    }
    const fixed = fixLegalHtml(page.bodyHtml);
    if (fixed === page.bodyHtml) continue;
    await apply(`legal page ${type}: support@ email + "Trimurti Apartments"`, () =>
      prisma.legalPage.update({ where: { id: page.id }, data: { bodyHtml: fixed } }),
    );
  }
}

async function retireOffConceptContent() {
  const posts = await prisma.blogPost.findMany({ where: { deletedAt: null } });
  for (const post of posts) {
    if (!OFF_CONCEPT.test(`${post.title} ${post.excerpt ?? ""}`)) continue;
    if (post.status !== BlogStatus.PUBLISHED && !post.isFeatured) continue;
    await apply(`unpublish blog "${post.title}"`, () =>
      prisma.blogPost.update({
        where: { id: post.id },
        data: { status: post.status === BlogStatus.PUBLISHED ? BlogStatus.UNPUBLISHED : post.status, isFeatured: false },
      }),
    );
  }

  const events = await prisma.event.findMany({ where: { deletedAt: null, isActive: true } });
  for (const ev of events) {
    if (!OFF_CONCEPT.test(`${ev.title} ${ev.venue ?? ""} ${ev.description ?? ""}`)) continue;
    await apply(`deactivate event "${ev.title}" (${ev.venue ?? "no venue"})`, () =>
      prisma.event.update({ where: { id: ev.id }, data: { isActive: false } }),
    );
  }

  const now = new Date();
  const popups = await prisma.popup.findMany({ where: { deletedAt: null } });
  for (const popup of popups) {
    if (popup.title === SEASONAL_POPUP.title) continue;
    const expired = popup.endsAt !== null && popup.endsAt < now;
    if (!expired && !OFF_CONCEPT.test(`${popup.title} ${popup.bodyText ?? ""}`)) continue;
    await apply(`retire pop-up "${popup.title}"${expired ? " (expired)" : ""}`, () =>
      prisma.popup.update({ where: { id: popup.id }, data: { isActive: false, deletedAt: now } }),
    );
  }
}

async function syncSeasonalPopup() {
  const existing = await prisma.popup.findFirst({ where: { title: SEASONAL_POPUP.title, deletedAt: null } });
  if (existing) return;
  await apply(`create pop-up "${SEASONAL_POPUP.title}" (inactive — switch on in admin)`, () =>
    prisma.popup.create({
      data: {
        title: SEASONAL_POPUP.title,
        bodyText: SEASONAL_POPUP.bodyText,
        ctaLabel: SEASONAL_POPUP.ctaLabel,
        ctaUrl: SEASONAL_POPUP.ctaUrl,
        placements: [...SEASONAL_POPUP.placements] as PopupPlacement[],
        triggerAfterSeconds: SEASONAL_POPUP.triggerAfterSeconds,
        isActive: SEASONAL_POPUP.isActive,
        endsAt: SEASONAL_POPUP.endsAt,
      },
    }),
  );
}

async function syncFestiveCollections() {
  for (const c of FESTIVE_COLLECTIONS) {
    const existing = await prisma.productCollection.findUnique({ where: { slug: c.slug } });
    if (!existing) {
      await apply(`create festive collection "${c.title}" (/gifts/collection/${c.slug})`, () =>
        prisma.productCollection.create({
          data: {
            slug: c.slug,
            title: c.title,
            description: c.description,
            endsAt: c.endsAt,
            displayOrder: c.displayOrder,
            isFestive: true,
            isActive: true,
          },
        }),
      );
    } else if (!existing.isFestive) {
      // Never overwrite admin edits to an existing collection — only flag it as festive.
      await apply(`mark collection "${existing.title}" as festive`, () =>
        prisma.productCollection.update({ where: { id: existing.id }, data: { isFestive: true } }),
      );
    }
  }
}

async function syncCategoryStages() {
  const categories = await prisma.productCategory.findMany({ where: { celebrationStage: null } });
  for (const cat of categories) {
    const stage = CATEGORY_STAGES[cat.slug];
    if (!stage) continue;
    await apply(`category "${cat.name}" → ${stage}`, () =>
      prisma.productCategory.update({ where: { id: cat.id }, data: { celebrationStage: stage } }),
    );
  }
}

async function syncGrandPackaging() {
  const product = await prisma.product.findUnique({ where: { sku: GRAND_PACKAGING.sku } });
  if (product && product.title !== GRAND_PACKAGING.title) {
    await apply(`rename ${GRAND_PACKAGING.sku} "${product.title}" → "${GRAND_PACKAGING.title}"`, () =>
      prisma.product.update({ where: { id: product.id }, data: { title: GRAND_PACKAGING.title } }),
    );
  }
  const grand = await prisma.package.findUnique({ where: { slug: "grand" } });
  if (grand && /custom gift bags/i.test(grand.description ?? "")) {
    await apply(`Grand package description → "${GRAND_PACKAGE_DESCRIPTION}"`, () =>
      prisma.package.update({ where: { id: grand.id }, data: { description: GRAND_PACKAGE_DESCRIPTION } }),
    );
  }
}

async function flushCaches() {
  const client = getRedisClient();
  if (client) {
    try {
      await client.connect();
    } catch {
      // already connected
    }
  }
  await delPattern("pub:*");
  await delPattern("adm:*");
  await triggerRevalidate(["/", "/about", "/contact", "/gifts", "/packages", "/blog", "/events", "/legal/privacy-policy", "/legal/terms-of-service", "/legal/refund-policy"]);
}

async function main() {
  console.log(`Syncing business data${DRY_RUN ? " (dry run — nothing is written)" : ""}…\n`);
  await syncSettings();
  await syncContactPage();
  await syncLegalPages();
  await retireOffConceptContent();
  await syncSeasonalPopup();
  await syncFestiveCollections();
  await syncCategoryStages();
  await syncGrandPackaging();

  if (!DRY_RUN && changes > 0) await flushCaches();
  console.log(`\n${changes === 0 ? "Already up to date." : `${changes} change(s) ${DRY_RUN ? "pending" : "applied"}.`}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
