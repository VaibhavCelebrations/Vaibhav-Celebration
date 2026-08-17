-- Package celebration purchases use the Order system (not Booking).

CREATE TYPE "OrderKind" AS ENUM ('SHOP', 'PACKAGE');

ALTER TABLE "Order" ADD COLUMN "kind" "OrderKind" NOT NULL DEFAULT 'SHOP';
ALTER TABLE "Order" ADD COLUMN "eventDate" DATE;
ALTER TABLE "Order" ADD COLUMN "eventDetails" JSONB;

CREATE TABLE "OrderPackage" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "basePriceInPaise" INTEGER NOT NULL,
    "customizationTotalInPaise" INTEGER NOT NULL DEFAULT 0,
    "guestCount" INTEGER,
    "location" TEXT,
    "builderInput" JSONB,
    "quoteSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderPackage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderPackageLine" (
    "id" TEXT NOT NULL,
    "orderPackageId" TEXT NOT NULL,
    "packageServiceItemId" TEXT,
    "label" TEXT NOT NULL,
    "sku" TEXT,
    "section" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPriceInPaise" INTEGER NOT NULL,

    CONSTRAINT "OrderPackageLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderPackage_orderId_key" ON "OrderPackage"("orderId");
CREATE INDEX "Order_kind_idx" ON "Order"("kind");
CREATE INDEX "Order_eventDate_idx" ON "Order"("eventDate");

ALTER TABLE "OrderPackage" ADD CONSTRAINT "OrderPackage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderPackage" ADD CONSTRAINT "OrderPackage_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderPackage" ADD CONSTRAINT "OrderPackage_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrderPackageLine" ADD CONSTRAINT "OrderPackageLine_orderPackageId_fkey" FOREIGN KEY ("orderPackageId") REFERENCES "OrderPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderPackageLine" ADD CONSTRAINT "OrderPackageLine_packageServiceItemId_fkey" FOREIGN KEY ("packageServiceItemId") REFERENCES "PackageServiceItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
