-- WhatsApp phone verification + webhook status-lookup indexes.
-- 1) User.phoneVerifiedAt — mirrors emailVerifiedAt for phone verification via WhatsApp.
-- 2) PhoneVerificationToken — mirrors EmailVerificationToken/PasswordResetToken (hashed, single-use, expiring link tokens).
-- 3) Indexes on Order.whatsappMessageId / Invoice.whatsappMessageId for O(1) webhook status-update lookups.

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PhoneVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestIp" TEXT,

    CONSTRAINT "PhoneVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PhoneVerificationToken_tokenHash_key" ON "PhoneVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PhoneVerificationToken_userId_idx" ON "PhoneVerificationToken"("userId");

-- AddForeignKey
ALTER TABLE "PhoneVerificationToken" ADD CONSTRAINT "PhoneVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Order_whatsappMessageId_idx" ON "Order"("whatsappMessageId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invoice_whatsappMessageId_idx" ON "Invoice"("whatsappMessageId");
