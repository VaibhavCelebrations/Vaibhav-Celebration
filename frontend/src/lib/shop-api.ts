/* ===================================================================
   Shop API — typed client for the real backend catalog/cart/wishlist/
   orders/registry endpoints. All money & stock truth lives server-side;
   this layer never computes totals, it only relays what the API returns.
   =================================================================== */

import { apiFetch } from "./api-client";
import type {
  CheckoutQuoteResult,
  CreateOrderResult,
  GiftLinkSourceType,
  GiftRegistryDetailDto,
  GiftRegistryDto,
  OrderDto,
  Product,
  ProductCategory,
  ProductCollection,
  ProductListResult,
  PublicRegistryDto,
  ServerCart,
  ShippingAddress,
  WishlistItemDto,
} from "./shop-types";

/* ── Public catalog ───────────────────────────────────────────────── */

export type ProductListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  theme?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "price_asc" | "price_desc" | "newest";
};

export async function listProducts(params: ProductListParams = {}): Promise<ProductListResult> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") qs.set(key, String(value));
  }
  const query = qs.toString();
  return apiFetch<ProductListResult>(`/products${query ? `?${query}` : ""}`, { cache: "no-store" });
}

export async function getProductBySlug(slug: string): Promise<Product & { related: Product[] }> {
  return apiFetch(`/products/${encodeURIComponent(slug)}`, { cache: "no-store" });
}

export async function listProductCategories(): Promise<ProductCategory[]> {
  return apiFetch<ProductCategory[]>("/product-categories", { next: { revalidate: 300 } });
}

export async function listProductCollections(params: { featured?: boolean } = {}): Promise<ProductCollection[]> {
  const qs = new URLSearchParams();
  if (params.featured !== undefined) qs.set("featured", String(params.featured));
  const query = qs.toString();
  return apiFetch<ProductCollection[]>(`/collections${query ? `?${query}` : ""}`, { next: { revalidate: 60 } });
}

export async function getProductCollectionBySlug(slug: string): Promise<ProductCollection> {
  return apiFetch<ProductCollection>(`/collections/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } });
}

/* ── Cart (requires customer auth cookie) ─────────────────────────── */

export async function getCart(): Promise<ServerCart> {
  return apiFetch<ServerCart>("/cart", { cache: "no-store" });
}

export async function addCartItem(
  productId: string,
  quantity: number,
  personalizationValues?: unknown,
): Promise<ServerCart> {
  return apiFetch<ServerCart>("/cart/items", { method: "POST", body: { productId, quantity, personalizationValues } });
}

export async function updateCartItemQuantity(productId: string, quantity: number): Promise<ServerCart> {
  return apiFetch<ServerCart>(`/cart/items/${encodeURIComponent(productId)}`, { method: "PATCH", body: { quantity } });
}

export async function removeCartItem(productId: string): Promise<ServerCart> {
  return apiFetch<ServerCart>(`/cart/items/${encodeURIComponent(productId)}`, { method: "DELETE" });
}

export async function clearServerCart(): Promise<ServerCart> {
  return apiFetch<ServerCart>("/cart", { method: "DELETE" });
}

/* ── Wishlist (requires customer auth cookie) ─────────────────────── */

export async function listWishlist(): Promise<WishlistItemDto[]> {
  return apiFetch<WishlistItemDto[]>("/wishlist", { cache: "no-store" });
}

export async function addToWishlist(productId: string): Promise<WishlistItemDto[]> {
  return apiFetch<WishlistItemDto[]>(`/wishlist/${encodeURIComponent(productId)}`, { method: "POST" });
}

export async function removeFromWishlist(productId: string): Promise<WishlistItemDto[]> {
  return apiFetch<WishlistItemDto[]>(`/wishlist/${encodeURIComponent(productId)}`, { method: "DELETE" });
}

/* ── Checkout & Orders (requires customer auth cookie) ────────────── */

export async function getCheckoutQuote(): Promise<CheckoutQuoteResult> {
  return apiFetch<CheckoutQuoteResult>("/shop/checkout/quote", { cache: "no-store" });
}

export async function createShopOrder(input: {
  shippingAddress: ShippingAddress;
  contactEmail: string;
  contactPhone: string;
  eventDetails?: {
    childName: string;
    childAge: string;
    eventDate: string;
    venue: string;
    guestCount: string;
    notes: string;
  };
}): Promise<CreateOrderResult> {
  return apiFetch<CreateOrderResult>("/shop/orders", {
    method: "POST",
    body: input,
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
}

export async function listMyOrders(page = 1, pageSize = 10): Promise<{ items: OrderDto[]; total: number; page: number; pageSize: number }> {
  return apiFetch(`/account/orders?page=${page}&pageSize=${pageSize}`, { cache: "no-store" });
}

export async function getMyOrder(orderCode: string): Promise<OrderDto> {
  return apiFetch<OrderDto>(`/account/orders/${encodeURIComponent(orderCode)}`, { cache: "no-store" });
}

/* ── Gift Registry (owner-facing, requires customer auth cookie) ─────── */

export async function listMyRegistries(): Promise<GiftRegistryDto[]> {
  return apiFetch<GiftRegistryDto[]>("/account/registries", { cache: "no-store" });
}

export async function createRegistry(input: {
  password: string;
  childOrPersonName?: string;
  celebrationDetails?: string;
  photoMediaId?: string;
  shippingAddress?: ShippingAddress;
}): Promise<GiftRegistryDto> {
  return apiFetch<GiftRegistryDto>("/account/registries", { method: "POST", body: input });
}

export async function getMyRegistry(id: string): Promise<GiftRegistryDetailDto> {
  return apiFetch<GiftRegistryDetailDto>(`/account/registries/${encodeURIComponent(id)}`, { cache: "no-store" });
}

export async function updateMyRegistry(
  id: string,
  input: Partial<{ childOrPersonName: string; celebrationDetails: string; shippingAddress: ShippingAddress; status: "ACTIVE" | "CLOSED" }>,
): Promise<GiftRegistryDto> {
  return apiFetch<GiftRegistryDto>(`/account/registries/${encodeURIComponent(id)}`, { method: "PUT", body: input });
}

export async function addRegistryItem(
  id: string,
  input: {
    sourceType: GiftLinkSourceType;
    externalUrl?: string;
    manualTitle?: string;
    manualImageUrl?: string;
    manualPriceInPaise?: number;
    internalProductId?: string;
  },
) {
  return apiFetch(`/account/registries/${encodeURIComponent(id)}/items`, { method: "POST", body: input });
}

export async function deleteRegistryItem(id: string, itemId: string): Promise<void> {
  await apiFetch(`/account/registries/${encodeURIComponent(id)}/items/${encodeURIComponent(itemId)}`, { method: "DELETE" });
}

/* ── Public registry share view ───────────────────────────────────── */

export async function getPublicRegistry(code: string, password: string): Promise<PublicRegistryDto> {
  return apiFetch<PublicRegistryDto>(`/registry/${encodeURIComponent(code)}/view`, { method: "POST", body: { password }, cache: "no-store" });
}

export async function giftRegistryItem(
  code: string,
  itemId: string,
  input: { password: string; shippingAddress: ShippingAddress; contactEmail: string; contactPhone: string },
): Promise<CreateOrderResult> {
  return apiFetch<CreateOrderResult>(`/registry/${encodeURIComponent(code)}/items/${encodeURIComponent(itemId)}/gift`, {
    method: "POST",
    body: input,
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
}
