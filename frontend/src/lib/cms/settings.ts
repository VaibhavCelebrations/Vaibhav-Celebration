import { apiFetch } from "@/lib/api-client";
import { BUSINESS, validPhoneOrNull } from "@/lib/business";
import type { PublicSettings } from "./types";
import { CMS_TAGS, cmsFetchOptions } from "./tags";

export async function getPublicSettings(): Promise<PublicSettings> {
  return apiFetch<PublicSettings>("/settings/public", cmsFetchOptions(CMS_TAGS.settings));
}

export async function getWhatsAppNumber(): Promise<string> {
  const fromEnv = validPhoneOrNull(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER);
  if (fromEnv) return fromEnv;
  try {
    const settings = await getPublicSettings();
    return validPhoneOrNull(settings.whatsappNumber) ?? validPhoneOrNull(settings.businessPhone) ?? BUSINESS.phone;
  } catch {
    return BUSINESS.phone;
  }
}

/** Optional pre-filled text for `wa.me` links, e.g. "Hi! I'd like to know more about your celebration packages." */
export function getWhatsAppPrefillMessage(): string | undefined {
  return process.env.NEXT_PUBLIC_WHATSAPP_PREFILL_MESSAGE?.trim() || undefined;
}
