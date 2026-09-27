import { prisma } from "../../db/prisma";

const KEY_TO_FIELD = {
  business_name: "businessName",
  business_proprietor: "businessProprietor",
  business_gstin: "businessGstin",
  business_phone: "businessPhone",
  business_email: "businessEmail",
  business_address: "businessAddress",
  website_url: "websiteUrl",
  whatsapp_number: "whatsappNumber",
  instagram_handle: "instagramHandle",
  instagram_url: "instagramUrl",
  facebook_url: "facebookUrl",
  youtube_url: "youtubeUrl",
  linkedin_url: "linkedinUrl",
} as const;

type PublicKey = keyof typeof KEY_TO_FIELD;

export type PublicSettings = {
  businessName: string;
  businessProprietor: string;
  businessGstin: string;
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;
  websiteUrl: string;
  whatsappNumber: string;
  instagramHandle: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  youtubeUrl: string | null;
  linkedinUrl: string | null;
};

export async function getPublicSettings(): Promise<PublicSettings> {
  const rows = await prisma.operationalSetting.findMany({
    where: { key: { in: Object.keys(KEY_TO_FIELD) } },
  });
  const settings: PublicSettings = {
    businessName: "Vaibhav Celebrations",
    businessProprietor: "",
    businessGstin: "",
    businessPhone: "",
    businessEmail: "",
    businessAddress: "",
    websiteUrl: "",
    whatsappNumber: "",
    instagramHandle: null,
    instagramUrl: null,
    facebookUrl: null,
    youtubeUrl: null,
    linkedinUrl: null,
  };
  for (const row of rows) {
    const field = KEY_TO_FIELD[row.key as PublicKey];
    if (field) (settings[field] as string | null) = row.value || null;
  }
  return settings;
}
