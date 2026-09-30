-- Add-on products: a product the admin marks as an optional add-on. It stays in the shop and is
-- also offered, for the themes it is tagged with, in the package builder and the custom plan.
-- Additive only: one new column with a default; no existing product changes.

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isAddon" BOOLEAN NOT NULL DEFAULT false;
