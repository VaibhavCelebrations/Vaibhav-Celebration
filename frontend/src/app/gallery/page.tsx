import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { MasonryGallery } from "@/components/gallery/MasonryGallery";

export const metadata: Metadata = {
  title: "Gallery | Past Celebrations",
  description: "Browse our gallery of past birthday celebrations, theme setups, and magical moments.",
};

export default function GalleryPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-36 pb-16 md:pb-24">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <ScrollReveal>
            <SectionHeader eyebrow="Gallery" title="Memories We've Created" description="Take a look at some of our favorite setups, intricate details, and the happy moments from past celebrations." />
          </ScrollReveal>

          <div className="mt-12">
            <MasonryGallery />
          </div>
        </div>
      </main>
      <Footer />
      <WhatsAppFAB />
    </>
  );
}
