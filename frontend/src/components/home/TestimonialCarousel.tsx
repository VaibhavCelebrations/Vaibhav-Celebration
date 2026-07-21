"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { placeholderTestimonials } from "@/lib/placeholder-data";

export function TestimonialCarousel() {
  const [current, setCurrent] = useState(0);
  const items = placeholderTestimonials;
  const goTo = useCallback((i: number) => setCurrent((i + items.length) % items.length), [items.length]);

  return (
    <section id="testimonials" className="py-16 md:py-24">
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

        <ScrollReveal delay={100}>
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            {/* Testimonial cards */}
            {items.map((t, i) => (
              <div
                key={t.id}
                className="bg-cream rounded-2xl border border-border p-8 flex flex-col hover:shadow-card transition-shadow"
              >
                {/* Quote mark */}
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
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
