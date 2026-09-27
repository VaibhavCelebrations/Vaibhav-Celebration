-- The celebration stage (Before / During / After) is a parent grouping of PRODUCT CATEGORIES,
-- not of package services. Move it, and flag festive product collections (Navratri, Diwali…).
-- No business data is removed: the only column dropped is the one added by the previous migration.

ALTER TABLE "ProductCategory"
  ADD COLUMN IF NOT EXISTS "celebrationStage" "CelebrationStage";

UPDATE "ProductCategory"
SET "celebrationStage" = CASE "slug"
  WHEN 'welcome-items' THEN 'DURING'
  WHEN 'children-activities' THEN 'DURING'
  WHEN 'family-activities' THEN 'DURING'
  WHEN 'return-gifts' THEN 'AFTER'
  WHEN 'packaging' THEN 'AFTER'
  WHEN 'thank-you-tags' THEN 'AFTER'
  ELSE NULL
END::"CelebrationStage"
WHERE "celebrationStage" IS NULL;

ALTER TABLE "ExtraService" DROP COLUMN IF EXISTS "celebrationStage";

ALTER TABLE "ProductCollection"
  ADD COLUMN IF NOT EXISTS "isFestive" BOOLEAN NOT NULL DEFAULT false;
