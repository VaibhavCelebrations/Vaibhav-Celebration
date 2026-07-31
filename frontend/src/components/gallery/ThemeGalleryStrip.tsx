"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap-register";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface ThemeGalleryStripProps {
  images: string[];
  themeName: string;
}

export function ThemeGalleryStrip({ images, themeName }: ThemeGalleryStripProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const displayImages = images.slice(0, 8);

  useGSAP(() => {
    if (!trackRef.current || !sectionRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const track = trackRef.current;
    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px)", () => {
      // Calculate how far to move left
      // the gap is 20px (gap-5) + padding 40px (px-10)
      const scrollWidth = track.scrollWidth - window.innerWidth + 80;

      gsap.to(track, {
        x: -scrollWidth,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "center center", 
          end: () => `+=${scrollWidth}`,
          scrub: 1,
          pin: true, 
          anticipatePin: 1,
        },
      });
    });

    return () => mm.revert();
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} className="py-16 md:py-24 bg-surface md:h-screen flex flex-col justify-center md:overflow-hidden border-t border-border-light">
      <div className="max-w-7xl w-full mx-auto px-5 md:px-10 shrink-0">
        <ScrollReveal>
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-2 text-mocha font-bold uppercase tracking-widest text-xs mb-3">
                <span className="w-6 h-[1px] bg-mocha" />
                Gallery
              </div>
              <h2 className="font-display text-3xl md:text-5xl text-charcoal font-bold">
                {themeName} Moments
              </h2>
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* Gallery Track container */}
      <div className="mt-8 md:mt-12 w-full relative overflow-x-auto md:overflow-visible hide-scrollbar snap-x snap-mandatory pb-8 md:pb-0">
        <div ref={trackRef} className="flex gap-5 px-5 md:px-10 md:will-change-transform w-max">
          {displayImages.map((src, i) => (
            <div 
              key={i} 
              className="shrink-0 w-[280px] md:w-[400px] group snap-center"
            >
              <div className="relative overflow-hidden rounded-2xl shadow-card aspect-[4/3] bg-cream transition-premium hover:-translate-y-2">
                <Image
                  src={src}
                  alt={`${themeName} celebration ${i + 1}`}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 280px, 400px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}

          {/* CTA card at the end of the track */}
          <div className="shrink-0 w-[280px] md:w-[400px] flex items-center justify-center px-4 snap-center">
            <Link href="/gallery" className="text-center group flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-mocha/10 flex items-center justify-center group-hover:bg-mocha group-hover:scale-110 transition-all duration-300">
                <ArrowRight size={32} className="text-mocha group-hover:text-white transition-colors" />
              </div>
              <p className="mt-6 font-display text-2xl text-charcoal font-semibold group-hover:text-mocha transition-colors">
                View Full Gallery
              </p>
              <p className="mt-2 text-sm text-text-muted">
                Explore all magical moments
              </p>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
