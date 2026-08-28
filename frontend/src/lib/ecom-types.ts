/* ===================================================================
   Remaining "local-only" e-commerce types.

   Real product/cart/wishlist/order/registry types now live in
   `shop-types.ts` and are backed by the live API — see `shop-api.ts`.

   What's left here is the event-package "add to my package" flow
   (build-package → cart "packages"), which is part of the separate
   venue/package booking system (not the Product/Cart schema this
   e-commerce rewrite covers) and keeps its existing client-only
   behavior unchanged.
   =================================================================== */

import type { Product } from "./shop-types";

/* ── Authenticated customer ───────────────────────────────────────── */

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLoginAt: string | null;
  defaultAddress?: import("./shop-types").ShippingAddress | null;
}

/* ── Personalization (shared shape for cart line customization) ──────── */

export interface PersonalizationValue {
  fieldId: string;
  label: string;
  value: string;
}

/* ── Event package add-ons (client-only) ──────────────────────────── */

export interface PackageAddonItem {
  product: Product;
  quantity: number;
  personalizationValues: PersonalizationValue[];
}

export interface CartPackage {
  id: string; // unique cart identifier to allow multiple instances
  packageId: string;
  themeSlug: string;
  basePrice: number;
  addons: PackageAddonItem[];
  builderInput?: any; // Stores the BuilderQuoteInput used to generate this package
}
