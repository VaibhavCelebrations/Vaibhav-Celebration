import type { Metadata } from "next";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFABServer } from "@/components/layout/WhatsAppFABServer";
import { CTABand } from "@/components/home/CTABand";
import { WhyUsSection } from "@/components/home/WhyUsSection";
import { TestimonialCarousel } from "@/components/home/TestimonialCarousel";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { PenTool, HeartHandshake, Award, Shield } from "lucide-react";
import aboutBg from "@/assets/about_bg.png";
import { buildPageMetadata } from "@/lib/cms/metadata";
import { getAboutPageContent } from "@/lib/cms/pages";
import { listTestimonials } from "@/lib/cms/content";
import { getPublicSettings, getWhatsAppNumber } from "@/lib/cms/settings";
import { asText, asTextList } from "@/lib/cms/text";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata("about", {
    title: "About Us | Vaibhav Celebrations",
    description: "Learn more about our story and mission to create unforgettable magical celebrations for your little ones.",
  });
}

const defaultValues = [
  { title: "Thoughtful Design", desc: "Every element is curated to create a cohesive and immersive experience.", icon: PenTool },
  { title: "Memorable Experiences", desc: "We focus on how the celebration feels, not just how it looks.", icon: HeartHandshake },
  { title: "Premium Quality", desc: "From decor to return gifts, we partner only with the best vendors.", icon: Award },
  { title: "Stress-Free For Parents", desc: "We handle the details so you can be fully present for the memories.", icon: Shield },
];

const defaultStoryImages = [
  "/theme/gallery_setup.png",
  "/theme/gallery_balloons.png",
  "/theme/gallery_cake.png",
  "/theme/jungle_safari_theme.png",
];

export default async function AboutPage() {
  const [pageContent, testimonials, settings, whatsappNumber] = await Promise.all([
    getAboutPageContent().catch(() => null),
    listTestimonials().catch(() => []),
    getPublicSettings().catch(() => null),
    getWhatsAppNumber().catch(() => ""),
  ]);

  const sections = pageContent?.sections;
  const storyParagraphs = asTextList(sections?.story?.paragraphs, [
    "Vaibhav Celebrations is a thoughtfully curated kids celebration brand specializing in customized kids birthday parties, theme-based celebrations, personalized return gifts, activity experiences, and memorable milestone celebrations.",
    "We create meaningful and stress-free celebration experiences for parents by offering carefully designed birthday concepts, customized party elements, themed products, activity kits, keepsakes, digital invitations, and personalized celebration solutions.",
    "At Vaibhav Celebrations, we believe that celebrations should not only look beautiful but should also feel meaningful, thoughtful, and unforgettable.",
  ]);
  const values = sections?.values?.items?.length
    ? sections.values.items.map((item, i) => ({
        title: asText(item.title, defaultValues[i]?.title ?? "Value"),
        desc: asText(item.description, defaultValues[i]?.desc ?? ""),
        icon: defaultValues[i]?.icon ?? PenTool,
      }))
    : defaultValues;
  const storyImages = defaultStoryImages;

  return (
    <>
      <Navbar />
      <main className="bg-surface pt-0">
        <section className="relative min-h-[70vh] flex items-center bg-cover bg-center" style={{ backgroundImage: `url(${aboutBg.src})` }}>
          <div className="absolute inset-0 bg-gradient-to-r from-cream/95 via-cream/70 to-transparent" />
          <div className="relative z-10 max-w-7xl mx-auto px-5 md:px-10 py-32 md:py-40 w-full">
            <ScrollReveal>
              <div className="max-w-2xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-px w-10 md:w-16 bg-gradient-to-r from-transparent to-mocha/60" />
                  <p className="text-sm font-bold text-mocha uppercase tracking-[0.2em]">Who We Are</p>
                </div>
                <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-charcoal font-bold leading-tight mb-8 text-left">
                  {asText(sections?.hero?.title, "Turning fleeting moments into lifelong memories")}
                </h1>
                <p className="text-lg md:text-xl text-text-muted leading-relaxed max-w-xl text-left">
                  {asText(sections?.hero?.subtitle, "We are a premium, thoughtfully curated kids celebration brand dedicated to taking the stress out of party planning and putting the magic back into childhood.")}
                </p>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <section className="py-16 bg-cream border-y border-border">
          <div className="max-w-7xl mx-auto px-5 md:px-10">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <ScrollReveal>
                <div className="grid grid-cols-2 gap-4">
                  {storyImages.slice(0, 4).map((src, idx) => (
                    <div key={src} className={`relative rounded-3xl overflow-hidden shadow-card aspect-[4/5] ${idx === 1 || idx === 3 ? "mt-8" : ""}`}>
                      <Image src={src} alt={`Vaibhav Celebrations story ${idx + 1}`} fill className="object-cover" sizes="(max-width: 1024px) 50vw, 25vw" />
                    </div>
                  ))}
                </div>
              </ScrollReveal>
              <div>
                <ScrollReveal>
                  <h2 className="font-display text-4xl md:text-5xl text-charcoal font-semibold leading-tight mb-8 text-left">
                    {asText(sections?.story?.title, "Thoughtfully Designed Celebrations")}
                  </h2>
                  <div className="space-y-6 text-text-muted leading-relaxed md:text-lg text-left">
                    {storyParagraphs.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28 bg-surface overflow-hidden">
          <div className="max-w-7xl mx-auto px-5 md:px-10">
            <ScrollReveal>
              <div className="text-center mb-16">
                <h2 className="font-display text-4xl md:text-5xl text-charcoal font-bold mb-6">{asText(sections?.values?.title, "Our Core Values")}</h2>
                <p className="text-text-muted max-w-2xl mx-auto text-lg">These principles guide everything we do, ensuring every event we touch is truly exceptional.</p>
              </div>
            </ScrollReveal>
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((val, idx) => {
                const Icon = val.icon;
                return (
                  <ScrollReveal key={val.title} delay={idx * 100}>
                    <div className="bg-cream border border-border-light rounded-[2rem] p-8 text-center h-full hover:shadow-card hover:-translate-y-2 transition-all duration-300">
                      <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-border-light">
                        <Icon className="text-mocha" size={28} />
                      </div>
                      <h3 className="font-display text-xl font-bold text-charcoal mb-4">{val.title}</h3>
                      <p className="text-text-muted text-sm leading-relaxed">{val.desc}</p>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </section>

        <WhyUsSection />
        <TestimonialCarousel testimonials={testimonials} />
        <CTABand settings={settings ?? undefined} whatsappNumber={whatsappNumber} />
      </main>
      <Footer />
      <WhatsAppFABServer />
    </>
  );
}
