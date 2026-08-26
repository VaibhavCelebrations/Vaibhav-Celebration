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
  return product.images[index]?.media?.url ?? "/placeholder-product.svg";
}

/** Converts paise (integer) to a rupee number for display/math. */
export function toRupees(paise: number): number {
  return Math.round(paise) / 100;
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function formatPaise(paise: number): string {
  return inr.format(toRupees(Number.isFinite(paise) ? paise : 0));
}

/* ── Cart (server-backed) ─────────────────────────────────────────── */

export interface ServerCartItem {
  id: string;
  productId: string;
  registryItemId?: string | null;
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
  registry?: { registryCode: string; giftTitle: string; recipientName: string | null } | null;
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
  shippingInPaise: number;
  shippingWaived: boolean;
  freeShippingThresholdInPaise: number;
  amountUntilFreeShippingInPaise: number;
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

export type OrderStatus = "PENDING_PAYMENT" | "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";
export type PaymentStatus = "NOT_REQUIRED" | "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED" | "PARTIALLY_REFUNDED";

export interface OrderItemDto {
  id: string;
  productId: string;
  title: string;
  slug: string;
  quantity: number;
  unitPriceInPaise: number;
  personalizationCostInPaise: number;
  personalizationSelected?: boolean;
  personalizationValues?: Array<{ fieldId?: string; label: string; value: string }> | Record<string, unknown> | null;
  lineTotalInPaise: number;
  image: MediaRef | null;
}

export type OrderKind = "SHOP" | "PACKAGE" | "UPGRADE";

export interface OrderPackageLineDto {
  id: string;
  label: string;
  sku: string | null;
  section: string | null;
  quantity: number;
  unitPriceInPaise: number;
  lineTotalInPaise: number;
}

export interface OrderPackageDto {
  title: string;
  slug: string;
  themeTitle: string;
  themeSlug: string;
  guestCount: number | null;
  location: string | null;
  lines: OrderPackageLineDto[];
}

export interface GiftRegistryUpgradeState {
  eligible: boolean;
  registryId: string | null;
  registryTitle: string | null;
  registryStatus: RegistryStatus | null;
}

export interface RegistryAccessDto {
  canAccess: boolean;
  paidUpgradeCount: number;
  registryCount: number;
  pendingSetups: Array<{
    orderCode: string;
    packageTitle: string;
    themeTitle: string | null;
  }>;
  availablePurchases: Array<{
    orderCode: string;
    packageTitle: string;
    themeTitle: string | null;
    priceInPaise: number;
    gstInPaise: number;
    totalInPaise: number;
  }>;
}

export interface OrderDto {
  id: string;
  orderCode: string;
  kind?: OrderKind;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  subtotalInPaise: number;
  gstInPaise: number;
  totalInPaise: number;
  shippingInPaise?: number;
  shippingWaived?: boolean;
  freeShippingThresholdSnapshotInPaise?: number | null;
  shippingAddress: ShippingAddress;
  contactEmail: string;
  contactPhone: string;
  eventDate?: string | null;
  eventDetails?: Record<string, unknown> | null;
  invoiceNumber?: string | null;
  invoicePdfUrl: string | null;
  canRetryPayment?: boolean;
  canReorder?: boolean;
  placedAt: string;
  createdAt: string;
  items: OrderItemDto[];
  package?: OrderPackageDto | null;
  giftRegistry?: GiftRegistryUpgradeState | null;
}

export interface CheckoutQuoteResult {
  quote: CartQuote;
  items: Array<{
    productId: string;
    title: string;
    quantity: number;
    unitPriceInPaise: number;
    personalizationCostInPaise: number;
    registryItemId?: string | null;
  }>;
  registryCheckout?: {
    registryCode: string;
    recipientName: string;
    shippingAddress: ShippingAddress;
  } | null;
}

export interface CreateOrderResult {
  orderId: string;
  orderCode: string;
  totalInPaise: number;
  razorpayOrderId: string;
  razorpayKeyId: string | null;
}

/* ── Gift Registry ────────────────────────────────────────────────── */

export type RegistryStatus = "DRAFT" | "ACTIVE" | "EXPIRED" | "CLOSED" | "ARCHIVED";
export type RegistryVisibility = "PUBLIC" | "UNLISTED" | "PRIVATE";
export type GiftLinkSourceType = "EXTERNAL_LINK" | "INTERNAL_PRODUCT";
export type GiftItemStatus = "AVAILABLE" | "RESERVED" | "PARTIALLY_PURCHASED" | "PURCHASED";
export type ExtractionStatus = "PENDING" | "SUCCESS" | "PARTIAL" | "FAILED" | "MANUAL";

export interface RegistryAddressDto {
  recipientName: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  formatted: string;
}

export interface GiftRegistryItemDto {
  id: string;
  sourceType: GiftLinkSourceType;
  title: string;
  description: string | null;
  notes: string | null;
  priceInPaise: number | null;
  currency: string;
  image: MediaRef | null;
  externalUrl: string | null;
  canonicalUrl: string | null;
  storeName: string | null;
  internalProductId: string | null;
  internalProductSlug: string | null;
  canGiftDirectly: boolean;
  inStock: boolean;
  status: GiftItemStatus;
  quantityDesired: number;
  quantityPurchased: number;
  quantityReserved: number;
  remaining: number;
  available: number;
  priority: number;
  displayOrder: number;
  extractionStatus: ExtractionStatus;
  extractionMethod: string | null;
  extractionError: string | null;
  contributions?: Array<{
    id: string;
    quantity: number;
    status: string;
    guestName: string | null;
    guestEmail: string | null;
    orderCode: string | null;
    createdAt: string;
  }>;
}

export interface RegistryReadinessItem {
  key: string;
  label: string;
  description: string;
  done: boolean;
  required: boolean;
}

export interface RegistryReadiness {
  isReady: boolean;
  completedRequired: number;
  totalRequired: number;
  checklist: RegistryReadinessItem[];
}

export interface RegistryStats {
  totalGifts: number;
  quantityDesired: number;
  quantityPurchased: number;
  quantityRemaining: number;
  internalCount: number;
  externalCount: number;
}

export interface GiftRegistryDto {
  id: string;
  registryCode: string;
  title: string;
  occasion: string | null;
  eventDate: string | null;
  ownerDisplayName: string | null;
  childOrPersonName: string | null;
  celebrationDetails: string | null;
  giftPreferences: string | null;
  photoMediaId: string | null;
  coverImageUrl: string | null;
  visibility: RegistryVisibility;
  status: RegistryStatus;
  viewCount: number;
  publishedAt: string | null;
  activatedAt: string;
  expiresAt: string;
  ownerUserId: string;
  shareUrl: string;
  hasPassword: boolean;
  shippingAddress: RegistryAddressDto | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  stats?: RegistryStats;
  readiness?: RegistryReadiness;
}

export interface GiftRegistryDetailDto extends GiftRegistryDto {
  items: GiftRegistryItemDto[];
  orders?: Array<{
    id: string;
    orderCode: string;
    totalInPaise: number;
    paymentStatus: string;
    status: string;
    placedAt: string;
    user?: { name: string; email: string };
  }>;
}

export interface PublicRegistryDto extends GiftRegistryDto {
  items: GiftRegistryItemDto[];
}

export interface ExtractedProductDto {
  title: string | null;
  description: string | null;
  image: string | null;
  priceInPaise: number | null;
  currency: string | null;
  storeName: string | null;
  canonicalUrl: string | null;
  sourceUrl: string;
  extractionMethod: string | null;
  extractionStatus: ExtractionStatus;
  extractionError: string | null;
  cached: boolean;
}

/* ── Gift filter (client-side product listing filter state) ─────────── */

export interface GiftFilter {
  theme: string | null;
  category: string | null;
  search: string;
  sortBy: "price_asc" | "price_desc" | "newest";
}
