-- Allow admin to pick one featured blog post for the public blog listing.
ALTER TABLE "BlogPost" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;
