"use client";

import { adminFetch, adminFetchList } from "@/lib/admin-api-client";
import { qs, type ListQuery, type ListResult } from "./types";

export type ResourceRecord = {
  id: string;
  [key: string]: unknown;
};

export type ResourceRepository = {
  list: (query: ListQuery) => Promise<ListResult<ResourceRecord>>;
  create: (body: Record<string, unknown>) => Promise<ResourceRecord>;
  update: (id: string, body: Record<string, unknown>) => Promise<ResourceRecord>;
  archive: (id: string) => Promise<void>;
};

function resource(endpoint: string): ResourceRepository {
  return {
    list: (query) =>
      adminFetchList<ResourceRecord>(`${endpoint}${qs(query)}`, {
        page: query.page,
        pageSize: query.pageSize,
      }),
    create: (body) => adminFetch<ResourceRecord>(endpoint, { method: "POST", body }),
    update: (id, body) =>
      adminFetch<ResourceRecord>(`${endpoint}/${id}`, { method: "PATCH", body }).catch(() =>
        adminFetch<ResourceRecord>(`${endpoint}/${id}`, { method: "PUT", body }),
      ),
    archive: (id) => adminFetch<void>(`${endpoint}/${id}`, { method: "DELETE" }),
  };
}

export const galleryRepo = resource("/admin/gallery");
export const eventsRepo = resource("/admin/events");
export const blogRepo = resource("/admin/blog");
export const testimonialsRepo = resource("/admin/testimonials");
export const popupsRepo = resource("/admin/popups");
export const customersRepo = resource("/admin/customers");
export const invoicesRepo = resource("/admin/invoices");
export const consultationsRepo = resource("/admin/consultations");
export const capacityRulesRepo = resource("/admin/capacity-rules");
export const auditLogRepo = resource("/admin/audit-log");

export async function updateResourceStatus(
  endpoint: string,
  id: string,
  status: string,
): Promise<ResourceRecord> {
  return adminFetch<ResourceRecord>(`${endpoint}/${id}/status`, {
    method: "PUT",
    body: { status },
  });
}

const unsupported = (action: string) => async () => {
  throw new Error(`${action} is not supported for this resource.`);
};

export const leadsRepo: ResourceRepository = {
  list: (query) =>
    adminFetchList<ResourceRecord>(`/admin/leads${qs(query)}`, {
      page: query.page,
      pageSize: query.pageSize,
    }),
  create: unsupported("Create"),
  update: (id, body) => updateResourceStatus("/admin/leads", id, String(body.status ?? "")),
  archive: unsupported("Archive"),
};

export const bookingsRepo: ResourceRepository = {
  list: (query) =>
    adminFetchList<ResourceRecord>(`/admin/bookings${qs(query)}`, {
      page: query.page,
      pageSize: query.pageSize,
    }),
  create: unsupported("Create"),
  update: (id, body) => updateResourceStatus("/admin/bookings", id, String(body.status ?? "")),
  archive: unsupported("Archive"),
};
