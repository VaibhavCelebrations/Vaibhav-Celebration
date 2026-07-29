import { env } from "../../config/env";
import { logger } from "../../lib/logger";

/**
 * Notify frontend ISR revalidation after CMS publish (Document 04 §12).
 * Pass `tags` to bust Next.js fetch cache entries tagged via cmsFetchOptions().
 */
export async function triggerRevalidate(paths: string[], tags: string[] = []) {
  if (!env.FRONTEND_REVALIDATE_URL || !env.REVALIDATE_SECRET) {
    logger.debug({ paths, tags }, "Revalidate skipped — URL/secret not configured");
    return { skipped: true as const };
  }

  const uniqueTags = [...new Set(tags.filter(Boolean))];

  try {
    const res = await fetch(env.FRONTEND_REVALIDATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-secret": env.REVALIDATE_SECRET,
      },
      body: JSON.stringify({ paths, tags: uniqueTags }),
    });
    if (!res.ok) {
      logger.warn({ status: res.status, paths }, "Frontend revalidate returned non-OK");
    }
    return { skipped: false as const, ok: res.ok };
  } catch (err) {
    logger.warn({ err, paths }, "Frontend revalidate failed");
    return { skipped: false as const, ok: false };
  }
}
