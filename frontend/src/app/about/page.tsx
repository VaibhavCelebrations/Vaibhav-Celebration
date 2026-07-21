import type { Metadata } from "next";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { CTABand } from "@/components/home/CTABand";
import { WhyUsSection } from "@/components/home/WhyUsSection";
import { TestimonialCarousel } from "@/components/home/TestimonialCarousel";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { IMAGES } from "@/lib/placeholder-data";
import { Sparkles, Heart, Star, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us | Vaibhav Celebrations",
  description: "Learn more about our story and mission to create unforgettable magical celebrations for your little ones.",
};

const storyImages = [
  IMAGES.story1,
  IMAGES.story2,
  IMAGES.heroChild,
  IMAGES.jungleTheme2,
];

const values = [
  {
    title: "Thoughtful Design",
    desc: "Every element is curated to create a cohesive and immersive experience.",
    icon: Sparkles,
  },
  {
    title: "Memorable Experiences",
    desc: "We focus on how the celebration feels, not just how it looks.",
    icon: Heart,
  },
  {
    title: "Premium Quality",
    desc: "From decor to return gifts, we partner only with the best vendors.",
    icon: Star,
  },
  {
    title: "Stress-Free For Parents",
    desc: "We handle the details so you can be fully present for the memories.",
    icon: ShieldCheck,
  },
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      
      <main className="bg-surface pt-24 md:pt-32">
        {/* Hero Section */}
        <section className="relative px-5 md:px-10 py-16 md:py-24 text-center max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-px w-10 md:w-16 bg-gradient-to-r from-transparent to-mocha/60" />
              <p className="text-sm font-bold text-mocha uppercase tracking-[0.2em]">
                Who We Are
              </p>
              <div className="h-px w-10 md:w-16 bg-gradient-to-l from-transparent to-mocha/60" />
            </div>
            
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-charcoal font-bold leading-tight mb-8">
              Turning fleeting moments into lifelong memories
            </h1>
            
            <p className="text-lg md:text-xl text-text-muted leading-relaxed max-w-2xl mx-auto">
              We are a premium, thoughtfully curated kids celebration brand 
              dedicated to taking the stress out of party planning and putting the magic back into childhood.
            </p>
          </ScrollReveal>
        </section>

        {/* Story Section (Adapted from OurStory) */}
        <section className="py-16 bg-cream border-y border-border">
          <div className="max-w-7xl mx-auto px-5 md:px-10">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              {/* Left — Images */}
              <ScrollReveal>
                <div className="grid grid-cols-2 gap-4">
                  {storyImages.slice(0, 4).map((src, idx) => (
                    <div 
                      key={src} 
                      className={`relative rounded-3xl overflow-hidden shadow-card aspect-[4/5] ${idx === 1 || idx === 3 ? 'mt-8' : ''}`}
                    >
                      <Image
                        src={src}
                        alt={`Vaibhav Celebrations story ${idx + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 50vw, 25vw"
                      />
                    </div>
                  ))}
                </div>
              </ScrollReveal>

              {/* Right — Story Text */}
              <div>
                <ScrollReveal>
                  <h2 className="font-display text-4xl md:text-5xl text-charcoal font-semibold leading-tight mb-8">
                    Thoughtfully Designed Celebrations
                  </h2>
                  <div className="space-y-6 text-text-muted leading-relaxed md:text-lg">
                    <p>
                      Vaibhav Celebrations is a thoughtfully curated kids celebration brand
                      specializing in customized kids birthday parties, theme-based celebrations,
                      personalized return gifts, activity experiences, and memorable milestone
                      celebrations.
                    </p>
                    <p>
                      We create meaningful and stress-free celebration experiences for parents by
                      offering carefully designed birthday concepts, customized party elements,
                      themed products, activity kits, keepsakes, digital invitations, and
                      personalized celebration solutions.
                    </p>
                    <p>
                      At Vaibhav Celebrations, we believe that celebrations should not only look
                      beautiful but should also feel meaningful, thoughtful, and unforgettable.
                    </p>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </div>
        </section>

        {/* Core Values */}
        <section className="py-20 md:py-28 bg-surface">
          <div className="max-w-7xl mx-auto px-5 md:px-10">
            <ScrollReveal>
              <div className="text-center mb-16">
                <h2 className="font-display text-4xl md:text-5xl text-charcoal font-bold mb-6">
                  Our Core Values
                </h2>
                <p className="text-text-muted max-w-2xl mx-auto text-lg">
                  These principles guide everything we do, ensuring every event we touch is truly exceptional.
                </p>
              </div>
            </ScrollReveal>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
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

        {/* Existing Components */}
        <WhyUsSection />
        <TestimonialCarousel />
        <CTABand />
      </main>
      
      <Footer />
      <WhatsAppFAB />
    </>
  );
}
