import { apiFetch } from "@/lib/api-client";
import type { ApiEvent } from "./types";
import { mapEventCard } from "./map-media";
import { CMS_TAGS, cmsFetchOptions } from "./tags";

export async function listEvents(upcoming?: boolean) {
  const qs = upcoming ? "?upcoming=true" : "";
  const data = await apiFetch<ApiEvent[]>(`/events${qs}`, cmsFetchOptions(CMS_TAGS.events));
  return data.map(mapEventCard);
}

export async function getEventBySlug(slug: string) {
  const data = await apiFetch<ApiEvent>(`/events/${slug}`, cmsFetchOptions(CMS_TAGS.event(slug)));
  return mapEventCard(data);
}

export async function registerForEvent(
  slug: string,
  payload: {
    name: string;
    email: string;
    phone: string;
    guestCount?: number;
    notes?: string;
  },
) {
  return apiFetch(`/events/${slug}/register`, {
    method: "POST",
    body: payload,
    cache: "no-store",
  });
}

export { mapEventCard };
