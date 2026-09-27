import type { BuilderProduct, BuilderSelections } from "@/lib/builder-api";

/** Minimum children per booking — same rule as the packages and enforced by the quote API. */
export const MIN_GUESTS = 5;

export const CELEBRATION_TYPES = ["Birthday", "Other"] as const;

export type Details = {
  eventType: string;
  childName: string;
  childAge: string;
  eventDate: string;
  guestCount: number;
};

export type Contact = { name: string; email: string; phone: string };

export type AddressForm = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
};

export type Selections = {
  /** ExtraService id → picked product SKUs (any number). */
  choices: Record<string, string[]>;
  /** SKU → customer wants personalization. */
  personalization: Record<string, boolean>;
  giftRegistry: boolean;
};

export const EMPTY_DETAILS: Details = { eventType: "", childName: "", childAge: "", eventDate: "", guestCount: 10 };
export const EMPTY_CONTACT: Contact = { name: "", email: "", phone: "" };
export const EMPTY_ADDRESS: AddressForm = { line1: "", line2: "", city: "", state: "Rajasthan", country: "India", pincode: "" };
export const EMPTY_SELECTIONS: Selections = { choices: {}, personalization: {}, giftRegistry: false };

export const STORAGE_KEY = "vc-custom-plan-draft";

/* ─── Dates ───────────────────────────────────────────────────────── */

export const getTodayDateString = () => {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
};

/** Orders must be placed at least 7 days before the celebration. */
export const isDateWithin7Days = (dateStr: string) => {
  if (!dateStr) return false;
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return false;
  const [year, month, day] = parts;
  const selected = new Date(year, month - 1, day);
  selected.setHours(0, 0, 0, 0);
  const minAllowed = new Date();
  minAllowed.setDate(minAllowed.getDate() + 7);
  minAllowed.setHours(0, 0, 0, 0);
  return selected < minAllowed;
};

export const formatEventDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
};

/* ─── Location / validation ───────────────────────────────────────── */

export const locationFor = (city: string): "jaipur" | "outside" =>
  city.trim().toLowerCase() === "jaipur" ? "jaipur" : "outside";

export type DetailErrors = Partial<Record<
  "eventType" | "childName" | "eventDate" | "guestCount" | "name" | "email" | "phone" | "line1" | "city" | "state" | "country" | "pincode",
  string
>>;

export function validateDetails(d: Details, c: Contact, a: AddressForm): DetailErrors {
  const e: DetailErrors = {};
  if (!d.eventType) e.eventType = "Select the type of celebration";
  if (!d.childName.trim()) e.childName = "Enter the child's name";
  if (!d.eventDate) e.eventDate = "Choose the celebration date";
  else if (isDateWithin7Days(d.eventDate)) e.eventDate = "Orders must be placed at least 7 days before the celebration date";
  if (!Number.isFinite(d.guestCount) || d.guestCount < MIN_GUESTS) e.guestCount = `Minimum ${MIN_GUESTS} children per booking`;
  if (!c.name.trim()) e.name = "Enter your name";
  if (!/^\S+@\S+\.\S+$/.test(c.email.trim())) e.email = "Enter a valid email address";
  if (c.phone.replace(/\D/g, "").length < 6) e.phone = "Enter a valid phone number";
  if (!a.line1.trim()) e.line1 = "Enter the delivery address";
  if (!a.city.trim()) e.city = "Enter the city";
  if (!a.state.trim()) e.state = "Enter the state";
  if (!a.country.trim()) e.country = "Enter the country";
  if (!/^\d{4,10}$/.test(a.pincode.trim())) e.pincode = "Enter a valid PIN code";
  return e;
}

/* ─── Selections ──────────────────────────────────────────────────── */

export function toBuilderSelections(sel: Selections): BuilderSelections {
  const choices = Object.fromEntries(Object.entries(sel.choices).filter(([, skus]) => skus.length > 0));
  const picked = new Set(Object.values(choices).flat());
  return {
    choices,
    // only send opt-ins for products that are actually picked
    personalization: Object.fromEntries(Object.entries(sel.personalization).filter(([sku, on]) => on && picked.has(sku))),
    decor: false,
    giftRegistryCustomize: sel.giftRegistry,
  };
}

export const countPicked = (sel: Selections) => Object.values(sel.choices).reduce((n, skus) => n + skus.length, 0);

/** Client-side estimate of one product's line for the card — the quote API is authoritative. */
export function estimateLine(p: BuilderProduct, guestCount: number, isGroup: boolean, personalize: boolean) {
  const unit = p.priceInPaise + (personalize && p.personalizationEnabled ? p.personalizationCostInPaise : 0);
  const moqApplied = guestCount < p.minOrderQuantity;
  const qty = isGroup ? (moqApplied ? p.minOrderQuantity : 1) : Math.max(guestCount, p.minOrderQuantity);
  return { unit, qty, total: unit * qty, moqApplied };
}

/* ─── Categories (from the admin package matrix) ──────────────────── */

const CATEGORY_META: Record<string, { label: string; order: number }> = {
  WELCOME_ITEM: { label: "Welcome Items", order: 1 },
  CHILDREN_ACTIVITY: { label: "Children's Activities", order: 2 },
  FAMILY_ACTIVITY: { label: "Family Activities", order: 3 },
  RETURN_GIFT: { label: "Return Gifts", order: 4 },
  KEEPSAKE: { label: "Keepsakes", order: 5 },
  DIGITAL: { label: "Digital Extras", order: 6 },
  PACKAGING: { label: "Packaging", order: 7 },
  THANK_YOU_TAG: { label: "Thank-you Tags", order: 8 },
  PERSONALIZATION: { label: "Personalised Touches", order: 9 },
  DECOR: { label: "Décor", order: 10 },
};

export function categoryMeta(category: string | null) {
  return (category && CATEGORY_META[category]) || { label: "More Options", order: 99 };
}
