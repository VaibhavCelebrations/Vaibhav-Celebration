-- AlterTable
ALTER TABLE "MediaAsset" ADD COLUMN     "category" TEXT,
ADD COLUMN     "folder" TEXT;

-- CreateIndex
CREATE INDEX "MediaAsset_category_idx" ON "MediaAsset"("category");
