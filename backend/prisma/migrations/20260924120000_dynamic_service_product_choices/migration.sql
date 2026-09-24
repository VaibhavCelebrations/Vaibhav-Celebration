-- Dynamic, admin-managed product choices for package services.
-- Replaces the hardcoded welcome / activity / return-gift / family-activity slots in the builder.

ALTER TABLE "ExtraService"
  ADD COLUMN IF NOT EXISTS "isProductChoice" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "selectionCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "isPerGroup" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "ServiceProduct" (
  "id" TEXT NOT NULL,
  "extraServiceId" TEXT NOT NULL,
  "themeId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ServiceProduct_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ServiceProduct_extraServiceId_themeId_productId_key"
  ON "ServiceProduct"("extraServiceId", "themeId", "productId");
CREATE INDEX IF NOT EXISTS "ServiceProduct_extraServiceId_themeId_idx"
  ON "ServiceProduct"("extraServiceId", "themeId");
CREATE INDEX IF NOT EXISTS "ServiceProduct_productId_idx" ON "ServiceProduct"("productId");

ALTER TABLE "ServiceProduct"
  ADD CONSTRAINT "ServiceProduct_extraServiceId_fkey"
  FOREIGN KEY ("extraServiceId") REFERENCES "ExtraService"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceProduct"
  ADD CONSTRAINT "ServiceProduct_themeId_fkey"
  FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceProduct"
  ADD CONSTRAINT "ServiceProduct_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Backfill: turn the four legacy choosable categories into product-choice services ──
UPDATE "ExtraService"
SET "isProductChoice" = true,
    "selectionCount" = LEAST(GREATEST(COALESCE("choiceCount", 1), 1), 3),
    "isPerGroup" = ("category" = 'FAMILY_ACTIVITY'),
    -- "Welcome Item (choose 1)" -> "Welcome Item": the "choose N" wording is now generated from selectionCount
    "label" = btrim(regexp_replace("label", '\s*\(choose\s*\d+\)', '', 'i'))
WHERE "category" IN ('WELCOME_ITEM', 'CHILDREN_ACTIVITY', 'RETURN_GIFT', 'FAMILY_ACTIVITY')
  AND "deletedAt" IS NULL;

-- Preserve today's behaviour: each service offers the products tagged with its category AND theme,
-- honouring the old per-tier SKU restrictions.
WITH tier_map(sku, tier) AS (
  VALUES
    ('SP-WEL-BDG','signature'), ('SP-WEL-BDG','grand'),
    ('SP-WEL-HDB','signature'), ('SP-WEL-HDB','grand'),
    ('SP-WEL-ID','signature'),  ('SP-WEL-ID','grand'),
    ('SP-WEL-QR','grand'),
    ('SP-ACT-HDG','essential'), ('SP-ACT-HDG','signature'), ('SP-ACT-HDG','grand'),
    ('SP-ACT-PUZ','essential'), ('SP-ACT-PUZ','signature'), ('SP-ACT-PUZ','grand'),
    ('SP-ACT-BNG','essential'), ('SP-ACT-BNG','signature'), ('SP-ACT-BNG','grand'),
    ('SP-FAM-BNG','grand'),
    ('SP-RG-STAT','essential'), ('SP-RG-STAT','signature'), ('SP-RG-STAT','grand'),
    ('SP-RG-LBOX','essential'), ('SP-RG-LBOX','signature'), ('SP-RG-LBOX','grand'),
    ('SP-RG-BAG','signature'),  ('SP-RG-BAG','grand')
)
INSERT INTO "ServiceProduct" ("id", "extraServiceId", "themeId", "productId", "displayOrder")
SELECT 'sp_' || md5(es."id" || t."id" || p."id"), es."id", t."id", p."id", 0
FROM "ExtraService" es
JOIN "ProductCategory" pc ON pc."slug" = CASE es."category"
    WHEN 'WELCOME_ITEM' THEN 'welcome-items'
    WHEN 'CHILDREN_ACTIVITY' THEN 'children-activities'
    WHEN 'FAMILY_ACTIVITY' THEN 'family-activities'
    WHEN 'RETURN_GIFT' THEN 'return-gifts'
  END
JOIN "ProductCategoryTag" pct ON pct."categoryId" = pc."id"
JOIN "Product" p ON p."id" = pct."productId" AND p."deletedAt" IS NULL AND p."isActive" = true
JOIN "ProductThemeTag" ptt ON ptt."productId" = p."id"
JOIN "Theme" t ON t."id" = ptt."themeId" AND t."deletedAt" IS NULL
WHERE es."isProductChoice" = true
  AND es."deletedAt" IS NULL
  AND (
    NOT EXISTS (SELECT 1 FROM tier_map m WHERE m.sku = p."sku")
    OR EXISTS (
      SELECT 1
      FROM tier_map m
      JOIN "Package" pk ON pk."slug" = m.tier
      JOIN "PackageServiceItem" psi
        ON psi."packageId" = pk."id" AND psi."extraServiceId" = es."id" AND psi."isIncluded" = true
      WHERE m.sku = p."sku"
    )
  )
ON CONFLICT DO NOTHING;
