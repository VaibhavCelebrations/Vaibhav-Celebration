-- Fiverr-style package matrix: ExtraService + PackageServiceItem

-- Drop old customization FK
ALTER TABLE "BookingCustomization" DROP CONSTRAINT IF EXISTS "BookingCustomization_optionId_fkey";
ALTER TABLE "BookingCustomization" DROP COLUMN IF EXISTS "optionId";

-- Drop old tables
DROP TABLE IF EXISTS "PackageCustomizationOption";
DROP TABLE IF EXISTS "PackageAddOn";
DROP TABLE IF EXISTS "AddOnService";
DROP TABLE IF EXISTS "PackageFeature";

-- ExtraService catalog
CREATE TABLE "ExtraService" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "requirements" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ExtraService_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExtraService_label_idx" ON "ExtraService" USING GIN ("label" gin_trgm_ops);

-- PackageServiceItem matrix
CREATE TABLE "PackageServiceItem" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "extraServiceId" TEXT NOT NULL,
    "isIncluded" BOOLEAN NOT NULL DEFAULT false,
    "customizationPriceInPaise" INTEGER NOT NULL DEFAULT 0,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PackageServiceItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PackageServiceItem_packageId_extraServiceId_key" ON "PackageServiceItem"("packageId", "extraServiceId");

ALTER TABLE "PackageServiceItem" ADD CONSTRAINT "PackageServiceItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PackageServiceItem" ADD CONSTRAINT "PackageServiceItem_extraServiceId_fkey" FOREIGN KEY ("extraServiceId") REFERENCES "ExtraService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BookingCustomization new FK
ALTER TABLE "BookingCustomization" ADD COLUMN IF NOT EXISTS "packageServiceItemId" TEXT;
ALTER TABLE "BookingCustomization" ADD CONSTRAINT "BookingCustomization_packageServiceItemId_fkey" FOREIGN KEY ("packageServiceItemId") REFERENCES "PackageServiceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
