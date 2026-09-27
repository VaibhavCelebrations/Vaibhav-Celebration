/** Official business details — the single source used by invoices, defaults, seed and data sync. */
export const BUSINESS = {
  name: "Vaibhav Celebrations",
  proprietor: "Charu Saxena",
  gstin: "08BPIPS2048G2ZO",
  addressLines: ["B-404, Trimurti Apartments", "Model Town, Malviya Nagar", "Jaipur – 302017"],
  address: "B-404, Trimurti Apartments, Model Town, Malviya Nagar, Jaipur – 302017",
  phone: "+91 85275 75174",
  phoneE164: "918527575174",
  email: "support@vaibhavcelebrations.in",
  website: "www.vaibhavcelebrations.in",
  websiteUrl: "https://www.vaibhavcelebrations.in",
  instagramHandle: "@vaibhavcelebrations.in",
  instagramUrl: "https://www.instagram.com/vaibhavcelebrations.in/",
  facebookName: "Vaibhav Celebrations",
  facebookUrl: "https://www.facebook.com/profile.php?id=61574357200002",
  /** Same hours as the policy pages and footer. */
  hours: "Mon – Sun, 10 AM – 6 PM",
} as const;

/** OperationalSetting rows the public site reads (see public-settings.service). */
export const BUSINESS_SETTINGS: Array<{ key: string; value: string }> = [
  { key: "business_name", value: BUSINESS.name },
  { key: "business_proprietor", value: BUSINESS.proprietor },
  { key: "business_gstin", value: BUSINESS.gstin },
  { key: "business_phone", value: BUSINESS.phone },
  { key: "business_email", value: BUSINESS.email },
  { key: "business_address", value: BUSINESS.address },
  { key: "website_url", value: BUSINESS.websiteUrl },
  { key: "whatsapp_number", value: `+${BUSINESS.phoneE164}` },
  { key: "instagram_handle", value: BUSINESS.instagramHandle },
  { key: "instagram_url", value: BUSINESS.instagramUrl },
  { key: "facebook_url", value: BUSINESS.facebookUrl },
];
