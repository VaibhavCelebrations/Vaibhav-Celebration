import type {
  ApiBlogPost,
  ApiEvent,
  ApiGalleryImage,
  ApiPackage,
  ApiTheme,
  ApiThemeDetail,
  ApiTestimonial,
  BlogCard,
  EventCard,
  GalleryCard,
  MediaRef,
  PackageCard,
  TestimonialCard,
  ThemeCard,
} from "./types";

const FALLBACK_IMAGE = "/theme/gallery_setup.png";

export function mediaUrl(ref: MediaRef | null | undefined, fallback = FALLBACK_IMAGE): string {
  return ref?.url?.trim() || fallback;
}

export function formatInrFromPaise(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

export function formatDisplayDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export function estimateReadTime(htmlOrText: string): string {
  const words = htmlOrText.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

export function galleryAspectRatio(media: MediaRef | null | undefined): GalleryCard["aspectRatio"] {
  if (!media?.width || !media?.height) return "landscape";
  const ratio = media.width / media.height;
  if (ratio < 0.85) return "portrait";
  if (ratio > 1.15) return "landscape";
  return "square";
}

export function mapThemeCard(theme: ApiTheme): ThemeCard {
  const hero = mediaUrl(theme.heroImage);
  return {
    id: theme.id,
    title: theme.title,
    slug: theme.slug,
    shortDescription: theme.shortDescription,
    fullDescription: theme.storyDescription ?? theme.shortDescription,
    heroImageUrl: hero,
    cardImageUrl: hero,
    seoTitle: theme.seoTitle ?? `${theme.title} | Vaibhav Celebrations`,
    seoDescription: theme.seoDescription ?? theme.shortDescription,
    themeVibe: theme.audienceNote ?? "",
    galleryImages: [hero],
  };
}

export function mapThemeDetail(theme: ApiThemeDetail): ThemeCard {
  const MAX_GALLERY = 5;
  const MAX_MEDIA = 12;
  const hero = mediaUrl(theme.heroImage);

  // Samples can be videos or PDFs. Only images may reach next/image; videos go to the viewer; the rest are skipped.
  const isImage = (m: MediaRef | null | undefined) => !m?.type || m.type.startsWith("image/");
  const isVideo = (m: MediaRef | null | undefined) => Boolean(m?.type?.startsWith("video/"));

  const media: NonNullable<ThemeCard["galleryMedia"]> = [
    { url: hero, type: theme.heroImage?.type ?? "image/*", altText: theme.heroImage?.altText ?? theme.title },
    ...theme.galleryImages
      .filter((g) => g.media?.url && isImage(g.media))
      .map((g) => ({ url: g.media.url, type: g.media.type, altText: g.altText, caption: g.caption })),
    ...theme.sampleAssets
      .filter((a) => a.media?.url && (isImage(a.media) || isVideo(a.media)))
      .map((a) => ({ url: a.media.url, type: a.media.type, altText: a.media.altText ?? a.title, caption: a.title })),
  ];
  const seen = new Set<string>();
  const galleryMedia = media.filter((m) => !seen.has(m.url) && seen.add(m.url)).slice(0, MAX_MEDIA);
  const allGallery = galleryMedia
    .filter((m) => !m.type?.startsWith("video/"))
    .map((m) => m.url)
    .slice(0, MAX_GALLERY);

  return {
    id: theme.id,
    title: theme.title,
    slug: theme.slug,
    shortDescription: theme.shortDescription,
    fullDescription: theme.storyDescription ?? theme.shortDescription,
    heroImageUrl: hero,
    cardImageUrl: hero,
    seoTitle: theme.seoTitle ?? `${theme.title} | Vaibhav Celebrations`,
    seoDescription: theme.seoDescription ?? theme.shortDescription,
    themeVibe: theme.audienceNote ?? "",
    galleryImages: allGallery.length ? allGallery : [hero],
    galleryMedia,
  };
}

export function mapPackageCard(pkg: ApiPackage, priceOverrideInPaise?: number | null): PackageCard {
  const price = priceOverrideInPaise ?? pkg.priceInPaise;
  // Décor is location-dependent and described separately; services without a slug are not customer-facing.
  const listed = pkg.serviceItems
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .filter((item) => item.extraService.slug && item.extraService.isActive !== false && item.extraService.category !== "DECOR");
  const services = listed.map((item) => ({
    id: item.extraService.id,
    label: item.extraService.label,
    description: item.extraService.description,
    stage: item.extraService.celebrationStage ?? null,
    included: item.isIncluded,
    chooseCount: item.extraService.isProductChoice ? (item.extraService.selectionCount ?? 1) : null,
    previewMedia: item.extraService.hasPreview ? (item.extraService.previewMedia ?? []) : [],
  }));
  const features = services.filter((s) => s.included).map((s) => ({ label: s.label, included: true }));
  return {
    id: pkg.id,
    title: pkg.displayName?.trim() || pkg.title,
    slug: pkg.slug,
    priceLabel: formatInrFromPaise(price),
    basePrice: price / 100,
    tierRank: pkg.tierRank,
    isRecommended: pkg.isRecommended,
    badgeText: pkg.isRecommended ? "Most Loved" : null,
    pricingUnit: null,
    hasGiftRegistry: pkg.slug === "signature" || pkg.slug === "grand",
    description: pkg.description ?? "",
    features,
    services,
  };
}

export function mapGalleryCard(image: ApiGalleryImage): GalleryCard {
  return {
    id: image.id,
    imageUrl: mediaUrl(image.media),
    caption: image.caption ?? "",
    altText: image.altText,
    tags: image.tags.map((t) => t.tag.name),
    themeSlug: image.theme?.slug,
    aspectRatio: galleryAspectRatio(image.media),
  };
}

export function mapTestimonialCard(item: ApiTestimonial): TestimonialCard {
  return {
    id: item.id,
    customerName: item.customerName,
    content: item.content,
    rating: item.rating ?? 5,
    role: "Parent",
  };
}

export function mapBlogCard(post: ApiBlogPost): BlogCard {
  const category = post.categories[0]?.category.name ?? "Articles";
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    shortDescription: post.excerpt ?? "",
    content: post.contentHtml,
    coverImage: mediaUrl(post.featuredImage, "/theme/gallery_cake.png"),
    date: formatDisplayDate(post.publishedAt),
    category,
    readTime: estimateReadTime(post.contentHtml),
    author: post.authorName ?? "Vaibhav Celebrations",
    tags: post.tags.map((t) => t.tag.name),
    isFeatured: post.isFeatured ?? false,
  };
}

export function mapEventCard(event: ApiEvent): EventCard {
  const cover = mediaUrl(event.bannerMedia);
  return {
    id: event.id,
    title: event.title,
    slug: event.slug,
    location: event.venue ?? "",
    theme: event.theme?.title ?? "",
    date: formatDisplayDate(event.scheduleStartAt),
    shortDescription: event.description,
    coverImage: cover,
    gallery: (event.gallery ?? []).map((m) => mediaUrl(m)),
    ageGroup: event.ageGroup ?? undefined,
    isRegistrationOpen: event.isRegistrationOpen,
    registrationFeeInPaise: event.registrationFeeInPaise ?? undefined,
    activities: event.activities,
    faqItems: event.faqItems,
    ctaLabel: event.ctaLabel ?? undefined,
    ctaUrl: event.ctaUrl ?? undefined,
    seoTitle: event.seoTitle ?? undefined,
    seoDescription: event.seoDescription ?? undefined,
  };
}

export function resolveSectionMedia(
  value: MediaRef | { mediaId: string } | null | undefined,
  fallback = FALLBACK_IMAGE,
): string {
  if (!value) return fallback;
  if ("url" in value && value.url) return value.url;
  return fallback;
}

export function whatsappHref(number: string, message?: string): string {
  const digits = number.replace(/\D/g, "");
  if (!digits) return "https://wa.me/";
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
