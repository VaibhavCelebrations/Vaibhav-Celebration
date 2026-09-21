-- AlterTable EmailVerificationToken
ALTER TABLE "EmailVerificationToken" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "EmailVerificationToken" ADD COLUMN IF NOT EXISTS "otpHash" TEXT;
ALTER TABLE "EmailVerificationToken" ADD COLUMN IF NOT EXISTS "attemptCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EmailVerificationToken" ALTER COLUMN "tokenHash" DROP NOT NULL;

-- AlterTable PhoneVerificationToken
ALTER TABLE "PhoneVerificationToken" ADD COLUMN IF NOT EXISTS "otpHash" TEXT;
ALTER TABLE "PhoneVerificationToken" ADD COLUMN IF NOT EXISTS "attemptCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PhoneVerificationToken" ALTER COLUMN "tokenHash" DROP NOT NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PhoneVerificationToken_phoneNumber_idx" ON "PhoneVerificationToken"("phoneNumber");
