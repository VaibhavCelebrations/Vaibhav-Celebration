CREATE TABLE "ProductCollection" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "heroImageId" TEXT,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "showOnHomepage" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "ProductCollection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductCollectionItem" (
  "collectionId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ProductCollectionItem_pkey" PRIMARY KEY ("collectionId", "productId")
);

CREATE UNIQUE INDEX "ProductCollection_slug_key" ON "ProductCollection"("slug");
CREATE INDEX "ProductCollection_showOnHomepage_idx" ON "ProductCollection"("showOnHomepage");
CREATE INDEX "ProductCollection_title_idx" ON "ProductCollection" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "ProductCollection_slug_idx" ON "ProductCollection" USING GIN ("slug" gin_trgm_ops);

ALTER TABLE "ProductCollection"
  ADD CONSTRAINT "ProductCollection_heroImageId_fkey"
  FOREIGN KEY ("heroImageId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductCollectionItem"
  ADD CONSTRAINT "ProductCollectionItem_collectionId_fkey"
  FOREIGN KEY ("collectionId") REFERENCES "ProductCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductCollectionItem"
  ADD CONSTRAINT "ProductCollectionItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
