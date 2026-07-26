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
import { PenTool, HeartHandshake, Award, Shield } from "lucide-react";
import aboutBg from "@/assets/about_bg.png";

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
    icon: PenTool,
  },
  {
    title: "Memorable Experiences",
    desc: "We focus on how the celebration feels, not just how it looks.",
    icon: HeartHandshake,
  },
  {
    title: "Premium Quality",
    desc: "From decor to return gifts, we partner only with the best vendors.",
    icon: Award,
  },
  {
    title: "Stress-Free For Parents",
    desc: "We handle the details so you can be fully present for the memories.",
    icon: Shield,
  },
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      
      <main className="bg-surface pt-0">
        {/* Hero Section with background image */}
        <section
          className="relative min-h-[70vh] flex items-center bg-cover bg-center"
          style={{ backgroundImage: `url(${aboutBg.src})` }}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-cream/95 via-cream/70 to-transparent" />
          
          <div className="relative z-10 max-w-7xl mx-auto px-5 md:px-10 py-32 md:py-40 w-full">
            <ScrollReveal>
              <div className="max-w-2xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-px w-10 md:w-16 bg-gradient-to-r from-transparent to-mocha/60" />
                  <p className="text-sm font-bold text-mocha uppercase tracking-[0.2em]">
                    Who We Are
                  </p>
                </div>
                
                <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-charcoal font-bold leading-tight mb-8 text-left">
                  Turning fleeting moments into lifelong memories
                </h1>
                
                <p className="text-lg md:text-xl text-text-muted leading-relaxed max-w-xl text-left">
                  We are a premium, thoughtfully curated kids celebration brand 
                  dedicated to taking the stress out of party planning and putting the magic back into childhood.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Story Section */}
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
                  <h2 className="font-display text-4xl md:text-5xl text-charcoal font-semibold leading-tight mb-8 text-left">
                    Thoughtfully Designed Celebrations
                  </h2>
                  <div className="space-y-6 text-text-muted leading-relaxed md:text-lg text-left">
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
        <section className="py-20 md:py-28 bg-surface overflow-hidden">
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
            
            {/* Desktop grid */}
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

            {/* Mobile horizontal auto-scroll */}
            <div className="md:hidden relative">
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-surface to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-surface to-transparent z-10 pointer-events-none" />
              <div className="flex animate-marquee min-w-max gap-4 hover:[animation-play-state:paused]">
                <div className="flex gap-4">
                  {values.map((val) => {
                    const Icon = val.icon;
                    return (
                      <div key={val.title} className="w-[260px] shrink-0 bg-cream border border-border-light rounded-[2rem] p-8 text-center">
                        <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-border-light">
                          <Icon className="text-mocha" size={28} />
                        </div>
                        <h3 className="font-display text-xl font-bold text-charcoal mb-4">{val.title}</h3>
                        <p className="text-text-muted text-sm leading-relaxed">{val.desc}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-4">
                  {values.map((val) => {
                    const Icon = val.icon;
                    return (
                      <div key={`${val.title}-dup`} className="w-[260px] shrink-0 bg-cream border border-border-light rounded-[2rem] p-8 text-center">
                        <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-border-light">
                          <Icon className="text-mocha" size={28} />
                        </div>
                        <h3 className="font-display text-xl font-bold text-charcoal mb-4">{val.title}</h3>
                        <p className="text-text-muted text-sm leading-relaxed">{val.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
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
