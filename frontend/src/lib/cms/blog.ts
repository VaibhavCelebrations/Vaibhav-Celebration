import { apiFetch } from "@/lib/api-client";
import type { ApiBlogPost } from "./types";
import { mapBlogCard } from "./map-media";
import { CMS_TAGS, cmsFetchOptions } from "./tags";

export async function listBlogPosts() {
  const data = await apiFetch<ApiBlogPost[]>("/blog", cmsFetchOptions(CMS_TAGS.blog));
  return data.map(mapBlogCard);
}

export async function getBlogPostBySlug(slug: string) {
  const data = await apiFetch<ApiBlogPost>(`/blog/${slug}`, cmsFetchOptions(CMS_TAGS.blogPost(slug)));
  return mapBlogCard(data);
}

export { mapBlogCard };
