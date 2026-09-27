import type { PublicSettings } from "@/lib/cms/types";

/** Official business details — fallbacks when the settings API is unavailable (mirrors backend/src/lib/business.ts). */
export const BUSINESS = {
  name: "Vaibhav Celebrations",
  proprietor: "Charu Saxena",
  gstin: "08BPIPS2048G2ZO",
  address: "B-404, Trimurti Apartments, Model Town, Malviya Nagar, Jaipur – 302017",
  phone: "+91 85275 75174",
  email: "support@vaibhavcelebrations.in",
  website: "www.vaibhavcelebrations.in",
  websiteUrl: "https://www.vaibhavcelebrations.in",
  instagramHandle: "@vaibhavcelebrations.in",
  instagramUrl: "https://www.instagram.com/vaibhavcelebrations.in/",
  facebookUrl: "https://www.facebook.com/profile.php?id=61574357200002",
  hours: "Mon – Sun, 10 AM – 6 PM",
} as const;

export const DEFAULT_PUBLIC_SETTINGS: PublicSettings = {
  businessName: BUSINESS.name,
  businessProprietor: BUSINESS.proprietor,
  businessGstin: BUSINESS.gstin,
  businessPhone: BUSINESS.phone,
  businessEmail: BUSINESS.email,
  businessAddress: BUSINESS.address,
  websiteUrl: BUSINESS.websiteUrl,
  whatsappNumber: "",
  instagramHandle: BUSINESS.instagramHandle,
  instagramUrl: BUSINESS.instagramUrl,
  facebookUrl: BUSINESS.facebookUrl,
  youtubeUrl: null,
  linkedinUrl: null,
};

/** A real phone number — rejects unset values and placeholders like "91XXXXXXXXXX". */
export function validPhoneOrNull(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v && /^\+?\d{10,15}$/.test(v.replace(/[\s-]/g, "")) ? v : null;
}

/** WhatsApp number from the build env if it's a real number, else the official business phone. */
export function envWhatsAppNumber(): string {
  return validPhoneOrNull(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER) ?? BUSINESS.phone;
}

/** "+91 85275 75174" → "tel:+918527575174" */
export function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
