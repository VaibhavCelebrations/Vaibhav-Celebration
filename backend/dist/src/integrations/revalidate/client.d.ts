/**
 * Notify frontend ISR revalidation after CMS publish (Document 04 §12).
 * Pass `tags` to bust Next.js fetch cache entries tagged via cmsFetchOptions().
 */
export declare function triggerRevalidate(paths: string[], tags?: string[]): Promise<{
    skipped: true;
    ok?: undefined;
} | {
    skipped: false;
    ok: boolean;
}>;
