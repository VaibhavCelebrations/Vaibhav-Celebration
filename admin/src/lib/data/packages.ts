import { adminFetch, adminFetchList } from "@/lib/admin-api-client";
import { createMockCollection } from "@/lib/mock/store";
import type { ExtraService, ExtraServiceInput, Package, PackageInput, PackageMatrixSavePayload } from "@/types/cms";
import { USE_MOCK_DATA } from "./config";
import { qs, type Repository } from "./types";

const ENDPOINT = "/admin/packages";
const EXTRA_ENDPOINT = "/admin/extra-services";

const seed: Package[] = [
  {
    id: "pkg_1",
    title: "Standard",
    slug: "standard",
    priceInPaise: 4990000,
    tierRank: 1,
    isRecommended: false,
    isActive: true,
    isCustomizable: true,
    displayOrder: 1,
    description: "Perfect for intimate celebrations.",
    createdAt: "2026-01-10T09:00:00.000Z",
    updatedAt: "2026-01-10T09:00:00.000Z",
    deletedAt: null,
    serviceItemCount: 11,
    includedServiceCount: 5,
    themeCount: 4,
  },
  {
    id: "pkg_2",
    title: "Premium",
    slug: "premium",
    priceInPaise: 7990000,
    tierRank: 2,
    isRecommended: true,
    isActive: true,
    isCustomizable: true,
    displayOrder: 2,
    description: "Most loved for memorable celebrations.",
    createdAt: "2026-01-10T09:00:00.000Z",
    updatedAt: "2026-01-10T09:00:00.000Z",
    deletedAt: null,
    serviceItemCount: 11,
    includedServiceCount: 8,
    themeCount: 4,
  },
  {
    id: "pkg_3",
    title: "Lux",
    slug: "lux",
    priceInPaise: 11990000,
    tierRank: 3,
    isRecommended: false,
    isActive: true,
    isCustomizable: true,
    displayOrder: 3,
    description: "Grand experiences with full support.",
    createdAt: "2026-01-15T09:00:00.000Z",
    updatedAt: "2026-01-15T09:00:00.000Z",
    deletedAt: null,
    serviceItemCount: 11,
    includedServiceCount: 11,
    themeCount: 3,
  },
];

const mockPackagesRepo = createMockCollection<Package, PackageInput>({
  idPrefix: "pkg",
  seed,
  searchFields: ["title", "slug", "description"],
  defaultSort: "displayOrder",
  applyFilters: (row, filters) => (filters.isActive ? String(row.isActive) === filters.isActive : true),
  onCreate: (input, id) => ({
    id,
    deletedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    serviceItemCount: 0,
    includedServiceCount: 0,
    themeCount: 0,
    ...input,
  }),
  onUpdate: (row, input) => ({ ...row, ...input, updatedAt: new Date().toISOString() }),
  notFoundMessage: () => "This package no longer exists.",
});

export const packagesRepo: Repository<Package, PackageInput> = USE_MOCK_DATA
  ? mockPackagesRepo
  : {
      list: (query) =>
        adminFetchList<Package>(`${ENDPOINT}${qs(query)}`, { page: query.page, pageSize: query.pageSize }),
      get: (id) => adminFetch<Package>(`${ENDPOINT}/${id}`),
      create: (body) => adminFetch<Package>(ENDPOINT, { method: "POST", body }),
      update: (id, body) => adminFetch<Package>(`${ENDPOINT}/${id}`, { method: "PATCH", body }),
      archive: (id) => adminFetch<void>(`${ENDPOINT}/${id}`, { method: "DELETE" }),
    };

export async function fetchPackageMatrix() {
  return adminFetch<{
    packages: Array<
      Package & {
        serviceItems: Array<{
          id: string;
          extraServiceId: string;
          isIncluded: boolean;
          displayOrder: number;
          extraService: ExtraService;
        }>;
      }
    >;
    extraServices: ExtraService[];
  }>(`${ENDPOINT}/matrix`);
}

export async function savePackageMatrix(payload: PackageMatrixSavePayload) {
  return adminFetch<unknown>(`${ENDPOINT}/matrix`, {
    method: "PUT",
    body: payload,
  });
}

export const extraServicesRepo = {
  list: (includeInactive = true) =>
    adminFetch<ExtraService[]>(`${EXTRA_ENDPOINT}${includeInactive ? "?includeInactive=true" : ""}`),
  create: (body: ExtraServiceInput) => adminFetch<ExtraService>(EXTRA_ENDPOINT, { method: "POST", body }),
  update: (id: string, body: Partial<ExtraServiceInput>) =>
    adminFetch<ExtraService>(`${EXTRA_ENDPOINT}/${id}`, { method: "PATCH", body }),
  archive: (id: string) => adminFetch<void>(`${EXTRA_ENDPOINT}/${id}`, { method: "DELETE" }),
};
