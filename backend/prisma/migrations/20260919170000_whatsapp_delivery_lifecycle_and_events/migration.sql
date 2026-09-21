-- Zero-Data-Loss Migration: WhatsApp Delivery Lifecycle & Webhook Events
-- 1) Add granular timestamps and error tracking to Order and Invoice
-- 2) Create WhatsAppWebhookEvent table for fast acknowledgment and idempotency

-- AlterTable Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "whatsappDeliveredAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "whatsappReadAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "whatsappError" TEXT;

-- AlterTable Invoice
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "whatsappDeliveredAt" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "whatsappReadAt" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "whatsappError" TEXT;

-- CreateTable WhatsAppWebhookEvent
CREATE TABLE IF NOT EXISTS "WhatsAppWebhookEvent" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "eventType" TEXT NOT NULL DEFAULT 'STATUS_UPDATE',
    "providerMessageId" TEXT,
    "status" TEXT,
    "payload" JSONB,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppWebhookEvent_eventKey_key" ON "WhatsAppWebhookEvent"("eventKey");
CREATE INDEX IF NOT EXISTS "WhatsAppWebhookEvent_providerMessageId_idx" ON "WhatsAppWebhookEvent"("providerMessageId");
CREATE INDEX IF NOT EXISTS "WhatsAppWebhookEvent_processed_idx" ON "WhatsAppWebhookEvent"("processed");
CREATE INDEX IF NOT EXISTS "WhatsAppWebhookEvent_createdAt_idx" ON "WhatsAppWebhookEvent"("createdAt");
