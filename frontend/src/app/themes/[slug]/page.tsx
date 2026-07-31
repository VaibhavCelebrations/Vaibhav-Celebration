import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles, Package as PackageIcon, Truck, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CTABand } from "@/components/home/CTABand";
import { WhatsAppFABServer } from "@/components/layout/WhatsAppFABServer";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { getThemeBySlug, getThemeDetailRaw, listThemes } from "@/lib/cms/themes";
import { mapPackageCard } from "@/lib/cms/packages";
import { getPublicSettings, getWhatsAppNumber } from "@/lib/cms/settings";
import { ThemeGallery } from "./_components/ThemeGallery";
import { PackageInclusions } from "./_components/PackageInclusions";
import { ThemeGalleryStrip } from "@/components/gallery/ThemeGalleryStrip";
import { ThemeReturnGifts } from "@/components/ecom/ThemeReturnGifts";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const theme = await getThemeBySlug(slug);
    return { title: theme.seoTitle, description: theme.seoDescription };
  } catch {
    return { title: "Theme Not Found" };
  }
}

export default async function ThemeDetailPage({ params }: Props) {
  const { slug } = await params;

  let theme;
  let themePackages;
  try {
    const detail = await getThemeDetailRaw(slug);
    theme = await getThemeBySlug(slug);
    themePackages = detail.packages
      .filter((link) => link.isActive)
      .map((link) => mapPackageCard(link.package, link.priceOverrideInPaise));
  } catch {
    notFound();
  }

  const allThemes = await listThemes().catch(() => []);
  const otherThemes = allThemes.filter((t) => t.slug !== slug).slice(0, 3);
  const [settings, whatsappNumber] = await Promise.all([
    getPublicSettings().catch(() => null),
    getWhatsAppNumber().catch(() => ""),
  ]);

  return (
    <>
      <Navbar />
      <main className="bg-surface min-h-screen selection:bg-mocha/20 selection:text-charcoal pt-24 pb-0 overflow-x-clip">
        <div className="max-w-7xl mx-auto px-5 md:px-10 mb-8">
          <Link href="/themes" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-mocha font-semibold tracking-wide uppercase transition-colors group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Themes
          </Link>
        </div>

        <section className="max-w-7xl w-full mx-auto px-5 md:px-10 mb-20 lg:mb-32">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <div className="w-full min-w-0 relative z-10 lg:sticky lg:top-24 h-auto lg:h-[calc(100vh-8rem)]">
              <ThemeGallery images={theme.galleryImages} />
            </div>

            <div className="w-full min-w-0 flex flex-col space-y-12 pb-10">
              <ScrollReveal>
                <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-charcoal font-bold leading-[1.1] mb-4 break-words">
                  {theme.title}
                </h1>
                <p className="font-sans text-xl text-mocha font-semibold mb-6">{theme.themeVibe}</p>
                <p className="text-text-muted text-lg leading-relaxed mb-8">{theme.shortDescription}</p>
              </ScrollReveal>

              <ScrollReveal>
                <div className="prose prose-lg text-text-muted">
                  <p>{theme.fullDescription}</p>
                </div>
              </ScrollReveal>

              <ScrollReveal>
                <div className="p-6 md:p-8 bg-surface border border-border-light rounded-[2rem] shadow-sm relative overflow-hidden group hover:border-mocha/20 transition-colors">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cream rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform duration-500" />
                  <div className="relative z-10">
                    <h3 className="font-display text-2xl font-bold text-charcoal mb-1">How It Works</h3>
                    <p className="text-text-muted text-sm mb-10">Your celebration kit — curated, packed & delivered</p>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center relative gap-8 sm:gap-0">
                      <div className="hidden sm:block absolute top-6 left-12 right-12 h-[2px] border-t-2 border-dashed border-border-light -z-10" />
                      {[
                        { icon: Sparkles, step: "1", title: "You Order", desc: "Pick theme & package" },
                        { icon: PackageIcon, step: "2", title: "We Curate", desc: "We prepare your kit" },
                        { icon: Truck, step: "3", title: "We Deliver", desc: "Kit arrives at your door" },
                      ].map(({ icon: Icon, step, title, desc }) => (
                        <div key={step} className="flex flex-row sm:flex-col items-center gap-4 sm:gap-4 text-left sm:text-center z-10 w-full sm:w-auto bg-surface sm:bg-transparent">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full border-2 border-border-light bg-surface flex items-center justify-center text-charcoal">
                              <Icon size={20} />
                            </div>
                            <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-mocha text-white text-xs font-bold flex items-center justify-center shadow-sm">{step}</div>
                          </div>
                          <div>
                            <h4 className="font-bold text-charcoal">{title}</h4>
                            <p className="text-xs text-text-muted mt-1 max-w-[120px] mx-auto">{desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-8 p-3 bg-mocha/5 border border-mocha/10 rounded-xl text-center">
                      <p className="text-xs text-mocha font-medium">🏠 Based in Jaipur? Ask about our full decor setup service! <Link href="/contact" className="underline font-bold hover:text-mocha-dark">Contact Us</Link></p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              {themePackages.length > 0 && (
                <ScrollReveal>
                  <div className="mb-6">
                    <h3 className="font-display text-3xl font-bold text-charcoal mb-2">Packages & Inclusions</h3>
                    <p className="text-text-muted">Choose the package that fits your celebration.</p>
                  </div>
                  <PackageInclusions packages={themePackages} themeSlug={theme.slug} />
                </ScrollReveal>
              )}
            </div>
          </div>
        </section>

        <ThemeGalleryStrip images={theme.galleryImages} themeName={theme.title.replace(/ Theme| Birthday/g, "")} />
        <ThemeReturnGifts themeSlug={theme.slug} themeTitle={theme.title} />

        <section className="py-16 md:py-24 bg-cream border-t border-border-light">
          <div className="max-w-7xl mx-auto px-5 md:px-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-4">
              <ScrollReveal>
                <div className="inline-flex items-center gap-2 text-mocha font-bold uppercase tracking-widest text-xs mb-3">
                  <span className="w-6 h-[1px] bg-mocha" />
                  More Magic
                </div>
                <h2 className="font-display text-3xl md:text-4xl text-charcoal font-bold">Similar Themes</h2>
              </ScrollReveal>
              <ScrollReveal delay={100}>
                <Link href="/themes" className="group flex items-center gap-2 text-mocha font-semibold hover:text-mocha-dark transition-colors">
                  Explore All <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </ScrollReveal>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {otherThemes.map((t, idx) => (
                <ScrollReveal key={t.id} delay={idx * 80}>
                  <Link href={`/themes/${t.slug}`} className="group block">
                    <div className="relative rounded-[2rem] overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 border border-border-light/40 aspect-[4/5] sm:aspect-[3/4]">
                      
                      {/* Image Layer */}
                      <div className="absolute top-0 left-0 right-0 h-[60%] group-hover:h-full transition-all duration-500 overflow-hidden z-0">
                        <Image src={t.cardImageUrl} alt={t.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      </div>
                      
                      {/* Content Box Layer */}
                      <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-white group-hover:!bg-transparent transition-colors duration-500 z-10 p-5 flex flex-col justify-between">
                        <div>
                          <h3 className="font-display text-xl md:text-2xl font-bold text-charcoal group-hover:!text-white drop-shadow-sm transition-colors duration-500 leading-snug mb-2 line-clamp-1">{t.title}</h3>
                          <p className="text-text-muted text-sm leading-relaxed group-hover:!text-white/85 transition-colors duration-500 line-clamp-2">{t.shortDescription}</p>
                        </div>
                        <div className="inline-flex items-center gap-2 bg-charcoal text-white group-hover:!bg-white/20 group-hover:!backdrop-blur-md group-hover:!text-white font-bold px-5 py-2.5 rounded-full text-xs uppercase tracking-wider transition-all duration-500 w-max mt-auto">
                          Explore <ArrowRight size={14} />
                        </div>
                      </div>
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <CTABand settings={settings ?? undefined} whatsappNumber={whatsappNumber} />
      </main>
      <Footer />
      <WhatsAppFABServer />
    </>
  );
}
