import { apiFetch } from "@/lib/api-client";
import type { ApiPackage } from "./types";
import { mapPackageCard } from "./map-media";
import { CMS_TAGS, cmsFetchOptions } from "./tags";

export const PACKAGE_TIER_SLUGS = ["essential", "signature", "grand"] as const;

export function liveTierPackages<T extends { slug: string }>(packages: T[]): T[] {
  return PACKAGE_TIER_SLUGS.map((slug) => packages.find((p) => p.slug === slug)).filter(
    (p): p is T => Boolean(p),
  );
}

export async function listPackages() {
  const data = await apiFetch<ApiPackage[]>("/packages", cmsFetchOptions(CMS_TAGS.packages));
  return liveTierPackages(data.map((pkg) => mapPackageCard(pkg)));
}

export async function getPackageBySlug(slug: string) {
  const data = await apiFetch<ApiPackage>(`/packages/${slug}`, cmsFetchOptions(CMS_TAGS.package(slug)));
  return mapPackageCard(data);
}

export async function comparePackages(ids: string[]) {
  const data = await apiFetch<ApiPackage[]>(
    `/packages/compare?ids=${ids.map(encodeURIComponent).join(",")}`,
    cmsFetchOptions(CMS_TAGS.packages),
  );
  return data.map((pkg) => mapPackageCard(pkg));
}

export { mapPackageCard };
