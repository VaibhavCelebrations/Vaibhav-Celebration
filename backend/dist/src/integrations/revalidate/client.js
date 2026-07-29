"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerRevalidate = triggerRevalidate;
const env_1 = require("../../config/env");
const logger_1 = require("../../lib/logger");
/**
 * Notify frontend ISR revalidation after CMS publish (Document 04 §12).
 * Pass `tags` to bust Next.js fetch cache entries tagged via cmsFetchOptions().
 */
async function triggerRevalidate(paths, tags = []) {
    if (!env_1.env.FRONTEND_REVALIDATE_URL || !env_1.env.REVALIDATE_SECRET) {
        logger_1.logger.debug({ paths, tags }, "Revalidate skipped — URL/secret not configured");
        return { skipped: true };
    }
    const uniqueTags = [...new Set(tags.filter(Boolean))];
    try {
        const res = await fetch(env_1.env.FRONTEND_REVALIDATE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-revalidate-secret": env_1.env.REVALIDATE_SECRET,
            },
            body: JSON.stringify({ paths, tags: uniqueTags }),
        });
        if (!res.ok) {
            logger_1.logger.warn({ status: res.status, paths }, "Frontend revalidate returned non-OK");
        }
        return { skipped: false, ok: res.ok };
    }
    catch (err) {
        logger_1.logger.warn({ err, paths }, "Frontend revalidate failed");
        return { skipped: false, ok: false };
    }
}
//# sourceMappingURL=client.js.map