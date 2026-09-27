-- Admin-managed "which phase of the celebration" grouping for package services/products.
-- Additive only: new enum + new nullable column. No existing data is touched or dropped.

CREATE TYPE "CelebrationStage" AS ENUM ('BEFORE', 'DURING', 'AFTER');

ALTER TABLE "ExtraService"
  ADD COLUMN IF NOT EXISTS "celebrationStage" "CelebrationStage";

-- Best-effort backfill from the existing semantic `category`, so already-configured services
-- land in a sensible bucket immediately instead of showing up "uncategorized". Anything with no
-- category (or a category with no obvious phase) is left NULL for admin to assign explicitly.
UPDATE "ExtraService"
SET "celebrationStage" = CASE "category"
  WHEN 'DIGITAL' THEN 'BEFORE'
  WHEN 'CONSULTATION' THEN 'BEFORE'
  WHEN 'GIFT_REGISTRY' THEN 'BEFORE'
  WHEN 'PERSONALIZATION' THEN 'BEFORE'
  WHEN 'WELCOME_ITEM' THEN 'DURING'
  WHEN 'CHILDREN_ACTIVITY' THEN 'DURING'
  WHEN 'FAMILY_ACTIVITY' THEN 'DURING'
  WHEN 'DECOR' THEN 'DURING'
  WHEN 'RETURN_GIFT' THEN 'AFTER'
  WHEN 'PACKAGING' THEN 'AFTER'
  WHEN 'THANK_YOU_TAG' THEN 'AFTER'
  WHEN 'KEEPSAKE' THEN 'AFTER'
  ELSE NULL
END::"CelebrationStage"
WHERE "celebrationStage" IS NULL;
