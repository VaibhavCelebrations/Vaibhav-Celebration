import type { MediaAsset } from "@prisma/client";

export type MediaRef = {
  id: string;
  url: string;
  altText: string | null;
  type: string;
  width: number | null;
  height: number | null;
};

export function toMediaRef(asset: MediaAsset | null | undefined): MediaRef | null {
  if (!asset || asset.deletedAt) return null;
  return {
    id: asset.id,
    url: asset.url,
    altText: asset.altText,
    type: asset.type,
    width: asset.width,
    height: asset.height,
  };
}

export const mediaSelect = {
  id: true,
  url: true,
  altText: true,
  type: true,
  width: true,
  height: true,
  deletedAt: true,
} as const;

export async function loadMediaById(id: string | null | undefined): Promise<MediaRef | null> {
  if (!id) return null;
  const { prisma } = await import("../db/prisma");
  const asset = await prisma.mediaAsset.findFirst({
    where: { id, deletedAt: null },
    select: mediaSelect,
  });
  return toMediaRef(asset as MediaAsset | null);
}

/** Batch-load media assets by id — avoids Prisma relation includes. */
export async function loadMediaMap(ids: Array<string | null | undefined>): Promise<Map<string, MediaRef>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (!unique.length) return new Map();
  const { prisma } = await import("../db/prisma");
  const assets = await prisma.mediaAsset.findMany({
    where: { id: { in: unique }, deletedAt: null },
    select: mediaSelect,
  });
  const map = new Map<string, MediaRef>();
  for (const asset of assets) {
    const ref = toMediaRef(asset as MediaAsset);
    if (ref) map.set(asset.id, ref);
  }
  return map;
}

export function attachMediaField<
  T extends { featuredImageId?: string | null; ogImageId?: string | null; bannerMediaId?: string | null; imageId?: string | null },
>(
  row: T,
  map: Map<string, MediaRef>,
  field: "featuredImageId" | "ogImageId" | "bannerMediaId" | "imageId",
  target: "featuredImage" | "ogImage" | "bannerMedia" | "image",
) {
  const id = row[field];
  return { ...row, [target]: id ? map.get(id) ?? null : null };
}

/** Walk JSON and replace `{ mediaId: string }` leaves with resolved MediaRef objects. */
export async function resolveMediaInJson(
  value: unknown,
  loadMedia: (id: string) => Promise<MediaRef | null>,
): Promise<unknown> {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return Promise.all(value.map((item) => resolveMediaInJson(item, loadMedia)));
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.mediaId === "string" && Object.keys(obj).length === 1) {
      const media = await loadMedia(obj.mediaId);
      return media ?? { mediaId: obj.mediaId };
    }
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      out[key] = await resolveMediaInJson(val, loadMedia);
    }
    return out;
  }
  return value;
}
