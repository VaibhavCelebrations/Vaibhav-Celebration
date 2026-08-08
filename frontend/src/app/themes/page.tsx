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
                <Link href={`/themes/${theme.slug}`} className="group block">
                  <div className="relative rounded-[2rem] overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 border border-border-light/40 aspect-[4/5] sm:aspect-[3/4]">
                    
                    {/* Image Layer */}
                    <div className="absolute top-0 left-0 right-0 h-[60%] group-hover:h-full transition-all duration-500 overflow-hidden z-0">
                      <Image
                        src={theme.cardImageUrl}
                        alt={theme.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        priority={i < 3}
                      />
                      {/* Intense Black Gradient that fades in on hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>

                    {/* Content Box Layer */}
                    <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-white group-hover:!bg-transparent transition-colors duration-500 z-10 p-5 md:p-6 flex flex-col justify-between">
                      <div>
                        <h3 className="font-display text-xl md:text-2xl font-bold text-charcoal group-hover:!text-white drop-shadow-sm transition-colors duration-500 leading-snug mb-2 line-clamp-1">
                          {theme.title}
                        </h3>
                        <p className="text-text-muted text-sm md:text-[15px] leading-relaxed group-hover:!text-white/85 transition-colors duration-500 line-clamp-2">
                          {theme.shortDescription}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-mocha group-hover:!text-white uppercase tracking-wider transition-colors duration-500">
                          {theme.themeVibe}
                        </span>
                        <div className="inline-flex items-center gap-2 bg-charcoal text-white group-hover:!bg-white/20 group-hover:!backdrop-blur-md group-hover:!text-white font-bold px-5 py-2.5 rounded-full text-xs uppercase tracking-wider transition-all duration-500">
                          Explore <ArrowRight size={14} />
                        </div>
                      </div>
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
