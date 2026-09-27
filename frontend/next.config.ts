import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const cmsCdnHost = process.env.NEXT_PUBLIC_CDN_HOST || "cdn.vaibhavcelebrations.in";

// Backs the client-side "/api/v1/*" same-origin proxy path. Must point at the
// real API origin (no "/api/v1" suffix) in every deployed environment —
// defaulting to localhost silently breaks this rewrite if the env var is
// ever left unset on the host.
const backendOrigin = (process.env.BACKEND_ORIGIN || "http://localhost:4000").replace(/\/+$/, "");

/** Origin of an absolute URL, or null (e.g. for a relative "/api/v1" base). */
function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

// In production only public https origins belong in the policy (an internal http://backend:4000 is unreachable from browsers).
const apiOrigins = [originOf(process.env.NEXT_PUBLIC_API_BASE_URL), backendOrigin].filter(
  (o): o is string => o !== null && (isDev || o.startsWith("https://")),
);

/**
 * Content-Security-Policy.
 *
 * Next.js emits inline bootstrap scripts, so `script-src` keeps 'unsafe-inline' (a nonce-based CSP
 * would force every page to be dynamically rendered and lose static/ISR caching — bad for SEO
 * performance). Everything else is locked down: no plugins, no framing, no foreign form posts,
 * and third parties are limited to the ones the site actually uses (Razorpay, GA4/GTM, Meta Pixel).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://checkout.razorpay.com https://www.googletagmanager.com https://connect.facebook.net`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "media-src 'self' blob: https:",
  `connect-src 'self' ${apiOrigins.join(" ")} https://api.razorpay.com https://lumberjack.razorpay.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://www.facebook.com https://connect.facebook.net${isDev ? " ws: wss:" : ""}`,
  "frame-src https://api.razorpay.com https://checkout.razorpay.com https://www.googletagmanager.com https://www.youtube.com https://www.instagram.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Razorpay Checkout opens a popup/redirect for some banks — same-origin-allow-popups keeps that working.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  {
    key: "Permissions-Policy",
    value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com")',
  },
];

const nextConfig: NextConfig = {
  // Docker builds set BUILD_STANDALONE=true for a minimal self-contained server bundle;
  // Vercel and local builds are unaffected.
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: cmsCdnHost, port: "", pathname: "/**" },
      { protocol: "https", hostname: "picsum.photos", port: "", pathname: "/**" },
      { protocol: "https", hostname: "res.cloudinary.com", port: "", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", port: "", pathname: "/**" },
      { protocol: "http", hostname: "localhost", port: "4000", pathname: "/uploads/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "4000", pathname: "/uploads/**" },
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Fingerprinted build assets never change — let browsers/CDNs cache them for a year.
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendOrigin}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
