-- Payment status: cancelled checkout / abandoned Razorpay modal
DO $$ BEGIN
  ALTER TYPE "PaymentStatus" ADD VALUE 'CANCELLED';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "CustomizationFollowUpStatus" AS ENUM (
    'NOT_REQUIRED',
    'REQUIRED',
    'CONTACTED',
    'CONFIRMED',
    'COMPLETED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "PaymentEvent" (
  "id" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "razorpayOrderId" TEXT,
  "razorpayPaymentId" TEXT,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payload" JSONB,
  CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentEvent_eventKey_key" ON "PaymentEvent"("eventKey");
CREATE INDEX IF NOT EXISTS "PaymentEvent_razorpayOrderId_idx" ON "PaymentEvent"("razorpayOrderId");
CREATE INDEX IF NOT EXISTS "PaymentEvent_razorpayPaymentId_idx" ON "PaymentEvent"("razorpayPaymentId");

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customizationFollowUpStatus" "CustomizationFollowUpStatus" NOT NULL DEFAULT 'NOT_REQUIRED';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "adminNotes" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "confirmationEmailSentAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "whatsappSentAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Order_paymentStatus_idx" ON "Order"("paymentStatus");

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "customizationFollowUpStatus" "CustomizationFollowUpStatus" NOT NULL DEFAULT 'NOT_REQUIRED';
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "adminNotes" TEXT;

DO $$ BEGIN
  ALTER TABLE "Invoice"
    ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
