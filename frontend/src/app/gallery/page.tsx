import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFABServer } from "@/components/layout/WhatsAppFABServer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { MasonryGallery } from "@/components/gallery/MasonryGallery";
import { buildPageMetadata } from "@/lib/cms/metadata";
import { listGallery } from "@/lib/cms/gallery";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata("gallery", {
    title: "Gallery | Past Celebrations",
    description: "Browse our gallery of past birthday celebrations, theme setups, and magical moments.",
  });
}

export default async function GalleryPage() {
  const images = await listGallery().catch(() => []);

  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-36 pb-16 md:pb-24">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <ScrollReveal>
            <SectionHeader eyebrow="Gallery" title="Memories We've Created" description="Take a look at some of our favorite setups, intricate details, and the happy moments from past celebrations." />
          </ScrollReveal>
          <div className="mt-12">
            <MasonryGallery images={images} />
          </div>
        </div>
      </main>
      <Footer />
      <WhatsAppFABServer />
    </>
  );
}
