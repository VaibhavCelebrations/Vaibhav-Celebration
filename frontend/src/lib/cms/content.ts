import { apiFetch } from "@/lib/api-client";
import type { ApiFaq, ApiTestimonial } from "./types";
import { mapTestimonialCard } from "./map-media";
import { CMS_TAGS, cmsFetchOptions } from "./tags";

export async function listTestimonials(filters?: { themeId?: string; packageId?: string }) {
  const params = new URLSearchParams();
  if (filters?.themeId) params.set("themeId", filters.themeId);
  if (filters?.packageId) params.set("packageId", filters.packageId);
  const qs = params.toString();
  const data = await apiFetch<ApiTestimonial[]>(
    `/testimonials${qs ? `?${qs}` : ""}`,
    cmsFetchOptions(CMS_TAGS.testimonials),
  );
  return data.map(mapTestimonialCard);
}

export async function listFaqs(category?: string) {
  const qs = category ? `?category=${encodeURIComponent(category)}` : "";
  return apiFetch<ApiFaq[]>(`/faqs${qs}`, cmsFetchOptions(CMS_TAGS.faqs));
}

export { mapTestimonialCard };
