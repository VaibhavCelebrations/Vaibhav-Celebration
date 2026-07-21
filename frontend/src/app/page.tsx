import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { HeroSection } from "@/components/home/HeroSection";
import { DeliverableStrip } from "@/components/home/DeliverableStrip";
import { ThemeShowcase } from "@/components/home/ThemeShowcase";
import { PackagePreview } from "@/components/home/PackagePreview";
import { OurStory } from "@/components/home/OurStory";
import { GalleryPreview } from "@/components/home/GalleryPreview";
import { TestimonialCarousel } from "@/components/home/TestimonialCarousel";
import { CTABand } from "@/components/home/CTABand";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <DeliverableStrip />
        <ThemeShowcase />
        <div className="relative z-30 bg-cream">
          <PackagePreview />
          <OurStory />
          <GalleryPreview />
          <TestimonialCarousel />
          <CTABand />
        </div>
      </main>
      <Footer />
      <WhatsAppFAB />
    </>
  );
}
