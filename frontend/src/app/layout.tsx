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
    default: "Vaibhav Celebrations | Luxury Theme Birthday Planner in Jaipur",
    template: "%s | Vaibhav Celebrations",
  },
  description:
    "Premium theme-based birthday celebrations, personalized invitations, return gifts, activities, and unforgettable experiences for kids.",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} style={{ "--font-display": "var(--font-inter)", "--font-body": "var(--font-inter)" } as React.CSSProperties}>
      <body className="min-h-full flex flex-col bg-[var(--color-cream)] text-[var(--color-ink)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
