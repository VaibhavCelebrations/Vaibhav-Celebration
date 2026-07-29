import { apiFetch } from "@/lib/api-client";
import type { ApiGalleryImage, GalleryCard } from "./types";
import { mapGalleryCard } from "./map-media";
import { CMS_TAGS, cmsFetchOptions } from "./tags";

export async function listGallery(tag?: string, themeId?: string) {
  const params = new URLSearchParams();
  if (tag) params.set("tag", tag);
  if (themeId) params.set("themeId", themeId);
  const qs = params.toString();
  const data = await apiFetch<ApiGalleryImage[]>(`/gallery${qs ? `?${qs}` : ""}`, cmsFetchOptions(CMS_TAGS.gallery));
  return data.map(mapGalleryCard);
}

export function getGalleryTags(images: GalleryCard[]) {
  const tags = new Set<string>();
  for (const img of images) {
    for (const tag of img.tags) tags.add(tag);
  }
  return Array.from(tags).sort();
}

export { mapGalleryCard };
