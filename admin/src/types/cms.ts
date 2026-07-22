import type { ISODate, MediaRef, Paise, SoftDeletable, Timestamped } from "./common";

// ─── Themes ─────────────────────────────────────────────────────────────────

export type Theme = SoftDeletable &
  Timestamped & {
    id: string;
    title: string;
    slug: string;
    shortDescription: string;
    storyDescription: string | null;
    audienceNote: string | null;
    heroImage: MediaRef | null;
    isActive: boolean;
    displayOrder: number;
    seoTitle: string | null;
    seoDescription: string | null;
    ogImage: MediaRef | null;
    // list-view summary counts, computed by the repo
    packageCount: number;
    galleryCount: number;
  };

export type ThemeInput = Pick<
  Theme,
  "title" | "slug" | "shortDescription" | "storyDescription" | "audienceNote" | "isActive" | "displayOrder" | "seoTitle" | "seoDescription"
> & { heroImageId?: string | null; ogImageId?: string | null };

export const SAMPLE_ASSET_TYPES = [
  "DIGITAL_INVITE",
  "VIDEO_INVITE",
  "PARENT_PARTY_BRIEF",
  "COUNTDOWN_CARD",
  "ACTIVITY_KIT",
  "RETURN_GIFT_PREVIEW",
  "OTHER",
] as const;
export type SampleAssetType = (typeof SAMPLE_ASSET_TYPES)[number];

export type ThemeSampleAsset = SoftDeletable & {
  id: string;
  themeId: string;
  type: SampleAssetType;
  title: string;
  media: MediaRef;
  description: string | null;
  displayOrder: number;
};

export type ThemePackageLink = {
  id: string;
  themeId: string;
  packageId: string;
  packageTitle: string;
  priceOverrideInPaise: Paise | null;
  isActive: boolean;
};

// ─── Packages ───────────────────────────────────────────────────────────────

export type Package = SoftDeletable &
  Timestamped & {
    id: string;
    title: string;
    slug: string;
    priceInPaise: Paise;
    tierRank: number;
    isRecommended: boolean;
    isActive: boolean;
    isCustomizable: boolean;
    displayOrder: number;
    description: string | null;
    serviceItemCount: number;
    includedServiceCount: number;
    themeCount: number;
    serviceItems?: PackageServiceItem[];
  };

export type PackageInput = Pick<
  Package,
  "title" | "slug" | "priceInPaise" | "tierRank" | "isRecommended" | "isActive" | "isCustomizable" | "displayOrder" | "description"
>;

export type ExtraService = SoftDeletable &
  Timestamped & {
    id: string;
    label: string;
    description: string | null;
    requirements: string | null;
    customizationPriceInPaise: Paise;
    displayOrder: number;
    isActive: boolean;
  };

export type ExtraServiceInput = Pick<
  ExtraService,
  "label" | "description" | "requirements" | "customizationPriceInPaise" | "displayOrder" | "isActive"
>;

export type PackageServiceItem = {
  id?: string;
  extraServiceId: string;
  label?: string;
  description?: string | null;
  requirements?: string | null;
  customizationPriceInPaise?: Paise;
  isIncluded: boolean;
  displayOrder: number;
};

export type PackageMatrixCell = {
  extraServiceId: string;
  isIncluded: boolean;
};

export type PackageMatrixRow = {
  packageId: string;
  title: string;
  description: string | null;
  priceInPaise: number;
  isRecommended: boolean;
  isActive: boolean;
  isCustomizable: boolean;
  items: PackageMatrixCell[];
};

export type PackageMatrixSavePayload = {
  packages: PackageMatrixRow[];
  extraServices: Array<{ id: string; customizationPriceInPaise: number }>;
};

/** @deprecated use PackageServiceItem */
export type PackageFeature = SoftDeletable & {
  id: string;
  packageId: string;
  label: string;
  quantity: number;
  unit: string | null;
  sampleAssetType: SampleAssetType | null;
  displayOrder: number;
};

/** @deprecated use PackageServiceItem */
export type PackageCustomizationOption = SoftDeletable & {
  id: string;
  packageId: string;
  label: string;
  extraPriceInPaise: Paise;
  minQuantity: number;
  maxQuantity: number | null;
  isActive: boolean;
  displayOrder: number;
};

/** @deprecated */
export type PackageAddOnLink = {
  id: string;
  packageId: string;
  addOnServiceId: string;
  addOnServiceTitle: string;
  addOnServicePriceInPaise: Paise;
  isDefaultIncluded: boolean;
};

// ─── Gallery ────────────────────────────────────────────────────────────────

export const GALLERY_CTA_TYPES = ["NONE", "THEME", "PACKAGE", "EVENT", "BOOKING"] as const;
export type GalleryCtaType = (typeof GALLERY_CTA_TYPES)[number];

export type GalleryTag = { id: string; name: string };

export type GalleryImage = SoftDeletable & {
  id: string;
  media: MediaRef;
  caption: string | null;
  altText: string;
  themeId: string | null;
  themeTitle: string | null;
  ctaType: GalleryCtaType;
  ctaTargetSlug: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: ISODate;
  tags: GalleryTag[];
};

export type GalleryImageInput = Pick<GalleryImage, "caption" | "altText" | "themeId" | "ctaType" | "ctaTargetSlug" | "isActive" | "displayOrder"> & {
  mediaUrl: string;
  tagNames: string[];
};

// ─── Events ─────────────────────────────────────────────────────────────────

export const EVENT_PAGE_TEMPLATES = ["CLASSIC_HERO", "EDITORIAL_SPLIT", "FESTIVE_IMMERSIVE"] as const;
export type EventPageTemplate = (typeof EVENT_PAGE_TEMPLATES)[number];

export type EventActivity = {
  title: string;
  description: string | null;
  icon: string | null;
};

export const PAYMENT_STATUSES = ["NOT_REQUIRED", "PENDING", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type EventRegistration = SoftDeletable & {
  id: string;
  eventId: string;
  name: string;
  email: string;
  phone: string;
  guestCount: number;
  notes: string | null;
  paymentStatus: PaymentStatus;
  amountPaidInPaise: Paise | null;
  createdAt: ISODate;
};

export type EventItem = SoftDeletable &
  Timestamped & {
    id: string;
    title: string;
    slug: string;
    bannerMedia: MediaRef | null;
    description: string;
    activities: EventActivity[];
    ageGroup: string | null;
    venue: string | null;
    scheduleStartAt: ISODate | null;
    scheduleEndAt: ISODate | null;
    isRegistrationOpen: boolean;
    registrationFeeInPaise: Paise | null;
    themeId: string | null;
    themeTitle: string | null;
    pageTemplate: EventPageTemplate;
    seoTitle: string | null;
    seoDescription: string | null;
    isActive: boolean;
    registrationCount: number;
  };

export type EventInput = Pick<
  EventItem,
  "title" | "slug" | "description" | "ageGroup" | "venue" | "scheduleStartAt" | "scheduleEndAt" | "isRegistrationOpen" | "registrationFeeInPaise" | "themeId" | "pageTemplate" | "seoTitle" | "seoDescription" | "isActive"
>;

// ─── Blog ───────────────────────────────────────────────────────────────────

export const BLOG_STATUSES = ["DRAFT", "PUBLISHED", "UNPUBLISHED"] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

export type BlogCategory = { id: string; name: string };
export type BlogTag = { id: string; name: string };

export type BlogPost = SoftDeletable &
  Timestamped & {
    id: string;
    title: string;
    slug: string;
    featuredImage: MediaRef | null;
    contentHtml: string;
    excerpt: string | null;
    authorName: string | null;
    status: BlogStatus;
    publishedAt: ISODate | null;
    seoTitle: string | null;
    seoDescription: string | null;
    categories: BlogCategory[];
    tags: BlogTag[];
  };

export type BlogPostInput = Pick<
  BlogPost,
  "title" | "slug" | "contentHtml" | "excerpt" | "authorName" | "status" | "publishedAt" | "seoTitle" | "seoDescription"
> & { categoryNames: string[]; tagNames: string[] };

// ─── FAQs ───────────────────────────────────────────────────────────────────

export type Faq = SoftDeletable & {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  displayOrder: number;
  isActive: boolean;
};

export type FaqInput = Pick<Faq, "question" | "answer" | "category" | "displayOrder" | "isActive">;

// ─── Testimonials ───────────────────────────────────────────────────────────

export const TESTIMONIAL_SUBJECT_TYPES = ["THEME", "PACKAGE", "GENERAL"] as const;
export type TestimonialSubjectType = (typeof TESTIMONIAL_SUBJECT_TYPES)[number];

export type Testimonial = SoftDeletable & {
  id: string;
  customerName: string;
  content: string;
  rating: number | null;
  subjectType: TestimonialSubjectType;
  themeId: string | null;
  themeTitle: string | null;
  packageId: string | null;
  packageTitle: string | null;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: ISODate;
};

export type TestimonialInput = Pick<
  Testimonial,
  "customerName" | "content" | "rating" | "subjectType" | "themeId" | "packageId" | "isFeatured" | "isActive"
>;

// ─── Popups ─────────────────────────────────────────────────────────────────

export const POPUP_PLACEMENTS = ["HOMEPAGE", "THEMES_PAGE", "PACKAGES_PAGE", "GALLERY_PAGE"] as const;
export type PopupPlacement = (typeof POPUP_PLACEMENTS)[number];

export type Popup = SoftDeletable & {
  id: string;
  title: string;
  bodyText: string | null;
  image: MediaRef | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  placements: PopupPlacement[];
  triggerAfterSeconds: number;
  linkedEventId: string | null;
  linkedEventTitle: string | null;
  isActive: boolean;
  startsAt: ISODate | null;
  endsAt: ISODate | null;
};

export type PopupInput = Pick<
  Popup,
  "title" | "bodyText" | "ctaLabel" | "ctaUrl" | "placements" | "triggerAfterSeconds" | "linkedEventId" | "isActive" | "startsAt" | "endsAt"
>;
