-- Migration: ExtraService typed columns (idempotent — enums may already exist from db push)

DO $$ BEGIN
  CREATE TYPE "ExtraServiceCategory" AS ENUM (
    'DIGITAL', 'KEEPSAKE', 'CHILDREN_ACTIVITY', 'WELCOME_ITEM',
    'FAMILY_ACTIVITY', 'RETURN_GIFT', 'PACKAGING', 'THANK_YOU_TAG',
    'CONSULTATION', 'GIFT_REGISTRY', 'PERSONALIZATION', 'DECOR'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PricingMode" AS ENUM (
    'FIXED', 'PER_CHILD', 'PER_CARD', 'PER_GROUP', 'PER_CHILD_CHOOSABLE'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "LocationScope" AS ENUM ('ALL', 'JAIPUR_ONLY', 'OUTSIDE_JAIPUR');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "ExtraService" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "ExtraService" ADD COLUMN IF NOT EXISTS "category" "ExtraServiceCategory";
ALTER TABLE "ExtraService" ADD COLUMN IF NOT EXISTS "pricingMode" "PricingMode";
ALTER TABLE "ExtraService" ADD COLUMN IF NOT EXISTS "locationScope" "LocationScope";
ALTER TABLE "ExtraService" ADD COLUMN IF NOT EXISTS "choiceCount" INTEGER;

-- Ensure locationScope default for existing rows
UPDATE "ExtraService" SET "locationScope" = 'ALL' WHERE "locationScope" IS NULL;
ALTER TABLE "ExtraService" ALTER COLUMN "locationScope" SET DEFAULT 'ALL';
ALTER TABLE "ExtraService" ALTER COLUMN "locationScope" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "ExtraService_slug_key" ON "ExtraService"("slug");
