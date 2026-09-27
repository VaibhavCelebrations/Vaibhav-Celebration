/** Canonical public origin (no trailing slash). Used for sitemap, robots, canonical URLs and structured data. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

export const SITE_NAME = "Vaibhav Celebrations";
