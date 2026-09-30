-- Policy versions, policy acceptance on orders, and stored consent.
-- Additive only: two new tables, one enum, and three nullable/defaulted columns. No existing row changes,
-- except that the current text of every legal page is copied into the history table as version 1.

ALTER TABLE "LegalPage" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS "LegalPageVersion" (
  "id" TEXT NOT NULL,
  "type" "LegalPageType" NOT NULL,
  "version" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "bodyHtml" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LegalPageVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "LegalPageVersion_type_version_key" ON "LegalPageVersion"("type", "version");

-- Keep the policies as they stand today, so they survive the next edit.
INSERT INTO "LegalPageVersion" ("id", "type", "version", "title", "bodyHtml", "publishedAt", "createdAt")
SELECT gen_random_uuid()::text, p."type", p."version", p."title", p."bodyHtml", p."publishedAt", p."updatedAt"
FROM "LegalPage" p
ON CONFLICT ("type", "version") DO NOTHING;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "policiesAcceptedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "policyVersions" JSONB;

DO $$ BEGIN
  CREATE TYPE "ConsentPurpose" AS ENUM ('MARKETING');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ConsentRecord" (
  "id" TEXT NOT NULL,
  "purpose" "ConsentPurpose" NOT NULL,
  "granted" BOOLEAN NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "userId" TEXT,
  "source" TEXT NOT NULL,
  "orderId" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ConsentRecord_email_idx" ON "ConsentRecord"("email");
CREATE INDEX IF NOT EXISTS "ConsentRecord_phone_idx" ON "ConsentRecord"("phone");
CREATE INDEX IF NOT EXISTS "ConsentRecord_userId_idx" ON "ConsentRecord"("userId");
