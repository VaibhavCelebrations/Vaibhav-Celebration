import { adminFetch, adminFetchList } from "@/lib/admin-api-client";
import { createMockCollection, genId } from "@/lib/mock/store";
import type { ProductCollection, ProductCollectionInput } from "@/types/cms";
import { USE_MOCK_DATA } from "./config";
import { qs, type Repository } from "./types";

const ENDPOINT = "/admin/collections";

const seed: ProductCollection[] = [
  {
    id: "collection_1",
    title: "Kanjak Gifts",
    slug: "kanjak-gifts",
    description: "Festive gifting picks for Kanjak celebrations.",
    heroImage: null,
    startsAt: null,
    endsAt: null,
    showOnHomepage: true,
    isActive: true,
    displayOrder: 1,
    products: [],
    productCount: 0,
    createdAt: "2026-01-10T09:00:00.000Z",
    updatedAt: "2026-01-10T09:00:00.000Z",
    deletedAt: null,
  },
];

const mockCollectionsRepo = createMockCollection<ProductCollection, ProductCollectionInput>({
  idPrefix: "collection",
  seed,
  searchFields: ["title", "slug", "description"],
  defaultSort: "displayOrder",
  applyFilters: (row, filters) => (filters.isActive ? String(row.isActive) === filters.isActive : true),
  onCreate: (input, id) => ({
    id,
    deletedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    heroImage: null,
    products: [],
    productCount: input.productIds?.length ?? 0,
    ...input,
  }),
  onUpdate: (row, input) => ({
    ...row,
    ...input,
    productCount: input.productIds?.length ?? row.productCount,
    updatedAt: new Date().toISOString(),
  }),
  notFoundMessage: () => "This collection no longer exists.",
});

export const collectionsRepo: Repository<ProductCollection, ProductCollectionInput> = USE_MOCK_DATA
  ? mockCollectionsRepo
  : {
      list: (query) => adminFetchList<ProductCollection>(`${ENDPOINT}${qs(query)}`, { page: query.page, pageSize: query.pageSize }),
      get: (id) => adminFetch<ProductCollection>(`${ENDPOINT}/${id}`),
      create: (body) => adminFetch<ProductCollection>(ENDPOINT, { method: "POST", body }),
      update: (id, body) => adminFetch<ProductCollection>(`${ENDPOINT}/${id}`, { method: "PATCH", body }),
      archive: (id) => adminFetch<void>(`${ENDPOINT}/${id}`, { method: "DELETE" }),
    };

export function emptyCollectionInput(displayOrder = 0): ProductCollectionInput {
  return {
    title: "",
    slug: "",
    description: "",
    startsAt: null,
    endsAt: null,
    showOnHomepage: false,
    isActive: true,
    displayOrder,
    heroImageId: null,
    productIds: [],
  };
}

export { genId };
