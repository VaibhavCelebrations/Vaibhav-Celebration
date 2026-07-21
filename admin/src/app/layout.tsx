import type { Metadata } from "next";
import { Cormorant_Garamond, Source_Sans_3 } from "next/font/google";
import "./globals.css";

// ─── Fonts via next/font (no layout shift, auto-optimised) ───────────────
const displayFont = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const bodyFont = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Admin — Vaibhav Celebrations",
    template: "%s | VC Admin",
  },
  description: "Internal admin panel for Vaibhav Celebrations — manage events, bookings, CMS & CRM.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable} h-full`}>
      <head>
        <meta name="robots" content="noindex,nofollow" />
      </head>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
