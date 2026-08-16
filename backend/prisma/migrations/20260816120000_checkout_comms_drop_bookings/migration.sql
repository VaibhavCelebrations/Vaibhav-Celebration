-- Checkout communications + retire Booking domain.
-- 1) Add notification columns
-- 2) Migrate Booking rows to PACKAGE Orders
-- 3) Drop booking tables and unused enums

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "emailSendStatus" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "whatsappSendStatus" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "whatsappMessageId" TEXT;

ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "emailSendStatus" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "whatsappMessageId" TEXT;

-- Users for booking guests who do not already have an account
INSERT INTO "User" (id, name, email, phone, "passwordHash", status, "createdAt", "updatedAt")
SELECT
  'usr_mig_' || substr(md5(lower(b."guestEmail")), 1, 20),
  COALESCE(NULLIF(c."fullName", ''), split_part(b."guestEmail", '@', 1)),
  lower(b."guestEmail"),
  b."guestPhone",
  '$2b$10$C6UzMDM.H6dfI/f/IKcEeOjzQd3pJqKqKqKqKqKqKqKqKqKqKqKqK',
  'ACTIVE',
  NOW(),
  NOW()
FROM "Booking" b
JOIN "Customer" c ON c.id = b."customerId"
WHERE NOT EXISTS (
  SELECT 1 FROM "User" u WHERE lower(u.email) = lower(b."guestEmail")
)
ON CONFLICT ("email") DO NOTHING;

-- PACKAGE orders from bookings
INSERT INTO "Order" (
  id, "orderCode", "userId", kind, status, "paymentStatus", "customizationFollowUpStatus",
  "adminNotes", "subtotalInPaise", "gstInPaise", "totalInPaise", "shippingAddress",
  "contactEmail", "contactPhone", "eventDate", "eventDetails",
  "razorpayOrderId", "razorpayPaymentId", "placedAt", "createdAt", "updatedAt"
)
SELECT
  'ord_mig_' || b.id,
  'VBC-MIG-' || b."bookingCode",
  u.id,
  'PACKAGE',
  CASE
    WHEN b.status::text = 'CANCELLED' THEN 'CANCELLED'::"OrderStatus"
    WHEN b."paymentStatus"::text = 'PAID' AND b.status::text = 'COMPLETED' THEN 'DELIVERED'::"OrderStatus"
    WHEN b."paymentStatus"::text = 'PAID' THEN 'PAID'::"OrderStatus"
    ELSE 'PENDING_PAYMENT'::"OrderStatus"
  END,
  b."paymentStatus",
  b."customizationFollowUpStatus",
  b."adminNotes",
  b."basePriceInPaise" + b."customizationTotalInPaise",
  b."gstInPaise",
  b."totalPriceInPaise",
  jsonb_build_object(
    'fullName', c."fullName",
    'line1', 'Migrated from booking ' || b."bookingCode",
    'city', 'Jaipur',
    'state', 'Rajasthan',
    'pincode', '000000',
    'country', 'India'
  ),
  b."guestEmail",
  b."guestPhone",
  b."eventDate",
  jsonb_build_object('migratedFromBookingCode', b."bookingCode"),
  b."razorpayOrderId",
  b."razorpayPaymentId",
  b."createdAt",
  b."createdAt",
  b."updatedAt"
FROM "Booking" b
JOIN "Customer" c ON c.id = b."customerId"
JOIN "User" u ON lower(u.email) = lower(b."guestEmail")
ON CONFLICT ("orderCode") DO NOTHING;

INSERT INTO "OrderPackage" (
  id, "orderId", "packageId", "themeId", "basePriceInPaise", "customizationTotalInPaise", "createdAt"
)
SELECT
  'opkg_mig_' || b.id,
  'ord_mig_' || b.id,
  b."packageId",
  b."themeId",
  b."basePriceInPaise",
  b."customizationTotalInPaise",
  b."createdAt"
FROM "Booking" b
WHERE EXISTS (SELECT 1 FROM "Order" o WHERE o.id = 'ord_mig_' || b.id)
ON CONFLICT ("orderId") DO NOTHING;

INSERT INTO "OrderPackageLine" (
  id, "orderPackageId", "packageServiceItemId", label, quantity, "unitPriceInPaise"
)
SELECT
  'opl_mig_' || bc.id,
  'opkg_mig_' || bc."bookingId",
  bc."packageServiceItemId",
  COALESCE(es.label, 'Package line'),
  bc.quantity,
  bc."unitPriceInPaise"
FROM "BookingCustomization" bc
LEFT JOIN "PackageServiceItem" psi ON psi.id = bc."packageServiceItemId"
LEFT JOIN "ExtraService" es ON es.id = psi."extraServiceId"
WHERE EXISTS (SELECT 1 FROM "OrderPackage" op WHERE op.id = 'opkg_mig_' || bc."bookingId");

UPDATE "Invoice" i
SET
  "orderId" = 'ord_mig_' || i."bookingId",
  "linkedType" = 'ORDER'
WHERE i."bookingId" IS NOT NULL
  AND EXISTS (SELECT 1 FROM "Order" o WHERE o.id = 'ord_mig_' || i."bookingId");

UPDATE "Order" o
SET
  "invoiceNumber" = i."invoiceNumber",
  "invoicePdfUrl" = i."pdfUrl"
FROM "Invoice" i
WHERE i."orderId" = o.id
  AND o.id LIKE 'ord_mig_%';

-- Recreate InvoiceLinkedType without BOOKING
ALTER TABLE "Invoice" ALTER COLUMN "linkedType" DROP DEFAULT;
CREATE TYPE "InvoiceLinkedType_new" AS ENUM ('ORDER', 'EVENT_REGISTRATION');
ALTER TABLE "Invoice"
  ALTER COLUMN "linkedType" TYPE "InvoiceLinkedType_new"
  USING (
    CASE
      WHEN "linkedType"::text = 'BOOKING' THEN 'ORDER'::"InvoiceLinkedType_new"
      ELSE "linkedType"::text::"InvoiceLinkedType_new"
    END
  );
DROP TYPE "InvoiceLinkedType";
ALTER TYPE "InvoiceLinkedType_new" RENAME TO "InvoiceLinkedType";

ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_bookingId_fkey";
ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "bookingId";

ALTER TABLE "GiftRegistry" DROP CONSTRAINT IF EXISTS "GiftRegistry_bookingId_fkey";
DROP INDEX IF EXISTS "GiftRegistry_bookingId_key";
ALTER TABLE "GiftRegistry" DROP COLUMN IF EXISTS "bookingId";

DROP TABLE IF EXISTS "BookingCustomization";
DROP TABLE IF EXISTS "Booking";
DROP TABLE IF EXISTS "BookingCapacityRule";

DROP TYPE IF EXISTS "BookingStatus";
DROP TYPE IF EXISTS "CapacityScope";
