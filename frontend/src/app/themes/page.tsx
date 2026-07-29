import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFABServer } from "@/components/layout/WhatsAppFABServer";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { buildPageMetadata } from "@/lib/cms/metadata";
import { listThemes } from "@/lib/cms/themes";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata("themes", {
    title: "Celebration Themes",
    description: "Browse our curated collection of premium birthday celebration themes.",
  });
}

export default async function ThemesPage() {
  const themes = await listThemes().catch(() => []);

  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-36 pb-16 md:pb-24 bg-surface min-h-screen">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <ScrollReveal>
            <div className="text-center mb-16">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="h-px w-10 md:w-16 bg-gradient-to-r from-transparent to-mocha/60" />
                <p className="text-sm font-bold text-mocha uppercase tracking-[0.2em]">Explore</p>
                <div className="h-px w-10 md:w-16 bg-gradient-to-l from-transparent to-mocha/60" />
              </div>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-charcoal font-semibold mb-6">
                Our Celebration Themes
              </h1>
              <p className="text-text-muted max-w-2xl mx-auto text-lg">
                Each theme is a complete, ready-to-book celebration world — pick the one that lights up your child&apos;s eyes.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {themes.map((theme, i) => (
              <ScrollReveal key={theme.id} delay={i * 80}>
                <Link href={`/themes/${theme.slug}`} className="group block relative rounded-[2rem] overflow-hidden shadow-card aspect-[4/3] hover:shadow-hover transition-all duration-300 hover:-translate-y-2">
                  <Image
                    src={theme.cardImageUrl}
                    alt={theme.title}
                    fill
                    className="object-cover transition-transform duration-1000 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    priority={i < 3}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/95 via-charcoal/30 to-transparent transition-opacity duration-500" />
                  <div className="absolute inset-0 p-6 flex flex-col justify-end text-left">
                    <h3 className="font-display text-2xl lg:text-3xl font-bold !text-white mb-2 group-hover:text-gold-soft transition-colors leading-[1.15]">
                      {theme.title}
                    </h3>
                    <p className="text-white/80 text-sm leading-relaxed line-clamp-2 mb-6">
                      {theme.shortDescription}
                    </p>
                    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md hover:bg-white/30 text-white font-bold px-5 py-2.5 rounded-full transition-all text-xs uppercase tracking-wider w-max">
                      Explore Theme <ArrowRight size={14} />
                    </div>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </main>
      <Footer />
      <WhatsAppFABServer />
    </>
  );
}
