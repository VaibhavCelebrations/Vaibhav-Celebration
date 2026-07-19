import type { Metadata } from "next";
import { Cormorant_Garamond, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Admin | Vaibhav Celebrations",
    template: "%s | VC Admin",
  },
  description: "Vaibhav Celebrations Admin Panel — CMS & CRM",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <head>
        <meta name="robots" content="noindex,nofollow" />
      </head>
      <body className="min-h-full bg-[var(--color-cream)] text-[var(--color-ink)]">{children}</body>
    </html>
  );
}
