"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { IMAGES } from "@/lib/placeholder-data";

const storyImages = [
  IMAGES.story1,
  IMAGES.story2,
  IMAGES.heroChild,
  IMAGES.jungleTheme2,
];

export function OurStory() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % storyImages.length);
    }, 3000); // 3 seconds
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="our-story" className="py-16 md:py-24 bg-surface">
      <div className="max-w-7xl mx-auto px-5 md:px-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left — Crossfading Images */}
          <ScrollReveal>
            <div className="relative rounded-3xl overflow-hidden shadow-card aspect-[4/5] md:aspect-square lg:aspect-[4/5] bg-cream">
              {storyImages.map((src, idx) => (
                <Image
                  key={src}
                  src={src}
                  alt={`Vaibhav Celebrations story ${idx + 1}`}
                  fill
                  className={`object-cover transition-opacity duration-1000 ease-in-out ${
                    idx === currentImageIndex ? "opacity-100" : "opacity-0"
                  }`}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority={idx === 0}
                />
              ))}
            </div>
          </ScrollReveal>

          {/* Right — Story Text */}
          <div>
            <ScrollReveal>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px w-10 md:w-16 bg-gradient-to-r from-transparent to-mocha/60" />
                <p className="text-sm font-bold text-mocha uppercase tracking-[0.2em]">
                  Our Story
                </p>
                <div className="h-px w-10 md:w-16 bg-gradient-to-l from-transparent to-mocha/60" />
              </div>
              
              <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-charcoal font-semibold leading-tight mb-8">
                Thoughtfully Designed<br className="hidden md:block" /> Celebrations
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

              <Link
                href="/about"
                className="flex w-full md:w-auto justify-center items-center gap-3 bg-charcoal text-white font-bold px-8 py-4 rounded-full mt-10 transition-all duration-300 hover:bg-mocha hover:shadow-lg text-sm uppercase tracking-wider group"
              >
                Know More About Us 
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
