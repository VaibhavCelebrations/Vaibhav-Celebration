"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Expand, X } from "lucide-react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap-register";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { GalleryCard } from "@/lib/cms/types";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type GalleryPreviewProps = {
  images: GalleryCard[];
};

export function GalleryPreview({ images }: GalleryPreviewProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  const demoImages = (images.length ? images.slice(0, 8) : []).map((img) => ({
    id: img.id,
    url: img.imageUrl,
    caption: img.caption || img.altText,
  }));

  useGSAP(() => {
    if (!trackRef.current || !sectionRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const track = trackRef.current;
    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px)", () => {
      const scrollWidth = track.scrollWidth - window.innerWidth + 80;

      gsap.to(track, {
        x: -scrollWidth,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: () => `+=${scrollWidth}`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
        },
      });
    });

    return () => mm.revert();
  }, { scope: sectionRef });

  if (!demoImages.length) return null;

  return (
    <>
      <section id="gallery-preview" ref={sectionRef} className="py-16 md:py-24 bg-surface md:h-screen flex flex-col justify-center md:overflow-hidden">
        <div className="max-w-7xl w-full mx-auto px-5 md:px-10 shrink-0">
          <ScrollReveal>
            <SectionHeader eyebrow="@vaibhavcelebrations" title="Moments We've Curated" description="A closer look at the details — tap any photo to explore." />
          </ScrollReveal>
        </div>

        <div className="mt-10 md:mt-14 w-full relative overflow-x-auto md:overflow-visible hide-scrollbar snap-x snap-mandatory pb-8 md:pb-0">
          <div ref={trackRef} className="flex gap-5 px-5 md:px-10 md:will-change-transform w-max">
            {demoImages.map((img) => (
              <div
                key={img.id}
                className="shrink-0 w-[280px] md:w-[400px] group cursor-pointer snap-center"
                onClick={() => setActiveImage(img.url)}
              >
                <div className="relative overflow-hidden rounded-2xl shadow-card aspect-[4/5] bg-cream transition-premium hover:-translate-y-2">
                  <Image
                    src={img.url}
                    alt={img.caption}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 280px, 400px"
                  />
                  <div className="absolute inset-0 flex items-end justify-between p-6 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-premium">
                    <span className="text-white text-sm font-semibold tracking-wide">{img.caption}</span>
                    <span className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-premium">
                      <Expand size={16} />
                    </span>
                  </div>
                </div>
              </div>
            ))}

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

      {activeImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 md:p-10"
          onClick={() => setActiveImage(null)}
        >
          <div
            className="relative w-full max-w-5xl aspect-square md:aspect-[3/2] rounded-lg overflow-hidden shadow-2xl transition-transform duration-300 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={activeImage}
              alt="Enlarged view"
              fill
              className="object-contain"
              sizes="100vw"
              quality={100}
            />
          </div>
          <button
            className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-[1000] cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setActiveImage(null);
            }}
          >
            <X size={24} />
          </button>
        </div>
      )}
    </>
  );
}
