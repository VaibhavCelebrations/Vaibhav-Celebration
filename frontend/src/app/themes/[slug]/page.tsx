import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles, Calendar, Truck, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CTABand } from "@/components/home/CTABand";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { placeholderThemes, placeholderPackages } from "@/lib/placeholder-data";
import { ThemeGallery } from "./_components/ThemeGallery";
import { PackageInclusions } from "./_components/PackageInclusions";

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

  // Get up to 3 other themes for the bottom section
  const otherThemes = placeholderThemes.filter((t) => t.slug !== slug).slice(0, 3);

  return (
    <>
      <Navbar />
      <main className="bg-surface min-h-screen selection:bg-mocha/20 selection:text-charcoal pt-24 pb-0">
        
        {/* ── Breadcrumb ── */}
        <div className="max-w-7xl mx-auto px-5 md:px-10 mb-8">
          <Link href="/themes" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-mocha font-semibold tracking-wide uppercase transition-colors group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Themes
          </Link>
        </div>

        {/* ── Split Layout: Left Gallery & Right Details ── */}
        <section className="max-w-7xl mx-auto px-5 md:px-10 mb-20 lg:mb-32">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            
            {/* LEFT COLUMN: Sticky Image Gallery */}
            <div className="w-full relative z-10 lg:sticky lg:top-24 h-auto lg:h-[calc(100vh-8rem)]">
              <ThemeGallery images={theme.galleryImages} />
            </div>

            {/* RIGHT COLUMN: Scrollable Details */}
            <div className="w-full flex flex-col space-y-12 pb-10">
              
              {/* 1. Header Info */}
              <ScrollReveal>
                <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-charcoal font-bold leading-[1.1] mb-4">
                  {theme.title}
                </h1>
                <p className="font-sans text-xl text-mocha font-semibold mb-6">
                  {theme.themeVibe}
                </p>
                <p className="text-text-muted text-lg leading-relaxed mb-8">
                  {theme.shortDescription}
                </p>
                
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <Link href="/consultation" className="btn-primary w-full sm:w-auto px-10 py-4 shadow-lg shadow-mocha/20 hover:shadow-xl hover:-translate-y-1 transition-all text-base font-semibold justify-center">
                    Book This Theme
                  </Link>
                </div>
              </ScrollReveal>

              {/* 2. Full Description */}
              <ScrollReveal>
                <div className="prose prose-lg text-text-muted">
                  <p>{theme.fullDescription}</p>
                </div>
              </ScrollReveal>

              {/* 3. Process Section */}
              <ScrollReveal>
                <div className="p-6 md:p-8 bg-surface border border-border-light rounded-[2rem] shadow-sm relative overflow-hidden group hover:border-mocha/20 transition-colors">
                  {/* Subtle background accent */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cream rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform duration-500" />
                  
                  <div className="relative z-10">
                    <h3 className="font-display text-2xl font-bold text-charcoal mb-1">We come & set it up for you</h3>
                    <p className="text-text-muted text-sm mb-10">A done-for-you decoration service — not a DIY kit</p>
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center relative gap-8 sm:gap-0">
                      {/* Connecting line for desktop */}
                      <div className="hidden sm:block absolute top-6 left-12 right-12 h-[2px] border-t-2 border-dashed border-border-light -z-10" />
                      
                      {/* Step 1 */}
                      <div className="flex flex-row sm:flex-col items-center gap-4 sm:gap-4 text-left sm:text-center z-10 w-full sm:w-auto bg-surface sm:bg-transparent">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full border-2 border-border-light bg-surface flex items-center justify-center text-charcoal">
                            <Calendar size={20} />
                          </div>
                          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-mocha text-white text-xs font-bold flex items-center justify-center shadow-sm">1</div>
                        </div>
                        <div>
                          <h4 className="font-bold text-charcoal">You Book</h4>
                          <p className="text-xs text-text-muted mt-1 max-w-[120px] mx-auto">Pick date, time & city</p>
                        </div>
                      </div>
                      
                      {/* Step 2 */}
                      <div className="flex flex-row sm:flex-col items-center gap-4 sm:gap-4 text-left sm:text-center z-10 w-full sm:w-auto bg-surface sm:bg-transparent">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full border-2 border-border-light bg-surface flex items-center justify-center text-charcoal">
                            <Truck size={20} />
                          </div>
                          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-mocha text-white text-xs font-bold flex items-center justify-center shadow-sm">2</div>
                        </div>
                        <div>
                          <h4 className="font-bold text-charcoal">We Arrive</h4>
                          <p className="text-xs text-text-muted mt-1 max-w-[120px] mx-auto">Our team reaches your venue</p>
                        </div>
                      </div>
                      
                      {/* Step 3 */}
                      <div className="flex flex-row sm:flex-col items-center gap-4 sm:gap-4 text-left sm:text-center z-10 w-full sm:w-auto bg-surface sm:bg-transparent">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full border-2 border-border-light bg-surface flex items-center justify-center text-charcoal">
                            <Sparkles size={20} />
                          </div>
                          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-mocha text-white text-xs font-bold flex items-center justify-center shadow-sm">3</div>
                        </div>
                        <div>
                          <h4 className="font-bold text-charcoal">We Decorate</h4>
                          <p className="text-xs text-text-muted mt-1 max-w-[120px] mx-auto">Full setup — you celebrate</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              {/* 4. Package Inclusions Toggle */}
              <ScrollReveal>
                <div className="mb-6">
                  <h3 className="font-display text-3xl font-bold text-charcoal mb-2">Packages & Inclusions</h3>
                  <p className="text-text-muted">Choose the package that fits your celebration.</p>
                </div>
                <PackageInclusions packages={placeholderPackages} />
              </ScrollReveal>

            </div>
          </div>
        </section>

        {/* ── Other Themes Section ── */}
        <section className="py-16 md:py-24 bg-cream border-t border-border-light">
          <div className="max-w-7xl mx-auto px-5 md:px-10">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-4">
              <ScrollReveal>
                <div className="inline-flex items-center gap-2 text-mocha font-bold uppercase tracking-widest text-xs mb-3">
                  <span className="w-6 h-[1px] bg-mocha"></span>
                  More Magic
                </div>
                <h2 className="font-display text-3xl md:text-4xl text-charcoal font-bold">
                  Similar Themes
                </h2>
              </ScrollReveal>
              <ScrollReveal delay={100}>
                <Link href="/themes" className="group flex items-center gap-2 text-mocha font-semibold hover:text-mocha-dark transition-colors">
                  Explore All <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </ScrollReveal>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {otherThemes.map((t, idx) => (
                <ScrollReveal key={t.id} delay={idx * 100}>
                  <Link href={`/themes/${t.slug}`} className="block group">
                    <div className="relative w-full aspect-[4/3] rounded-[2rem] overflow-hidden mb-5">
                      <Image
                        src={t.cardImageUrl}
                        alt={t.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    <div>
                      <h3 className="font-display text-xl font-bold text-charcoal mb-1 group-hover:text-mocha transition-colors">{t.title}</h3>
                      <p className="text-text-muted text-sm">{t.themeCategory}</p>
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>

          </div>
        </section>

        {/* ── CTA Band ── */}
        <CTABand />

      </main>
      <Footer />
      <WhatsAppFAB />
    </>
  );
}
