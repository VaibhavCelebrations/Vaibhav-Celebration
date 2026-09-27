import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { listThemes } from "@/lib/cms/themes";
import { listBlogPosts } from "@/lib/cms/blog";
import { listEvents } from "@/lib/cms/events";
import { listProducts, listProductCollections } from "@/lib/shop-api";

// Regenerate hourly: new themes/products/posts show up without a redeploy.
export const revalidate = 3600;

const STATIC_ROUTES: Array<{ path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }> = [
  { path: "", priority: 1, changeFrequency: "daily" },
  { path: "/themes", priority: 0.9, changeFrequency: "weekly" },
  { path: "/packages", priority: 0.9, changeFrequency: "weekly" },
  { path: "/gifts", priority: 0.9, changeFrequency: "daily" },
  { path: "/events", priority: 0.7, changeFrequency: "weekly" },
  { path: "/gallery", priority: 0.7, changeFrequency: "weekly" },
  { path: "/blog", priority: 0.7, changeFrequency: "weekly" },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.6, changeFrequency: "monthly" },
  { path: "/consultation", priority: 0.8, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.5, changeFrequency: "monthly" },
  { path: "/legal/privacy-policy", priority: 0.2, changeFrequency: "monthly" },
  { path: "/legal/terms-of-service", priority: 0.2, changeFrequency: "monthly" },
  { path: "/legal/refund-policy", priority: 0.2, changeFrequency: "monthly" },
];

/** A failing data source must never break the whole sitemap — that page set is just omitted. */
async function safe<T>(load: () => Promise<T[]>): Promise<T[]> {
  try {
    return await load();
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [themes, posts, events, products, collections] = await Promise.all([
    safe(() => listThemes()),
    safe(() => listBlogPosts()),
    safe(() => listEvents()),
    safe(async () => (await listProducts({ pageSize: 100 })).items),
    safe(() => listProductCollections()),
  ]);

  return [
    ...STATIC_ROUTES.map((r) => ({
      url: `${SITE_URL}${r.path}`,
      lastModified: now,
      changeFrequency: r.changeFrequency,
      priority: r.priority,
    })),
    ...themes.map((t) => ({ url: `${SITE_URL}/themes/${t.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...products.map((p) => ({ url: `${SITE_URL}/gifts/${p.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...collections.map((c) => ({ url: `${SITE_URL}/gifts/collection/${c.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...posts.map((p) => ({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...events.map((e) => ({ url: `${SITE_URL}/events/${e.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
