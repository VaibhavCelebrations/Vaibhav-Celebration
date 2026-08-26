import type { NextConfig } from "next";

const cmsCdnHost = process.env.NEXT_PUBLIC_CDN_HOST ?? "cdn.vaibhavcelebrations.in";

// Backs the client-side "/api/v1/*" same-origin proxy path. Must point at the
// real API origin (no "/api/v1" suffix) in every deployed environment —
// defaulting to localhost silently breaks this rewrite if the env var is
// ever left unset on Vercel.
const backendOrigin = (process.env.BACKEND_ORIGIN ?? "http://localhost:4000").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: cmsCdnHost, port: "", pathname: "/**" },
      { protocol: "https", hostname: "picsum.photos", port: "", pathname: "/**" },
      { protocol: "https", hostname: "res.cloudinary.com", port: "", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", port: "", pathname: "/**" },
      { protocol: "http", hostname: "localhost", port: "4000", pathname: "/uploads/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "4000", pathname: "/uploads/**" },
    ],
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
