-- Package upgrades (Gift Registry as a paid add-on after Signature/Grand purchase)

ALTER TYPE "OrderKind" ADD VALUE IF NOT EXISTS 'UPGRADE';

DO $$ BEGIN
  CREATE TYPE "PackageUpgradeKind" AS ENUM ('GIFT_REGISTRY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PackageUpgrade" (
  "id" TEXT NOT NULL,
  "kind" "PackageUpgradeKind" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "priceInPaise" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PackageUpgrade_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PackageUpgrade_kind_key" ON "PackageUpgrade"("kind");
CREATE INDEX IF NOT EXISTS "PackageUpgrade_kind_idx" ON "PackageUpgrade"("kind");

CREATE TABLE IF NOT EXISTS "PackageUpgradeEligibility" (
  "upgradeId" TEXT NOT NULL,
  "packageId" TEXT NOT NULL,
  CONSTRAINT "PackageUpgradeEligibility_pkey" PRIMARY KEY ("upgradeId", "packageId")
);

ALTER TABLE "PackageUpgradeEligibility"
  DROP CONSTRAINT IF EXISTS "PackageUpgradeEligibility_upgradeId_fkey";
ALTER TABLE "PackageUpgradeEligibility"
  ADD CONSTRAINT "PackageUpgradeEligibility_upgradeId_fkey"
  FOREIGN KEY ("upgradeId") REFERENCES "PackageUpgrade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PackageUpgradeEligibility"
  DROP CONSTRAINT IF EXISTS "PackageUpgradeEligibility_packageId_fkey";
ALTER TABLE "PackageUpgradeEligibility"
  ADD CONSTRAINT "PackageUpgradeEligibility_packageId_fkey"
  FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "parentOrderId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "upgradeId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "upgradeKind" "PackageUpgradeKind";

CREATE INDEX IF NOT EXISTS "Order_parentOrderId_idx" ON "Order"("parentOrderId");
CREATE INDEX IF NOT EXISTS "Order_upgradeKind_idx" ON "Order"("upgradeKind");

ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_parentOrderId_fkey";
ALTER TABLE "Order"
  ADD CONSTRAINT "Order_parentOrderId_fkey"
  FOREIGN KEY ("parentOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_upgradeId_fkey";
ALTER TABLE "Order"
  ADD CONSTRAINT "Order_upgradeId_fkey"
  FOREIGN KEY ("upgradeId") REFERENCES "PackageUpgrade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GiftRegistry" ADD COLUMN IF NOT EXISTS "sourceOrderId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "GiftRegistry_sourceOrderId_key" ON "GiftRegistry"("sourceOrderId");

ALTER TABLE "GiftRegistry" DROP CONSTRAINT IF EXISTS "GiftRegistry_sourceOrderId_fkey";
ALTER TABLE "GiftRegistry"
  ADD CONSTRAINT "GiftRegistry_sourceOrderId_fkey"
  FOREIGN KEY ("sourceOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
