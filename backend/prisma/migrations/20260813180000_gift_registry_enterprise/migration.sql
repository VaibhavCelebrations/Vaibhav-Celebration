-- Gift Registry enterprise expansion: quantities, privacy, extraction cache,
-- cart/order linkage, and contribution payment states.

-- Enums
ALTER TYPE "RegistryStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "RegistryStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

CREATE TYPE "RegistryVisibility" AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE');
CREATE TYPE "GiftContributionStatus" AS ENUM ('PENDING', 'PAID', 'RELEASED', 'CONFIRMED_EXTERNAL');
CREATE TYPE "ExtractionStatus" AS ENUM ('PENDING', 'SUCCESS', 'PARTIAL', 'FAILED', 'MANUAL');

ALTER TYPE "GiftItemStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_PURCHASED';

-- Cart lines may belong to a registry gift
ALTER TABLE "CartItem" ADD COLUMN IF NOT EXISTS "registryItemId" TEXT NOT NULL DEFAULT '';
DROP INDEX IF EXISTS "CartItem_cartId_productId_key";
CREATE UNIQUE INDEX "CartItem_cartId_productId_registryItemId_key" ON "CartItem"("cartId", "productId", "registryItemId");

-- Orders / order items
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "registryId" TEXT;
CREATE INDEX IF NOT EXISTS "Order_registryId_idx" ON "Order"("registryId");

ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "registryItemId" TEXT;

-- GiftRegistry columns
ALTER TABLE "GiftRegistry" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "GiftRegistry" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "GiftRegistry" ADD COLUMN IF NOT EXISTS "occasion" TEXT;
ALTER TABLE "GiftRegistry" ADD COLUMN IF NOT EXISTS "eventDate" TIMESTAMP(3);
ALTER TABLE "GiftRegistry" ADD COLUMN IF NOT EXISTS "ownerDisplayName" TEXT;
ALTER TABLE "GiftRegistry" ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;
ALTER TABLE "GiftRegistry" ADD COLUMN IF NOT EXISTS "contactPhone" TEXT;
ALTER TABLE "GiftRegistry" ADD COLUMN IF NOT EXISTS "giftPreferences" TEXT;
ALTER TABLE "GiftRegistry" ADD COLUMN IF NOT EXISTS "coverImageUrl" TEXT;
ALTER TABLE "GiftRegistry" ADD COLUMN IF NOT EXISTS "visibility" "RegistryVisibility" NOT NULL DEFAULT 'PRIVATE';
ALTER TABLE "GiftRegistry" ADD COLUMN IF NOT EXISTS "viewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GiftRegistry" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "GiftRegistry_ownerUserId_idx" ON "GiftRegistry"("ownerUserId");
CREATE INDEX IF NOT EXISTS "GiftRegistry_status_idx" ON "GiftRegistry"("status");
CREATE INDEX IF NOT EXISTS "GiftRegistry_visibility_idx" ON "GiftRegistry"("visibility");

-- GiftRegistryItem
ALTER TABLE "GiftRegistryItem" ADD COLUMN IF NOT EXISTS "canonicalUrl" TEXT;
ALTER TABLE "GiftRegistryItem" ADD COLUMN IF NOT EXISTS "storeName" TEXT;
ALTER TABLE "GiftRegistryItem" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "GiftRegistryItem" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "GiftRegistryItem" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'INR';
ALTER TABLE "GiftRegistryItem" ADD COLUMN IF NOT EXISTS "quantityDesired" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "GiftRegistryItem" ADD COLUMN IF NOT EXISTS "quantityPurchased" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GiftRegistryItem" ADD COLUMN IF NOT EXISTS "quantityReserved" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GiftRegistryItem" ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GiftRegistryItem" ADD COLUMN IF NOT EXISTS "extractionStatus" "ExtractionStatus" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "GiftRegistryItem" ADD COLUMN IF NOT EXISTS "extractionMethod" TEXT;
ALTER TABLE "GiftRegistryItem" ADD COLUMN IF NOT EXISTS "extractionError" TEXT;
ALTER TABLE "GiftRegistryItem" ADD COLUMN IF NOT EXISTS "extractedAt" TIMESTAMP(3);
ALTER TABLE "GiftRegistryItem" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "GiftRegistryItem" SET "quantityPurchased" = 1 WHERE "status" = 'PURCHASED' AND "quantityPurchased" = 0;

CREATE INDEX IF NOT EXISTS "GiftRegistryItem_registryId_idx" ON "GiftRegistryItem"("registryId");
CREATE INDEX IF NOT EXISTS "GiftRegistryItem_status_idx" ON "GiftRegistryItem"("status");
CREATE INDEX IF NOT EXISTS "GiftRegistryItem_extractionStatus_idx" ON "GiftRegistryItem"("extractionStatus");

-- Contributions
ALTER TABLE "GiftRegistryContribution" ALTER COLUMN "gifterUserId" DROP NOT NULL;
ALTER TABLE "GiftRegistryContribution" ADD COLUMN IF NOT EXISTS "guestName" TEXT;
ALTER TABLE "GiftRegistryContribution" ADD COLUMN IF NOT EXISTS "guestEmail" TEXT;
ALTER TABLE "GiftRegistryContribution" ADD COLUMN IF NOT EXISTS "quantity" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "GiftRegistryContribution" ADD COLUMN IF NOT EXISTS "status" "GiftContributionStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "GiftRegistryContribution" ADD COLUMN IF NOT EXISTS "reservedUntil" TIMESTAMP(3);
ALTER TABLE "GiftRegistryContribution" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "GiftRegistryContribution" c
SET "status" = 'PAID'
FROM "Order" o
WHERE c."orderId" = o.id AND o."paymentStatus" = 'PAID';

CREATE INDEX IF NOT EXISTS "GiftRegistryContribution_registryItemId_idx" ON "GiftRegistryContribution"("registryItemId");
CREATE INDEX IF NOT EXISTS "GiftRegistryContribution_orderId_idx" ON "GiftRegistryContribution"("orderId");
CREATE INDEX IF NOT EXISTS "GiftRegistryContribution_status_idx" ON "GiftRegistryContribution"("status");

-- Extraction cache
CREATE TABLE IF NOT EXISTS "ExternalProductExtraction" (
  "id" TEXT NOT NULL,
  "urlHash" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "title" TEXT,
  "description" TEXT,
  "image" TEXT,
  "priceInPaise" INTEGER,
  "currency" TEXT,
  "storeName" TEXT,
  "canonicalUrl" TEXT,
  "extractionMethod" TEXT,
  "extractionStatus" "ExtractionStatus" NOT NULL,
  "extractionError" TEXT,
  "rawMeta" JSONB,
  "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExternalProductExtraction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExternalProductExtraction_urlHash_key" ON "ExternalProductExtraction"("urlHash");
CREATE INDEX IF NOT EXISTS "ExternalProductExtraction_extractionStatus_idx" ON "ExternalProductExtraction"("extractionStatus");
CREATE INDEX IF NOT EXISTS "ExternalProductExtraction_extractedAt_idx" ON "ExternalProductExtraction"("extractedAt");

-- FKs
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_registryId_fkey";
ALTER TABLE "Order" ADD CONSTRAINT "Order_registryId_fkey" FOREIGN KEY ("registryId") REFERENCES "GiftRegistry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_registryItemId_fkey";
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_registryItemId_fkey" FOREIGN KEY ("registryItemId") REFERENCES "GiftRegistryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
