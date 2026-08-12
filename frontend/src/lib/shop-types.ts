/* ===================================================================
   Shop Types — mirrors the backend catalog/cart/wishlist/orders/registry
   API response shapes exactly (money in paise, images as media refs).
   This is the single source of truth for the real e-commerce data model;
   ecom-types.ts retains only the few remaining mock-only concepts.
   =================================================================== */

/* ── Product Domain ───────────────────────────────────────────────── */

export type StockStatusFlag = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export interface MediaRef {
  url: string;
  altText?: string | null;
}

export interface ProductPersonalizationField {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: "text" | "number" | "shortText";
  isRequired: boolean;
  maxLength: number | null;
}

export interface ProductImageEntry {
  id: string;
  displayOrder: number;
  media: MediaRef;
}

export interface ProductCategoryRef {
  id: string;
  name: string;
  slug: string;
}

export interface ProductThemeRef {
  id: string;
  title: string;
  slug: string;
}

export interface ProductStock {
  quantityAvailable: number;
  statusFlag: StockStatusFlag;
  lowStockThreshold: number;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  sku: string;
  description: string;
  priceInPaise: number;
  compareAtPriceInPaise: number | null;
  personalizationEnabled: boolean;
  personalizationCostInPaise: number;
  isActive: boolean;
  minOrderQuantity: number;
  maxOrderQuantity: number | null;
  images: ProductImageEntry[];
  categories: ProductCategoryRef[];
  themes: ProductThemeRef[];
  personalizationFields: ProductPersonalizationField[];
  stock: ProductStock | null;
  createdAt: string;
  updatedAt?: string;
  related?: Product[];
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
}

export type ProductListResult = { items: Product[]; total: number; page: number; pageSize: number };

export interface ProductCollection {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  heroImage: MediaRef | null;
  startsAt: string | null;
  endsAt: string | null;
  showOnHomepage: boolean;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  products: Product[];
  productCount: number;
}

/* ── Derived helpers ───────────────────────────────────────────────── */

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export function getStockStatus(product: Pick<Product, "stock">): StockStatus {
  const flag = product.stock?.statusFlag ?? "OUT_OF_STOCK";
  if (flag === "OUT_OF_STOCK") return "out_of_stock";
  if (flag === "LOW_STOCK") return "low_stock";
  return "in_stock";
}

export function getMaxPurchasable(product: Pick<Product, "stock" | "maxOrderQuantity">): number {
  const available = product.stock?.quantityAvailable ?? 0;
  return product.maxOrderQuantity ? Math.min(product.maxOrderQuantity, available) : available;
}

export function productImageUrl(product: Pick<Product, "images">, index = 0): string {
  return product.images[index]?.media.url ?? "/placeholder-product.svg";
}

/** Converts paise (integer) to a rupee number for display/math. */
export function toRupees(paise: number): number {
  return Math.round(paise) / 100;
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function formatPaise(paise: number): string {
  return inr.format(toRupees(paise));
}

/* ── Cart (server-backed) ─────────────────────────────────────────── */

export interface ServerCartItem {
  id: string;
  productId: string;
  title: string;
  slug: string;
  unitPriceInPaise: number;
  quantity: number;
  personalizationValues: Array<{ fieldId: string; label: string; value: string }> | null;
  personalizationCostInPaise: number;
  image: MediaRef | null;
  isActive: boolean;
  stockAvailable: number;
  stockStatus: StockStatusFlag;
  maxOrderQuantity: number | null;
}

export interface CartQuoteLine {
  productId: string;
  unitPriceInPaise: number;
  personalizationCostInPaise: number;
  quantity: number;
  lineTotalInPaise: number;
}

export interface CartQuote {
  subtotalInPaise: number;
  gstPercent: number;
  gstInPaise: number;
  totalInPaise: number;
  lines: CartQuoteLine[];
}

export interface ServerCart {
  items: ServerCartItem[];
  quote: CartQuote;
  itemCount: number;
}

/* ── Wishlist ─────────────────────────────────────────────────────── */

export interface WishlistItemDto {
  id: string;
  productId: string;
  title: string;
  slug: string;
  priceInPaise: number;
  image: MediaRef | null;
  isActive: boolean;
  stockStatus: StockStatusFlag;
  addedAt: string;
}

/* ── Checkout / Orders ────────────────────────────────────────────── */

export interface ShippingAddress {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export type OrderStatus = "PENDING_PAYMENT" | "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

export interface OrderItemDto {
  id: string;
  productId: string;
  title: string;
  slug: string;
  quantity: number;
  unitPriceInPaise: number;
  personalizationCostInPaise: number;
  lineTotalInPaise: number;
  image: MediaRef | null;
}

export interface OrderDto {
  id: string;
  orderCode: string;
  status: OrderStatus;
  subtotalInPaise: number;
  gstInPaise: number;
  totalInPaise: number;
  shippingAddress: ShippingAddress;
  contactEmail: string;
  contactPhone: string;
  invoicePdfUrl: string | null;
  placedAt: string;
  createdAt: string;
  items: OrderItemDto[];
}

export interface CheckoutQuoteResult {
  quote: CartQuote;
  items: Array<{ productId: string; title: string; quantity: number; unitPriceInPaise: number; personalizationCostInPaise: number }>;
}

export interface CreateOrderResult {
  orderId: string;
  orderCode: string;
  totalInPaise: number;
  razorpayOrderId: string;
  razorpayKeyId: string;
}

/* ── Gift Registry ────────────────────────────────────────────────── */

export type RegistryStatus = "ACTIVE" | "EXPIRED" | "CLOSED";
export type GiftLinkSourceType = "EXTERNAL_LINK" | "INTERNAL_PRODUCT";
export type GiftItemStatus = "AVAILABLE" | "RESERVED" | "PURCHASED";

export interface GiftRegistryItemDto {
  id: string;
  sourceType: GiftLinkSourceType;
  title: string;
  priceInPaise: number | null;
  image: MediaRef | null;
  externalUrl: string | null;
  internalProductId: string | null;
  internalProductSlug: string | null;
  canGiftDirectly: boolean;
  inStock: boolean;
  status: GiftItemStatus;
  displayOrder: number;
}

export interface GiftRegistryDto {
  id: string;
  registryCode: string;
  childOrPersonName: string | null;
  celebrationDetails: string | null;
  photoMediaId: string | null;
  status: RegistryStatus;
  activatedAt: string;
  expiresAt: string;
  ownerUserId: string;
  shareUrl: string;
}

export interface GiftRegistryDetailDto extends GiftRegistryDto {
  items: GiftRegistryItemDto[];
}

export interface PublicRegistryDto {
  registryCode: string;
  childOrPersonName: string | null;
  celebrationDetails: string | null;
  photoMediaId: string | null;
  expiresAt: string;
  items: GiftRegistryItemDto[];
}

/* ── Gift filter (client-side product listing filter state) ─────────── */

export interface GiftFilter {
  theme: string | null;
  category: string | null;
  search: string;
  sortBy: "price_asc" | "price_desc" | "newest";
}
