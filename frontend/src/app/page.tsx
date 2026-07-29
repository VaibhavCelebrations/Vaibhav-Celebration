import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFABServer } from "@/components/layout/WhatsAppFABServer";
import { HeroSection } from "@/components/home/HeroSection";
import { DeliverableStrip } from "@/components/home/DeliverableStrip";
import { ThemeShowcase } from "@/components/home/ThemeShowcase";
import { PackagePreview } from "@/components/home/PackagePreview";
import { OurStory } from "@/components/home/OurStory";
import { GalleryPreview } from "@/components/home/GalleryPreview";
import { TestimonialCarousel } from "@/components/home/TestimonialCarousel";
import { CTABand } from "@/components/home/CTABand";
import { buildPageMetadata } from "@/lib/cms/metadata";
import { getHomePageContent } from "@/lib/cms/pages";
import { listThemes } from "@/lib/cms/themes";
import { listPackages } from "@/lib/cms/packages";
import { listGallery } from "@/lib/cms/gallery";
import { listTestimonials } from "@/lib/cms/content";
import { getPublicSettings, getWhatsAppNumber } from "@/lib/cms/settings";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata("home", {
    title: "Vaibhav Celebrations | Thoughtfully Curated Kids Celebrations",
    description:
      "Creating customized kids birthday celebrations, milestone moments, themed experiences, personalized return gifts, and memorable celebrations designed around every child's unique story.",
  });
}

export default async function HomePage() {
  const [pageContent, themes, packages, gallery, testimonials, settings, whatsappNumber] =
    await Promise.all([
      getHomePageContent().catch(() => null),
      listThemes().catch(() => []),
      listPackages().catch(() => []),
      listGallery().catch(() => []),
      listTestimonials().catch(() => []),
      getPublicSettings().catch(() => null),
      getWhatsAppNumber().catch(() => ""),
    ]);

  const sections = pageContent?.sections;

  return (
    <>
      <Navbar />
      <main>
        <HeroSection content={sections?.hero} />
        <DeliverableStrip content={sections?.deliverables} />
        <ThemeShowcase themes={themes} />
        <div className="relative z-30 bg-cream">
          <PackagePreview packages={packages} />
          <OurStory content={sections?.ourStory} />
          <GalleryPreview images={gallery} />
          <TestimonialCarousel testimonials={testimonials} />
          <CTABand content={sections?.ctaBand} settings={settings ?? undefined} whatsappNumber={whatsappNumber} />
        </div>
      </main>
      <Footer />
      <WhatsAppFABServer />
    </>
  );
}
