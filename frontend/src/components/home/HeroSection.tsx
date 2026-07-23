"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import heroBg from "@/assets/bg-1.png";

export function HeroSection() {
  return (
    <section 
      className="relative min-h-[90dvh] w-full flex overflow-hidden pt-[110px] pb-[100px] md:pt-[130px]"
      style={{
        backgroundImage: `url(${heroBg.src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Gradient overlay for better text readability, constrained to left side */}
      <div className="absolute inset-y-0 left-0 w-full md:w-2/3 lg:w-1/2 bg-gradient-to-r from-cream/95 via-cream/60 to-transparent z-0" />
      
      {/* Smooth blend to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-surface to-transparent z-10 pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-5 md:px-10 w-full relative z-10">
        <div className="relative z-10 max-w-2xl">
          <p className="inline-flex items-center gap-2 text-sm md:text-base font-medium text-mocha mb-5 italic font-display">
            <Sparkles size={16} className="text-gold-accent" />
            We Create, You Celebrate ♡
          </p>

          <h1 className="font-display text-[2.5rem] sm:text-5xl lg:text-[3.5rem] leading-[1.12] text-charcoal font-semibold">
            Thoughtfully Curated Kids
            <br className="hidden sm:block" />{" "}
            Celebrations &{" "}
            <span className="italic font-normal text-mocha">
              Personalized Birthday Experiences
            </span>
          </h1>

          <p className="mt-6 text-base md:text-lg text-text-muted leading-relaxed max-w-xl">
            Creating customized kids birthday celebrations, milestone moments,
            themed experiences, personalized return gifts, and memorable
            celebrations designed around every child&apos;s unique story.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/themes"
              className="btn-primary text-sm px-7 py-3.5 rounded-full uppercase tracking-wide font-bold"
            >
              Explore Themes
            </Link>
            <Link
              href="/consultation"
              className="btn-outline text-sm px-7 py-3.5 rounded-full uppercase tracking-wide font-bold bg-white"
            >
              Let&apos;s Plan Together
              <ArrowRight size={16} />
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
