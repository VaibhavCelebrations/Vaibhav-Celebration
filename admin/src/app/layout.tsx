import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// ─── Fonts via next/font (no layout shift, auto-optimised) ───────────────
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Admin — Vaibhav Celebrations",
    template: "%s | VC Admin",
  },
  description: "Internal admin panel for Vaibhav Celebrations — manage events, orders, CMS & CRM.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} style={{ "--font-display": "var(--font-inter)", "--font-body": "var(--font-inter)" } as React.CSSProperties}>
      <head>
        <meta name="robots" content="noindex,nofollow" />
      </head>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
