import type { MediaAsset } from "@prisma/client";
export type MediaRef = {
    id: string;
    url: string;
    altText: string | null;
    type: string;
    width: number | null;
    height: number | null;
};
export declare function toMediaRef(asset: MediaAsset | null | undefined): MediaRef | null;
export declare const mediaSelect: {
    readonly id: true;
    readonly url: true;
    readonly altText: true;
    readonly type: true;
    readonly width: true;
    readonly height: true;
    readonly deletedAt: true;
};
export declare function loadMediaById(id: string | null | undefined): Promise<MediaRef | null>;
/** Batch-load media assets by id — avoids Prisma relation includes. */
export declare function loadMediaMap(ids: Array<string | null | undefined>): Promise<Map<string, MediaRef>>;
export declare function attachMediaField<T extends {
    featuredImageId?: string | null;
    ogImageId?: string | null;
    bannerMediaId?: string | null;
    imageId?: string | null;
}>(row: T, map: Map<string, MediaRef>, field: "featuredImageId" | "ogImageId" | "bannerMediaId" | "imageId", target: "featuredImage" | "ogImage" | "bannerMedia" | "image"): T & {
    [target]: MediaRef | null;
};
/** Walk JSON and replace `{ mediaId: string }` leaves with resolved MediaRef objects. */
export declare function resolveMediaInJson(value: unknown, loadMedia: (id: string) => Promise<MediaRef | null>): Promise<unknown>;
