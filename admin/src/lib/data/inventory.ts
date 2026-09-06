import { adminFetch, adminFetchList } from "@/lib/admin-api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Supplier = {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  gstin: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type Warehouse = {
  id: string;
  name: string;
  location: string | null;
  address: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type PurchaseOrderStatus = "DRAFT" | "ORDERED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";

export type PurchaseOrderItem = {
  id: string;
  purchaseOrderId: string;
  productId: string;
  quantity: number;
  receivedQuantity: number;
  unitPriceInPaise: number;
  Product: { id: string; title: string; sku: string; barcode: string | null; unit: string | null };
};

export type PurchaseOrder = {
  id: string;
  poNumber: string;
  supplierId: string;
  status: PurchaseOrderStatus;
  warehouseId: string | null;
  notes: string | null;
  expectedAt: string | null;
  receivedAt: string | null;
  totalInPaise: number;
  adminUserId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  Supplier: { id: string; name: string };
  items: PurchaseOrderItem[];
};

export type InventoryStats = {
  totalProducts: number;
  outOfStock: number;
  lowStock: number;
  inStock: number;
  totalValueInPaise: number;
};

export type InventoryLedgerReason =
  | "RESTOCK"
  | "PURCHASE"
  | "SALE"
  | "MANUAL_ADJUSTMENT"
  | "RETURN"
  | "PURCHASE_RETURN"
  | "DAMAGE"
  | "LOSS"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "INITIAL_STOCK";

export type LedgerEntry = {
  id: string;
  inventoryRecordId: string;
  changeQuantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: InventoryLedgerReason;
  orderItemId: string | null;
  purchaseOrderItemId: string | null;
  note: string | null;
  adminUserId: string | null;
  createdAt: string;
};

// ─── Inventory Stats ──────────────────────────────────────────────────────────

export async function fetchInventoryStats(): Promise<InventoryStats> {
  return adminFetch<InventoryStats>("/admin/products/inventory/stats");
}

// ─── Suppliers ────────────────────────────────────────────────────────────────

export async function fetchSuppliers(params?: { page?: number; pageSize?: number; search?: string; isActive?: string }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params?.search) qs.set("search", params.search);
  if (params?.isActive !== undefined) qs.set("isActive", params.isActive);
  return adminFetchList<Supplier>(`/admin/suppliers?${qs}`, { page: params?.page ?? 1, pageSize: params?.pageSize ?? 20 });
}

export async function fetchSupplier(id: string): Promise<Supplier> {
  return adminFetch<Supplier>(`/admin/suppliers/${id}`);
}

export async function createSupplier(data: Partial<Supplier>): Promise<Supplier> {
  return adminFetch<Supplier>("/admin/suppliers", { method: "POST", body: data });
}

export async function updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
  return adminFetch<Supplier>(`/admin/suppliers/${id}`, { method: "PATCH", body: data });
}

export async function deleteSupplier(id: string): Promise<void> {
  return adminFetch(`/admin/suppliers/${id}`, { method: "DELETE" });
}

// ─── Warehouses ───────────────────────────────────────────────────────────────

export async function fetchWarehouses(): Promise<Warehouse[]> {
  return adminFetch<Warehouse[]>("/admin/warehouses");
}

export async function createWarehouse(data: Partial<Warehouse>): Promise<Warehouse> {
  return adminFetch<Warehouse>("/admin/warehouses", { method: "POST", body: data });
}

export async function updateWarehouse(id: string, data: Partial<Warehouse>): Promise<Warehouse> {
  return adminFetch<Warehouse>(`/admin/warehouses/${id}`, { method: "PATCH", body: data });
}

export async function deleteWarehouse(id: string): Promise<void> {
  return adminFetch(`/admin/warehouses/${id}`, { method: "DELETE" });
}

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export async function fetchPurchaseOrders(params?: {
  page?: number;
  pageSize?: number;
  status?: PurchaseOrderStatus;
  supplierId?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params?.status) qs.set("status", params.status);
  if (params?.supplierId) qs.set("supplierId", params.supplierId);
  return adminFetchList<PurchaseOrder>(`/admin/purchase-orders?${qs}`, {
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 20,
  });
}

export async function fetchPurchaseOrder(id: string): Promise<PurchaseOrder> {
  return adminFetch<PurchaseOrder>(`/admin/purchase-orders/${id}`);
}

export async function createPurchaseOrder(data: {
  supplierId: string;
  warehouseId?: string;
  notes?: string;
  expectedAt?: string;
  items: Array<{ productId: string; quantity: number; unitPriceInPaise: number }>;
}): Promise<PurchaseOrder> {
  return adminFetch<PurchaseOrder>("/admin/purchase-orders", { method: "POST", body: data });
}

export async function updatePurchaseOrder(
  id: string,
  data: { notes?: string; expectedAt?: string | null; status?: "DRAFT" | "ORDERED" },
): Promise<PurchaseOrder> {
  return adminFetch<PurchaseOrder>(`/admin/purchase-orders/${id}`, { method: "PATCH", body: data });
}

export async function receivePurchaseOrder(
  id: string,
  items: Array<{ itemId: string; receivedQuantity: number }>,
): Promise<PurchaseOrder> {
  return adminFetch<PurchaseOrder>(`/admin/purchase-orders/${id}/receive`, { method: "POST", body: { items } });
}

export async function cancelPurchaseOrder(id: string): Promise<PurchaseOrder> {
  return adminFetch<PurchaseOrder>(`/admin/purchase-orders/${id}/cancel`, { method: "POST" });
}

// ─── Inventory Ledger ─────────────────────────────────────────────────────────

export async function fetchInventoryHistory(productId: string, params?: { page?: number; pageSize?: number }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  return adminFetchList<LedgerEntry>(`/admin/products/${productId}/inventory/history?${qs}`, {
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 50,
  });
}

export async function adjustInventory(
  productId: string,
  data: { delta: number; reason: InventoryLedgerReason; note?: string },
) {
  return adminFetch(`/admin/products/${productId}/inventory/adjust`, { method: "POST", body: data });
}
