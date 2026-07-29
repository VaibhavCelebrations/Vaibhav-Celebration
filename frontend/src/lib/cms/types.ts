export type MediaRef = {
  id: string;
  url: string;
  altText: string | null;
  type: string;
  width: number | null;
  height: number | null;
};

export type CtaLink = { label: string; href: string };

export type HomeHeroSection = {
  eyebrow?: string;
  headline?: string;
  headlineAccent?: string;
  subheadline?: string;
  primaryCta?: CtaLink;
  secondaryCta?: CtaLink;
  backgroundImage?: MediaRef | { mediaId: string } | null;
};

export type HomeDeliverablesSection = {
  title?: string;
  subtitle?: string;
};

export type HomeOurStorySection = {
  title?: string;
  paragraphs?: string[];
  images?: Array<MediaRef | { mediaId: string }>;
};

export type HomeCtaBandSection = {
  headline?: string;
  subheadline?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export type HomePageSections = {
  hero?: HomeHeroSection;
  deliverables?: HomeDeliverablesSection;
  ourStory?: HomeOurStorySection;
  ctaBand?: HomeCtaBandSection;
};

export type AboutHeroSection = {
  title?: string;
  subtitle?: string;
};

export type AboutStorySection = {
  title?: string;
  paragraphs?: string[];
};

export type AboutValuesSection = {
  title?: string;
  items?: Array<{ title: string; description: string }>;
};

export type AboutPageSections = {
  hero?: AboutHeroSection;
  story?: AboutStorySection;
  values?: AboutValuesSection;
};

export type ContactHeroSection = {
  title?: string;
  subtitle?: string;
};

export type ContactInfoSection = {
  phone?: string;
  email?: string;
  address?: string;
  hours?: string;
};

export type ContactFormLabels = {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  submit?: string;
};

export type ContactPageSections = {
  hero?: ContactHeroSection;
  info?: ContactInfoSection;
  formLabels?: ContactFormLabels;
  mapEmbedUrl?: string;
};

export type PageKey = "home" | "about" | "contact";

export type PageContent<TSections = Record<string, unknown>> = {
  pageKey: PageKey;
  sections: TSections;
  updatedAt: string;
};

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

export type SiteMetadataRecord = {
  id: string;
  pageKey: string;
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  schemaJsonLd: unknown;
  ogImage: MediaRef | null;
  updatedAt: string;
};

export type LegalPageRecord = {
  id: string;
  type: string;
  title: string;
  bodyHtml: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type LegalPageType =
  | "privacy-policy"
  | "terms-of-service"
  | "refund-policy"
  | "cancellation-policy";

export type ApiTheme = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  storyDescription: string | null;
  audienceNote: string | null;
  isActive: boolean;
  displayOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
  heroImage: MediaRef | null;
};

export type ApiThemeDetail = ApiTheme & {
  sampleAssets: Array<{
    id: string;
    type: string;
    title: string;
    description: string | null;
    displayOrder: number;
    media: MediaRef;
  }>;
  galleryImages: Array<{
    id: string;
    caption: string | null;
    altText: string;
    displayOrder: number;
    media: MediaRef;
  }>;
  packages: Array<{
    id: string;
    priceOverrideInPaise: number | null;
    isActive: boolean;
    package: ApiPackage;
  }>;
};

export type ApiPackageServiceItem = {
  id: string;
  isIncluded: boolean;
  displayOrder: number;
  extraService: {
    id: string;
    label: string;
    description: string | null;
  };
};

export type ApiPackage = {
  id: string;
  title: string;
  slug: string;
  priceInPaise: number;
  tierRank: number;
  isRecommended: boolean;
  isActive: boolean;
  description: string | null;
  serviceItems: ApiPackageServiceItem[];
};

export type ApiGalleryImage = {
  id: string;
  caption: string | null;
  altText: string;
  displayOrder: number;
  media: MediaRef;
  theme: { id: string; title: string; slug: string } | null;
  tags: Array<{ tag: { id: string; name: string } }>;
};

export type ApiTestimonial = {
  id: string;
  customerName: string;
  content: string;
  rating: number | null;
  isFeatured: boolean;
};

export type ApiFaq = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  displayOrder: number;
};

export type ApiBlogPost = {
  id: string;
  title: string;
  slug: string;
  contentHtml: string;
  excerpt: string | null;
  authorName: string | null;
  publishedAt: string | null;
  isFeatured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  featuredImage: MediaRef | null;
  categories: Array<{ category: { id: string; name: string } }>;
  tags: Array<{ tag: { id: string; name: string } }>;
};

export type ApiEvent = {
  id: string;
  title: string;
  slug: string;
  description: string;
  venue: string | null;
  scheduleStartAt: string | null;
  scheduleEndAt: string | null;
  ageGroup: string | null;
  bannerMedia: MediaRef | null;
  theme: { id: string; title: string; slug: string } | null;
  gallery?: MediaRef[];
  template?: unknown;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

/** UI-friendly shapes used by existing components */
export type ThemeCard = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  heroImageUrl: string;
  cardImageUrl: string;
  seoTitle: string;
  seoDescription: string;
  themeVibe: string;
  galleryImages: string[];
};

export type PackageCard = {
  id: string;
  title: string;
  slug: string;
  priceLabel: string;
  basePrice: number;
  tierRank: number;
  isRecommended: boolean;
  description: string;
  features: Array<{ label: string; included: boolean }>;
};

export type GalleryCard = {
  id: string;
  imageUrl: string;
  caption: string;
  altText: string;
  tags: string[];
  aspectRatio: "portrait" | "landscape" | "square";
};

export type TestimonialCard = {
  id: string;
  customerName: string;
  content: string;
  rating: number;
  role: string;
};

export type BlogCard = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  content: string;
  coverImage: string;
  date: string;
  category: string;
  readTime: string;
  author: string;
  tags: string[];
  isFeatured: boolean;
};

export type EventCard = {
  id: string;
  title: string;
  slug: string;
  location: string;
  theme: string;
  date: string;
  shortDescription: string;
  coverImage: string;
  gallery: string[];
};

export type ContactFormPayload = {
  name: string;
  email?: string;
  phone?: string;
  message?: string;
  interestArea?: string;
};
