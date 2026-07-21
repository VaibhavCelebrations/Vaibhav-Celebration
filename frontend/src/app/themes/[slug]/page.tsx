import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CTABand } from "@/components/home/CTABand";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { ThemeImageSlider } from "@/components/shared/ThemeImageSlider";
import { placeholderThemes } from "@/lib/placeholder-data";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const theme = placeholderThemes.find((t) => t.slug === slug);
  if (!theme) return { title: "Theme Not Found" };
  return { title: theme.seoTitle, description: theme.seoDescription };
}

export default async function ThemeDetailPage({ params }: Props) {
  const { slug } = await params;
  const theme = placeholderThemes.find((t) => t.slug === slug);
  if (!theme) notFound();

  return (
    <>
      <Navbar />
      <main className="pt-24 md:pt-32">
        {/* Hero */}
        <section className="py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-5 md:px-10">
            <Link href="/themes" className="inline-flex items-center gap-1.5 text-sm text-mocha hover:text-mocha-dark font-medium mb-8 lg:mb-12 transition-colors">
              <ArrowLeft size={16} /> All Themes
            </Link>
            
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
              {/* Left Column - Image Slider */}
              <ScrollReveal>
                <ThemeImageSlider 
                  images={[
                    theme.heroImageUrl,
                    "https://images.unsplash.com/photo-1530103862676-de8892cb7369?q=80&w=800&auto=format&fit=crop", 
                    "https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=800&auto=format&fit=crop"
                  ]} 
                  altPrefix={theme.title} 
                />
              </ScrollReveal>

              {/* Right Column - Title & Description */}
              <ScrollReveal delay={100} className="flex flex-col justify-center pt-4 lg:pt-0">
                <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-mocha font-bold mb-8 leading-tight">
                  {theme.title}
                </h1>
                
                <div className="text-text-muted leading-relaxed text-lg space-y-4 mb-10">
                  <p>{theme.shortDescription}</p>
                  <p>{theme.fullDescription}</p>
                </div>
                
                <div className="flex flex-wrap gap-4 mt-auto">
                  <Link href="/consultation" className="btn-primary text-sm px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-all">
                    Book This Theme
                  </Link>
                  <Link href="/packages" className="btn-outline text-sm px-8 py-4 rounded-full transition-all">
                    View Packages
                  </Link>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* Global CTA */}
        <CTABand />
      </main>
      <Footer />
      <WhatsAppFAB />
    </>
  );
}
