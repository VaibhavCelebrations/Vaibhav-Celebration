-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "personalizationSelected" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "fulfillmentStatus" TEXT,
ADD COLUMN     "personalizationSelected" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Package" ADD COLUMN     "internalKey" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "personalizationConstraints" JSONB,
ADD COLUMN     "personalizationInstructions" TEXT;
