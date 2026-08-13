/** Immutable long-cache for hashed/unique CDN keys (Document 02 §6.4). */
export declare const CDN_CACHE_CONTROL = "public, max-age=31536000, immutable";
export type MediaPrefixKind = "themes" | "events" | "gallery" | "blog" | "popups" | "invoices" | "users" | "media" | "products";
/** All valid category keys — used for sidebar counts and validation */
export declare const MEDIA_CATEGORIES: MediaPrefixKind[];
/** Human-readable labels for each category */
export declare const MEDIA_CATEGORY_LABELS: Record<MediaPrefixKind, string>;
export type StoredObject = {
    url: string;
    cdnKey: string;
    sizeBytes: number;
    storage: "r2" | "local";
};
export declare function publicUrlForKey(cdnKey: string): string;
/**
 * Builds R2 object keys with logical folder prefixes.
 * Examples:
 *   themes/royal-mandap/cover-a1b2c3.jpg
 *   events/clxyz123/highlight-reel.mp4
 *   users/cladmin1/avatar-d4e5f6.png
 */
export declare function buildCdnKey(input: {
    kind: MediaPrefixKind;
    /** theme slug, event id, user id, blog slug, etc. */
    scope?: string;
    /** cover | gallery | sample | avatar | highlight | misc */
    role?: string;
    originalName?: string;
    mimeType: string;
}): string;
export declare function isR2Enabled(): boolean;
export declare function storeMediaBuffer(input: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    kind?: MediaPrefixKind;
    scope?: string;
    role?: string;
    /** When set, uses this exact object key instead of a random suffix. */
    fixedCdnKey?: string;
    /** @deprecated prefer kind/scope/role */
    folder?: string;
}): Promise<StoredObject>;
/**
 * Presigned PUT URL so the browser uploads directly to R2.
 * Frontend then calls /admin/media/complete to register the MediaAsset.
 * Display always uses the public CDN URL — never proxied through the API.
 */
export declare function createPresignedUpload(input: {
    kind: MediaPrefixKind;
    scope?: string;
    role?: string;
    originalName: string;
    mimeType: string;
    expiresInSeconds?: number;
}): Promise<{
    uploadUrl: string;
    cdnKey: string;
    publicUrl: string;
    headers: Record<string, string>;
    expiresInSeconds: number;
    storage: "r2" | "local";
}>;
export declare function deleteObjectByKey(cdnKey: string): Promise<void>;
/** Delete all objects under a prefix (e.g. themes/royal-mandap/). */
export declare function deleteByPrefix(prefix: string): Promise<{
    deleted: number;
}>;
export declare function getUploadDir(): string;
export declare function getMediaHealth(): {
    r2Configured: boolean;
    bucket: string | null;
    publicBaseUrl: string;
    cacheControl: string;
};
