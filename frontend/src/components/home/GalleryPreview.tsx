"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Expand, X } from "lucide-react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap-register";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

// High quality demo images for the homepage gallery
const demoImages = [
  { id: 1, url: "https://images.unsplash.com/photo-1530103862676-de8892cb7369?q=80&w=800&auto=format&fit=crop", caption: "Magical Setup" },
  { id: 2, url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=800&auto=format&fit=crop", caption: "Joyful Moments" },
  { id: 3, url: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?q=80&w=800&auto=format&fit=crop", caption: "Themed Cakes" },
  { id: 4, url: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?q=80&w=800&auto=format&fit=crop", caption: "Return Gifts" },
  { id: 5, url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop", caption: "Grand Entrance" },
  { id: 6, url: "https://images.unsplash.com/photo-1602631985686-1bb0e9a8696e?q=80&w=800&auto=format&fit=crop", caption: "Personalized Details" },
  { id: 7, url: "https://images.unsplash.com/photo-1551914948-e866a9dfce2b?q=80&w=800&auto=format&fit=crop", caption: "Sweet Treats" },
  { id: 8, url: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?q=80&w=800&auto=format&fit=crop", caption: "Outdoor Fun" },
];

export function GalleryPreview() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  useGSAP(() => {
    if (!trackRef.current || !sectionRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const track = trackRef.current;
    // Calculate how far to move left
    // the gap is 20px (gap-5) + padding 40px (px-10)
    const scrollWidth = track.scrollWidth - window.innerWidth + 80;

    gsap.to(track, {
      x: -scrollWidth,
      ease: "none",
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top top", // Pin at the top of the viewport
        end: () => `+=${scrollWidth}`,
        scrub: 1,
        pin: true, // This stops vertical scroll and pins the section
        anticipatePin: 1,
      },
    });
  }, { scope: sectionRef });

  return (
    <>
      <section id="gallery-preview" ref={sectionRef} className="py-16 md:py-24 bg-surface h-screen flex flex-col justify-center overflow-hidden">
        <div className="max-w-7xl w-full mx-auto px-5 md:px-10 shrink-0">
          <ScrollReveal>
            <SectionHeader eyebrow="@vaibhavcelebrations" title="Moments We've Curated" description="A closer look at the details — tap any photo to explore." />
          </ScrollReveal>
        </div>

        {/* Gallery Track container */}
        <div className="mt-14 w-full relative">
          <div ref={trackRef} className="flex gap-5 px-5 md:px-10 will-change-transform w-max">
            {demoImages.map((img) => (
              <div 
                key={img.id} 
                className="shrink-0 w-[280px] md:w-[400px] group cursor-pointer"
                onClick={() => setActiveImage(img.url.replace("w=800", "w=1600"))}
              >
                <div className="relative overflow-hidden rounded-2xl shadow-card aspect-[4/5] bg-cream transition-premium hover:-translate-y-2">
                  <Image
                    src={img.url}
                    alt={img.caption}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 280px, 400px"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex items-end justify-between p-6 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-premium">
                    <span className="text-white text-sm font-semibold tracking-wide">{img.caption}</span>
                    <span className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-premium">
                      <Expand size={16} />
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* CTA card at the end of the track */}
            <div className="shrink-0 w-[280px] md:w-[400px] flex items-center justify-center px-4">
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

      {/* Lightbox Modal */}
      {activeImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 md:p-10"
          onClick={() => setActiveImage(null)}
        >
          <div 
            className="relative w-full max-w-5xl aspect-square md:aspect-[3/2] rounded-lg overflow-hidden shadow-2xl transition-transform duration-300 scale-100"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image
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
