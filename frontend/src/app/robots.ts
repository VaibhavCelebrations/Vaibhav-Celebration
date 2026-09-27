import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Public marketing/catalogue pages are crawlable; account, checkout, order and registry-management pages are private. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/account",
          "/checkout",
          "/order/",
          "/verify-email",
          "/verify-phone",
          "/reset-password",
          "/forgot-password",
          "/custom-plan",
          "/build-package",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
