-- Service previews: a package service can carry its own images/videos ("Preview") and a
-- Before / During / After stage, shown to the customer in the package builder.
-- Additive only: two new columns and one new table. No existing data is changed or dropped.

ALTER TABLE "ExtraService"
  ADD COLUMN IF NOT EXISTS "hasPreview" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "celebrationStage" "CelebrationStage";

CREATE TABLE IF NOT EXISTS "ExtraServiceMedia" (
    "id" TEXT NOT NULL,
    "extraServiceId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ExtraServiceMedia_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ExtraServiceMedia_extraServiceId_idx" ON "ExtraServiceMedia"("extraServiceId");

ALTER TABLE "ExtraServiceMedia"
  ADD CONSTRAINT "ExtraServiceMedia_extraServiceId_fkey"
  FOREIGN KEY ("extraServiceId") REFERENCES "ExtraService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExtraServiceMedia"
  ADD CONSTRAINT "ExtraServiceMedia_mediaId_fkey"
  FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Starting point for the new stage column, from each service's existing semantic category, so the
-- package pages can group inclusions straight away. Only fills the new (empty) column; admin can
-- change any of these on the service form.
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
