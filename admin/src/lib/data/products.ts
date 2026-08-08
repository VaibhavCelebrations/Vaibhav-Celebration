import { adminFetch, adminFetchList } from "@/lib/admin-api-client";
import { createMockCollection, genId } from "@/lib/mock/store";
import type { InventoryLedgerEntry, InventoryLedgerReasonType, Product, ProductCategory, ProductCategoryInput, ProductInput } from "@/types/cms";
import { USE_MOCK_DATA } from "./config";
import { qs, type ListResult, type Repository } from "./types";

const ENDPOINT = "/admin/products";
const CATEGORY_ENDPOINT = "/admin/product-categories";

// ─── Mock seed (only used when NEXT_PUBLIC_USE_MOCK_DATA=true) ────────────────

const seed: Product[] = [
  {
    id: "product_1",
    title: "Personalized Birthday Photo Frame",
    slug: "personalized-birthday-photo-frame",
    sku: "GIFT-FRAME-001",
    description: "A keepsake wooden photo frame, engraved with the birthday child's name and date.",
    priceInPaise: 79900,
    compareAtPriceInPaise: 99900,
    isActive: true,
    minOrderQuantity: 1,
    maxOrderQuantity: 5,
    images: [{ id: "pi_1", displayOrder: 0, media: { id: "media_10", url: "https://picsum.photos/seed/frame/640/640" } }],
    categories: [{ id: "cat_1", name: "Keepsakes", slug: "keepsakes" }],
    themes: [],
    personalizationFields: [{ id: "pf_1", fieldKey: "name", label: "Child's name", fieldType: "text", isRequired: true, maxLength: 40 }],
    stock: { quantityAvailable: 42, statusFlag: "IN_STOCK", lowStockThreshold: 10 },
    createdAt: "2026-01-10T09:00:00.000Z",
    updatedAt: "2026-01-10T09:00:00.000Z",
    deletedAt: null,
  },
];

const mockCategorySeed: ProductCategory[] = [{ id: "cat_1", name: "Keepsakes", slug: "keepsakes", displayOrder: 1, isActive: true }];

const mockProductsRepo = createMockCollection<Product, ProductInput>({
  idPrefix: "product",
  seed,
  searchFields: ["title", "sku", "description"],
  defaultSort: "createdAt",
  applyFilters: (row, filters) => (filters.isActive ? String(row.isActive) === filters.isActive : true),
  onCreate: (input, id) => ({
    id,
    deletedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    images: (input.imageMediaIds ?? []).map((mediaId, i) => ({ id: genId("pi"), displayOrder: i, media: { id: mediaId, url: mediaId } })),
    categories: [],
    themes: [],
    personalizationFields: (input.personalizationFields ?? []).map((f) => ({ ...f, id: genId("pf") })),
    stock: { quantityAvailable: input.initialQuantity ?? 0, statusFlag: "IN_STOCK", lowStockThreshold: input.lowStockThreshold ?? 10 },
    ...input,
  }),
  onUpdate: (row, input) => ({ ...row, ...input, updatedAt: new Date().toISOString() }),
  notFoundMessage: () => "This product no longer exists.",
});

// ─── Products ───────────────────────────────────────────────────────────────

export const productsRepo: Repository<Product, ProductInput> = USE_MOCK_DATA
  ? mockProductsRepo
  : {
      list: (query) => adminFetchList<Product>(`${ENDPOINT}${qs(query)}`, { page: query.page, pageSize: query.pageSize }),
      get: (id) => adminFetch<Product>(`${ENDPOINT}/${id}`),
      create: (body) => adminFetch<Product>(ENDPOINT, { method: "POST", body }),
      update: (id, body) => adminFetch<Product>(`${ENDPOINT}/${id}`, { method: "PATCH", body }),
      archive: (id) => adminFetch<void>(`${ENDPOINT}/${id}`, { method: "DELETE" }),
    };

export type StockAdjustResult = {
  id: string;
  productId: string;
  quantityAvailable: number;
  lowStockThreshold: number;
  statusFlag: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
};

export async function adjustProductStock(
  productId: string,
  input: { delta: number; reason: InventoryLedgerReasonType; note?: string },
): Promise<StockAdjustResult> {
  if (USE_MOCK_DATA) {
    const product = await mockProductsRepo.get(productId);
    const nextQty = Math.max(0, (product.stock?.quantityAvailable ?? 0) + input.delta);
    return {
      id: genId("inv"),
      productId,
      quantityAvailable: nextQty,
      lowStockThreshold: product.stock?.lowStockThreshold ?? 10,
      statusFlag: nextQty <= 0 ? "OUT_OF_STOCK" : nextQty <= (product.stock?.lowStockThreshold ?? 10) ? "LOW_STOCK" : "IN_STOCK",
    };
  }
  return adminFetch<StockAdjustResult>(`${ENDPOINT}/${productId}/inventory/adjust`, { method: "POST", body: input });
}

export async function getProductStockHistory(productId: string, page: number, pageSize: number): Promise<ListResult<InventoryLedgerEntry>> {
  if (USE_MOCK_DATA) return { items: [], total: 0, page, pageSize };
  return adminFetchList<InventoryLedgerEntry>(`${ENDPOINT}/${productId}/inventory/history?page=${page}&pageSize=${pageSize}`, { page, pageSize });
}

// ─── Product categories (small, unpaginated collection) ────────────────────

export async function listProductCategories(): Promise<ProductCategory[]> {
  if (USE_MOCK_DATA) return structuredClone(mockCategorySeed);
  return adminFetch<ProductCategory[]>(CATEGORY_ENDPOINT);
}

export async function createProductCategory(input: ProductCategoryInput): Promise<ProductCategory> {
  if (USE_MOCK_DATA) {
    const row: ProductCategory = { ...input, id: genId("cat"), slug: input.slug || input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") };
    mockCategorySeed.push(row);
    return row;
  }
  return adminFetch<ProductCategory>(CATEGORY_ENDPOINT, { method: "POST", body: input });
}

export async function updateProductCategory(id: string, input: Partial<ProductCategoryInput>): Promise<ProductCategory> {
  if (USE_MOCK_DATA) {
    const idx = mockCategorySeed.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Category not found");
    mockCategorySeed[idx] = { ...mockCategorySeed[idx], ...input };
    return mockCategorySeed[idx];
  }
  return adminFetch<ProductCategory>(`${CATEGORY_ENDPOINT}/${id}`, { method: "PUT", body: input });
}

export async function deleteProductCategory(id: string): Promise<void> {
  if (USE_MOCK_DATA) {
    const idx = mockCategorySeed.findIndex((c) => c.id === id);
    if (idx !== -1) mockCategorySeed.splice(idx, 1);
    return;
  }
  await adminFetch<void>(`${CATEGORY_ENDPOINT}/${id}`, { method: "DELETE" });
}
