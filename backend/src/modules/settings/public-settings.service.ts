import { prisma } from "../../db/prisma";

const PUBLIC_KEYS = [
  "business_name",
  "business_phone",
  "business_email",
  "business_address",
  "whatsapp_number",
  "instagram_url",
  "facebook_url",
  "youtube_url",
  "linkedin_url",
] as const;

export type PublicSettings = {
  businessName: string;
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;
  whatsappNumber: string;
  instagramUrl: string | null;
  facebookUrl: string | null;
  youtubeUrl: string | null;
  linkedinUrl: string | null;
};

function mapKey(key: string): keyof PublicSettings | null {
  const map: Record<string, keyof PublicSettings> = {
    business_name: "businessName",
    business_phone: "businessPhone",
    business_email: "businessEmail",
    business_address: "businessAddress",
    whatsapp_number: "whatsappNumber",
    instagram_url: "instagramUrl",
    facebook_url: "facebookUrl",
    youtube_url: "youtubeUrl",
    linkedin_url: "linkedinUrl",
  };
  return map[key] ?? null;
}

export async function getPublicSettings(): Promise<PublicSettings> {
  const rows = await prisma.operationalSetting.findMany({
    where: { key: { in: [...PUBLIC_KEYS] } },
  });
  const defaults: PublicSettings = {
    businessName: "Vaibhav Celebrations",
    businessPhone: "",
    businessEmail: "",
    businessAddress: "",
    whatsappNumber: "",
    instagramUrl: null,
    facebookUrl: null,
    youtubeUrl: null,
    linkedinUrl: null,
  };
  for (const row of rows) {
    const field = mapKey(row.key);
    if (field) {
      (defaults[field] as string | null) = row.value || null;
    }
  }
  return defaults;
}
