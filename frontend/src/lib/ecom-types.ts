/* ===================================================================
   E-Commerce Types — Frontend Only
   All interfaces for the gifts/return-gifts shop experience
   =================================================================== */

/* ── Product Domain ───────────────────────────────────────────────── */

export interface ProductPersonalizationField {
  id: string;
  label: string;            // e.g. "Child's Name"
  type: "text" | "number" | "shortText";
  required: boolean;
  placeholder?: string;
  maxLength?: number;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  sku: string;
  price: number;            // in INR
  compareAtPrice?: number;  // strike-through price for discounts
  description: string;
  shortDescription: string;
  images: string[];
  categoryId: string;
  themeTags: string[];      // theme slugs: "space-theme", "cocomelon-theme" etc
  categoryTags: string[];   // "return-gifts", "activity-kits" etc
  stock: number;
  maxOrderQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  personalizationFields: ProductPersonalizationField[];
  createdAt: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  icon: string; // lucide icon name
  description: string;
  productCount: number;
}

/* ── Stock Status (derived) ───────────────────────────────────────── */

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export function getStockStatus(product: Product): StockStatus {
  if (product.stock <= 0) return "out_of_stock";
  if (product.stock <= product.lowStockThreshold) return "low_stock";
  return "in_stock";
}

export function getMaxPurchasable(product: Product): number {
  return Math.min(product.maxOrderQuantity, product.stock);
}

/* ── Cart Domain ──────────────────────────────────────────────────── */

export interface PersonalizationValue {
  fieldId: string;
  label: string;
  value: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  personalizationValues: PersonalizationValue[];
}

export interface CartPackage {
  id: string; // Unique cart identifier to allow multiple instances
  packageId: string;
  themeSlug: string;
  basePrice: number;
  addons: CartItem[]; // Gifts & Activity Kits grouped within this package
}

export interface CartSummary {
  items: CartItem[];
  packages: CartPackage[];
  itemCount: number;
  subtotal: number;
  gst: number;        // 18%
  total: number;
}

/* ── Auth / Quick Form Domain ─────────────────────────────────────── */

export interface QuickFormData {
  fullName: string;
  phone: string;
  email: string;
  childName: string;
  childAge: number | "";
  birthDate: string;    // ISO date
  eventDate: string;    // ISO date
  city: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
}

/* ── Checkout Domain ──────────────────────────────────────────────── */

export interface ShippingAddress {
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
}

export interface CheckoutState {
  selectedThemeSlug: string | null;
  selectedPackageId: string | null;
  returnGifts: CartItem[];
  eventDetails: QuickFormData | null;
  shippingAddress: ShippingAddress | null;
}

/* ── Gift Filter ──────────────────────────────────────────────────── */

export interface GiftFilter {
  theme: string | null;      // theme slug or null for all
  category: string | null;   // category slug or null for all
  search: string;
  sortBy: "price_asc" | "price_desc" | "newest" | "popularity";
  priceRange: [number, number] | null;
}
