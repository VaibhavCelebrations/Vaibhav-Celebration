import type { Metadata } from "next";
import { Playfair_Display, Poppins } from "next/font/google";
import { Providers } from "./providers";
import { listThemes } from "@/lib/cms/themes";
import { listPackages } from "@/lib/cms/packages";
import { PopupModal } from "@/components/ui/PopupModal";
import { ChatbotWidgetServer } from "@/components/layout/ChatbotWidgetServer";
import { FloatingActionsServer } from "@/components/layout/FloatingActionsServer";
import { Analytics } from "@/components/layout/Analytics";
import { SITE_NAME, SITE_URL } from "@/lib/site";
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

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      areaServed: "IN",
    },
    {
      "@type": "LocalBusiness",
      "@id": `${SITE_URL}/#localbusiness`,
      name: SITE_NAME,
      url: SITE_URL,
      image: `${SITE_URL}/logo.png`,
      description:
        "Customized kids birthday celebrations, themed party experiences and personalized return gifts, based in Jaipur and shipping across India.",
      address: { "@type": "PostalAddress", addressLocality: "Jaipur", addressRegion: "Rajasthan", addressCountry: "IN" },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Every page canonicalises to itself (resolved against metadataBase) — no duplicate-URL dilution.
  alternates: { canonical: "./" },
  title: {
    default: "Vaibhav Celebrations | One Theme. Every Detail. Beautifully Celebrated",
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
  twitter: { card: "summary_large_image" },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [themes, packages] = await Promise.all([
    listThemes().catch(() => []),
    listPackages().catch(() => []),
  ]);

  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-text font-sans">
        <script
          type="application/ld+json"
          // Static data serialised with "<" escaped, so it can never terminate the script tag.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }}
        />
        <Analytics />
        <Providers themes={themes} packages={packages}>
          {children}
          <ChatbotWidgetServer />
          <FloatingActionsServer />
          <PopupModal />
        </Providers>
      </body>
    </html>
  );
}
