-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateIndex
CREATE INDEX "BlogPost_title_idx" ON "BlogPost" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "BlogPost_slug_idx" ON "BlogPost" USING GIN ("slug" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Customer_fullName_idx" ON "Customer" USING GIN ("fullName" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Customer_email_gin_idx" ON "Customer" USING GIN ("email" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Customer_phone_gin_idx" ON "Customer" USING GIN ("phone" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Event_title_idx" ON "Event" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Event_slug_idx" ON "Event" USING GIN ("slug" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "FAQ_question_idx" ON "FAQ" USING GIN ("question" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "FAQ_answer_idx" ON "FAQ" USING GIN ("answer" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "GalleryImage_caption_idx" ON "GalleryImage" USING GIN ("caption" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "GalleryImage_altText_idx" ON "GalleryImage" USING GIN ("altText" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Lead_name_idx" ON "Lead" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead" USING GIN ("email" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "MediaAsset_altText_idx" ON "MediaAsset" USING GIN ("altText" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "MediaAsset_cdnKey_idx" ON "MediaAsset" USING GIN ("cdnKey" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Package_title_idx" ON "Package" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Package_slug_idx" ON "Package" USING GIN ("slug" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Testimonial_customerName_idx" ON "Testimonial" USING GIN ("customerName" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Testimonial_content_idx" ON "Testimonial" USING GIN ("content" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Theme_title_idx" ON "Theme" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Theme_slug_idx" ON "Theme" USING GIN ("slug" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Theme_shortDescription_idx" ON "Theme" USING GIN ("shortDescription" gin_trgm_ops);
