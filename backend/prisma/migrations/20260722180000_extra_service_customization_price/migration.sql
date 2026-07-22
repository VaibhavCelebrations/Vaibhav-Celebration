-- Move customization price from per-package matrix cell to global extra service catalog.

ALTER TABLE "ExtraService" ADD COLUMN "customizationPriceInPaise" INTEGER NOT NULL DEFAULT 0;

UPDATE "ExtraService" es
SET "customizationPriceInPaise" = COALESCE(
  (
    SELECT MAX(psi."customizationPriceInPaise")
    FROM "PackageServiceItem" psi
    WHERE psi."extraServiceId" = es.id
  ),
  0
);

ALTER TABLE "PackageServiceItem" DROP COLUMN "customizationPriceInPaise";
