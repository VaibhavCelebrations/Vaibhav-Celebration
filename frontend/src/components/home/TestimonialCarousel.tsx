"use client";

import { Star } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { placeholderTestimonials } from "@/lib/placeholder-data";

export function TestimonialCarousel() {
  const items = placeholderTestimonials;

  // Duplicate items for seamless infinite scroll
  const renderCard = (t: (typeof items)[0], key: string) => (
    <div
      key={key}
      className="w-[320px] md:w-[380px] shrink-0 bg-cream rounded-2xl border border-border p-8 flex flex-col hover:shadow-card transition-shadow"
    >
      <span className="text-mocha/30 text-6xl font-display leading-none mb-4">&ldquo;</span>
      <p className="text-sm md:text-base text-text leading-relaxed flex-1">
        {t.content}
      </p>
      <div className="flex gap-1 mt-6 mb-4">
        {Array.from({ length: t.rating }).map((_, si) => (
          <Star key={si} size={16} fill="#c9a96e" className="text-gold-accent" />
        ))}
      </div>
      <p className="font-semibold text-charcoal">{t.customerName}</p>
      <p className="text-sm text-text-light">{t.role}</p>
    </div>
  );

  return (
    <section id="testimonials" className="py-16 md:py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 md:px-10">
        <ScrollReveal>
          <div className="mb-12 text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="h-px w-10 md:w-16 bg-gradient-to-r from-transparent to-mocha/60" />
              <p className="text-sm font-bold text-mocha uppercase tracking-[0.2em]">
                What Parents Say
              </p>
              <div className="h-px w-10 md:w-16 bg-gradient-to-l from-transparent to-mocha/60" />
            </div>
            <h2 className="font-display text-4xl md:text-5xl text-charcoal font-semibold">
              Trusted by families across Jaipur
            </h2>
          </div>
        </ScrollReveal>
      </div>

      {/* Auto-scrolling marquee */}
      <div className="relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-surface to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-surface to-transparent z-10 pointer-events-none" />

        <div className="flex animate-marquee min-w-max gap-6 hover:[animation-play-state:paused]">
          <div className="flex gap-6">
            {items.map((t) => renderCard(t, t.id))}
          </div>
          <div className="flex gap-6">
            {items.map((t) => renderCard(t, `${t.id}-dup`))}
          </div>
        </div>
      </div>
    </section>
  );
}
