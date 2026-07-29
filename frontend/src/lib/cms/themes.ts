import { apiFetch } from "@/lib/api-client";
import type { ApiTheme, ApiThemeDetail } from "./types";
import { mapThemeCard, mapThemeDetail } from "./map-media";
import { CMS_TAGS, cmsFetchOptions } from "./tags";

export async function listThemes(search?: string, tag?: string) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (tag) params.set("tag", tag);
  const qs = params.toString();
  const data = await apiFetch<ApiTheme[]>(`/themes${qs ? `?${qs}` : ""}`, cmsFetchOptions(CMS_TAGS.themes));
  return data.map(mapThemeCard);
}

export async function getThemeBySlug(slug: string) {
  const data = await apiFetch<ApiThemeDetail>(`/themes/${slug}`, cmsFetchOptions(CMS_TAGS.theme(slug)));
  return mapThemeDetail(data);
}

export async function getThemeDetailRaw(slug: string) {
  return apiFetch<ApiThemeDetail>(`/themes/${slug}`, cmsFetchOptions(CMS_TAGS.theme(slug)));
}

export { mapThemeDetail };
