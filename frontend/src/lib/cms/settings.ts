import { apiFetch } from "@/lib/api-client";
import type { PublicSettings } from "./types";
import { CMS_TAGS, cmsFetchOptions } from "./tags";

export async function getPublicSettings(): Promise<PublicSettings> {
  return apiFetch<PublicSettings>("/settings/public", cmsFetchOptions(CMS_TAGS.settings));
}

export async function getWhatsAppNumber(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim();
  if (fromEnv) return fromEnv;
  try {
    const settings = await getPublicSettings();
    return settings.whatsappNumber?.trim() || "";
  } catch {
    return "";
  }
}

/** Optional pre-filled text for `wa.me` links, e.g. "Hi! I'd like to know more about your celebration packages." */
export function getWhatsAppPrefillMessage(): string | undefined {
  return process.env.NEXT_PUBLIC_WHATSAPP_PREFILL_MESSAGE?.trim() || undefined;
}
