import type { Metadata } from "next";
import { Playfair_Display, Poppins } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const display = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const body = Poppins({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Vaibhav Celebrations | Thoughtfully Curated Kids Celebrations & Personalized Birthday Experiences",
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
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-text font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
