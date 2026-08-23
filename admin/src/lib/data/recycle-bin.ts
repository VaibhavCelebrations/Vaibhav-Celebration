"use client";

import { adminFetch } from "@/lib/admin-api-client";

export const RECYCLE_BIN_ENTITY_TYPES = [
  "Theme",
  "Package",
  "ExtraService",
  "GalleryImage",
  "BlogPost",
  "Event",
  "Testimonial",
  "FAQ",
  "Popup",
  "Product",
  "MediaAsset",
  "Customer",
  "Lead",
  "ConsultationRequest",
  "AdminUser",
  "Invoice",
  "ThemeSampleAsset",
  "EventRegistration",
] as const;

export type RecycleBinEntityType = (typeof RECYCLE_BIN_ENTITY_TYPES)[number];

export const ENTITY_LABELS: Record<RecycleBinEntityType, string> = {
  Theme: "Theme",
  Package: "Package",
  ExtraService: "Extra Service",
  GalleryImage: "Gallery Image",
  BlogPost: "Blog Post",
  Event: "Event",
  Testimonial: "Testimonial",
  FAQ: "FAQ",
  Popup: "Popup",
  Product: "Product",
  MediaAsset: "Media Asset",
  Customer: "Customer",
  Lead: "Lead",
  ConsultationRequest: "Consultation",
  AdminUser: "Admin User",
  Invoice: "Invoice",
  ThemeSampleAsset: "Theme Sample",
  EventRegistration: "Event Registration",
};

export type RecycleBinItem = {
  id: string;
  entityType: RecycleBinEntityType;
  displayName: string;
  deletedAt: string;
  meta: Record<string, unknown>;
};

export type RecycleBinListResult = {
  items: RecycleBinItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export async function fetchRecycleBinItems(params: {
  entityType?: RecycleBinEntityType;
  page?: number;
  pageSize?: number;
}): Promise<RecycleBinListResult> {
  const qs = new URLSearchParams();
  if (params.entityType) qs.set("entityType", params.entityType);
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));

  const queryStr = qs.toString();
  const path = `/admin/recycle-bin${queryStr ? `?${queryStr}` : ""}`;

  // Use rawAdminFetch so we can access meta.pagination
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1"}${path}`,
    {
      headers: {
        Authorization: `Bearer ${typeof window !== "undefined" ? window.localStorage.getItem("vbc_admin_access") ?? "" : ""}`,
        Accept: "application/json",
      },
      credentials: "include",
    },
  );
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? "Failed to fetch recycle bin");
  return {
    items: json.data as RecycleBinItem[],
    pagination: json.meta?.pagination ?? { page: 1, pageSize: 20, total: 0, totalPages: 1 },
  };
}

export async function fetchRecycleBinCount(): Promise<number> {
  const data = await adminFetch<{ count: number }>("/admin/recycle-bin/count");
  return data.count;
}

export async function restoreRecycleBinItem(
  entityType: RecycleBinEntityType,
  id: string,
  password: string,
): Promise<void> {
  await adminFetch<unknown>(`/admin/recycle-bin/${entityType}/${id}/restore`, {
    method: "POST",
    body: { password },
  });
}

export async function hardDeleteRecycleBinItem(
  entityType: RecycleBinEntityType,
  id: string,
  password: string,
): Promise<void> {
  await adminFetch<unknown>(`/admin/recycle-bin/${entityType}/${id}`, {
    method: "DELETE",
    body: { password },
  });
}

export async function restoreRecycleBinItemsBulk(
  items: { entityType: RecycleBinEntityType; id: string }[],
  password: string,
): Promise<{ restoredCount: number; errors: Array<{ entityType: string; id: string; error: string }> }> {
  return await adminFetch<{ restoredCount: number; errors: Array<{ entityType: string; id: string; error: string }> }>(`/admin/recycle-bin/bulk/restore`, {
    method: "POST",
    body: { items, password },
  });
}

export async function hardDeleteRecycleBinItemsBulk(
  items: { entityType: RecycleBinEntityType; id: string }[],
  password: string,
): Promise<{ deletedCount: number; errors: Array<{ entityType: string; id: string; error: string }> }> {
  return await adminFetch<{ deletedCount: number; errors: Array<{ entityType: string; id: string; error: string }> }>(`/admin/recycle-bin/bulk/delete`, {
    method: "POST",
    body: { items, password },
  });
}
