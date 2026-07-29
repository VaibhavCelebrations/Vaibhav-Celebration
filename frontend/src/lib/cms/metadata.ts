import type { Metadata } from "next";
import { apiFetch } from "@/lib/api-client";
import type { SiteMetadataRecord } from "./types";
import { CMS_TAGS, cmsFetchOptions } from "./tags";

export async function getPageMetadata(pageKey: string): Promise<SiteMetadataRecord> {
  return apiFetch<SiteMetadataRecord>(`/metadata/${pageKey}`, cmsFetchOptions(CMS_TAGS.metadata(pageKey)));
}

export async function buildPageMetadata(pageKey: string, fallback?: Metadata): Promise<Metadata> {
  try {
    const meta = await getPageMetadata(pageKey);
    return {
      ...fallback,
      title: meta.metaTitle ?? fallback?.title,
      description: meta.metaDescription ?? (typeof fallback?.description === "string" ? fallback.description : undefined),
      alternates: meta.canonicalUrl ? { canonical: meta.canonicalUrl } : undefined,
      openGraph: {
        ...(typeof fallback?.openGraph === "object" ? fallback.openGraph : {}),
        title: meta.metaTitle ?? undefined,
        description: meta.metaDescription ?? undefined,
        images: meta.ogImage?.url ? [{ url: meta.ogImage.url }] : undefined,
      },
    };
  } catch {
    return fallback ?? {};
  }
}
