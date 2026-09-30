-- Service previews are per theme: each service shows different images/videos for each theme.
-- Additive, and keeps what is already uploaded: every existing (theme-less) preview file is
-- copied to each current theme, then the theme-less originals are removed.

ALTER TABLE "ExtraServiceMedia" ADD COLUMN IF NOT EXISTS "themeId" TEXT;

INSERT INTO "ExtraServiceMedia" ("id", "extraServiceId", "mediaId", "displayOrder", "themeId")
SELECT gen_random_uuid()::text, m."extraServiceId", m."mediaId", m."displayOrder", t."id"
FROM "ExtraServiceMedia" m
CROSS JOIN "Theme" t
WHERE m."themeId" IS NULL AND t."deletedAt" IS NULL;

DELETE FROM "ExtraServiceMedia" WHERE "themeId" IS NULL;

ALTER TABLE "ExtraServiceMedia" ALTER COLUMN "themeId" SET NOT NULL;

ALTER TABLE "ExtraServiceMedia"
  ADD CONSTRAINT "ExtraServiceMedia_themeId_fkey"
  FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "ExtraServiceMedia_extraServiceId_idx";
CREATE INDEX IF NOT EXISTS "ExtraServiceMedia_extraServiceId_themeId_idx" ON "ExtraServiceMedia"("extraServiceId", "themeId");
