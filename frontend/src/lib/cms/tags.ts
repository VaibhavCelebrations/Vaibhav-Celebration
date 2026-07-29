export const CMS_REVALIDATE = 300;

export const CMS_TAGS = {
  themes: "cms:themes",
  theme: (slug: string) => `cms:themes:${slug}`,
  packages: "cms:packages",
  package: (slug: string) => `cms:packages:${slug}`,
  gallery: "cms:gallery",
  blog: "cms:blog",
  blogPost: (slug: string) => `cms:blog:${slug}`,
  events: "cms:events",
  event: (slug: string) => `cms:events:${slug}`,
  testimonials: "cms:testimonials",
  faqs: "cms:faqs",
  settings: "cms:settings",
  page: (pageKey: string) => `cms:pages:${pageKey}`,
  legal: (type: string) => `cms:legal:${type}`,
  metadata: (pageKey: string) => `cms:metadata:${pageKey}`,
} as const;

/** In dev, skip fetch cache so CMS edits appear on reload without waiting for webhooks. */
export function cmsFetchOptions(tag: string) {
  if (process.env.NODE_ENV === "development") {
    return { cache: "no-store" as const, next: { tags: [tag] } };
  }
  return { next: { revalidate: CMS_REVALIDATE, tags: [tag] } };
}
