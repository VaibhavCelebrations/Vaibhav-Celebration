ALTER TABLE "Package"
  ADD COLUMN "displayName" TEXT,
  ADD COLUMN "badgeText" TEXT,
  ADD COLUMN "pricingUnit" TEXT,
  ADD COLUMN "hasGiftRegistry" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Product"
  ADD COLUMN "personalizationEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "personalizationCostInPaise" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "CartItem"
  ADD COLUMN "personalizationCostSnapshot" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "OrderItem"
  ADD COLUMN "personalizationCostSnapshot" INTEGER NOT NULL DEFAULT 0;
