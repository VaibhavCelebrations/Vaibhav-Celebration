import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default:
      "Vaibhav Celebrations | Thoughtfully Curated Kids Celebrations & Personalized Birthday Experiences",
    template: "%s | Vaibhav Celebrations",
  },
  description:
    "Creating customized kids birthday celebrations, milestone moments, themed experiences, personalized return gifts, and memorable celebrations designed around every child's unique story.",
  keywords: [
    "kids birthday planner Jaipur",
    "theme birthday party",
    "kids birthday celebration",
    "birthday party planner",
    "return gifts",
    "birthday themes",
    "cocomelon birthday theme",
    "space birthday theme",
    "princess birthday theme",
    "jungle safari birthday",
  ],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Vaibhav Celebrations",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      style={
        {
          "--font-display": "var(--font-inter)",
          "--font-body": "var(--font-inter)",
        } as React.CSSProperties
      }
    >
      <body className="min-h-full flex flex-col bg-[var(--color-cream)] text-[var(--color-ink)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
