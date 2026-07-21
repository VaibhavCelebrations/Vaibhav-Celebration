import { adminFetch } from "@/lib/admin-api-client";
import { createMockCollection } from "@/lib/mock/store";
import type { Package, PackageInput } from "@/types/cms";
import { USE_MOCK_DATA } from "./config";
import { qs, type ListResult, type Repository } from "./types";

const ENDPOINT = "/admin/packages";

const seed: Package[] = [
  {
    id: "pkg_1",
    title: "Essentials",
    slug: "essentials",
    priceInPaise: 1500000,
    tierRank: 1,
    isRecommended: false,
    isActive: true,
    isCustomizable: true,
    displayOrder: 1,
    description: "Core decor and coordination for an intimate celebration.",
    createdAt: "2026-01-10T09:00:00.000Z",
    updatedAt: "2026-01-10T09:00:00.000Z",
    deletedAt: null,
    featureCount: 6,
    customizationOptionCount: 3,
    themeCount: 4,
  },
  {
    id: "pkg_2",
    title: "Signature",
    slug: "signature",
    priceInPaise: 3500000,
    tierRank: 2,
    isRecommended: true,
    isActive: true,
    isCustomizable: true,
    displayOrder: 2,
    description: "Our most popular package with full theming and activities.",
    createdAt: "2026-01-10T09:00:00.000Z",
    updatedAt: "2026-01-10T09:00:00.000Z",
    deletedAt: null,
    featureCount: 10,
    customizationOptionCount: 5,
    themeCount: 4,
  },
  {
    id: "pkg_3",
    title: "Grand Celebration",
    slug: "grand-celebration",
    priceInPaise: 7500000,
    tierRank: 3,
    isRecommended: false,
    isActive: true,
    isCustomizable: true,
    displayOrder: 3,
    description: "Full-scale production with premium add-ons and dedicated staff.",
    createdAt: "2026-01-15T09:00:00.000Z",
    updatedAt: "2026-01-15T09:00:00.000Z",
    deletedAt: null,
    featureCount: 14,
    customizationOptionCount: 7,
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
    featureCount: 0,
    customizationOptionCount: 0,
    themeCount: 0,
    ...input,
  }),
  onUpdate: (row, input) => ({ ...row, ...input, updatedAt: new Date().toISOString() }),
  notFoundMessage: () => "This package no longer exists.",
});

export const packagesRepo: Repository<Package, PackageInput> = USE_MOCK_DATA
  ? mockPackagesRepo
  : {
      list: (query) => adminFetch<ListResult<Package>>(`${ENDPOINT}${qs(query)}`),
      get: (id) => adminFetch<Package>(`${ENDPOINT}/${id}`),
      create: (body) => adminFetch<Package>(ENDPOINT, { method: "POST", body }),
      update: (id, body) => adminFetch<Package>(`${ENDPOINT}/${id}`, { method: "PATCH", body }),
      archive: (id) => adminFetch<void>(`${ENDPOINT}/${id}`, { method: "DELETE" }),
    };
