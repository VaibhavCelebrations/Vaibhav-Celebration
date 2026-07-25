"use client";

import { useState } from "react";
import Image from "next/image";
import { Expand } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { placeholderGalleryImages } from "@/lib/placeholder-data";
import { Lightbox } from "./Lightbox";

const heightMap: Record<string, string> = {
  portrait: "aspect-[3/4]",
  landscape: "aspect-[4/3]",
  square: "aspect-square",
};

/* Theme-based tags derived from gallery data */
const THEME_TAGS = ["Space", "Cocomelon", "Princess", "Jungle Safari", "General"];

export function MasonryGallery() {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filtered = activeTag
    ? placeholderGalleryImages.filter((img) => img.tags.includes(activeTag))
    : placeholderGalleryImages;

  return (
    <>
      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2 mb-10 justify-center">
        <button
          onClick={() => setActiveTag(null)}
          className={`text-xs font-medium tracking-wide uppercase px-4 py-2 rounded-full transition-premium ${
            !activeTag ? "bg-mocha text-white" : "bg-cream-dark text-text hover:bg-blush"
          }`}
        >
          All
        </button>
        {THEME_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag)}
            className={`text-xs font-medium tracking-wide uppercase px-4 py-2 rounded-full transition-premium ${
              activeTag === tag ? "bg-mocha text-white" : "bg-cream-dark text-text hover:bg-blush"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Masonry Grid */}
      <div className="masonry columns-2 sm:columns-3 lg:columns-4">
        {filtered.map((img, i) => (
          <ScrollReveal key={img.id} delay={i * 40}>
            <figure
              className="masonry-item group relative cursor-pointer overflow-hidden rounded-2xl shadow-soft transition-premium hover:shadow-card"
              onClick={() => setLightboxIndex(i)}
            >
              <div className={`relative w-full ${heightMap[img.aspectRatio]}`}>
                <Image
                  src={img.imageUrl}
                  alt={img.altText}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              </div>
              <figcaption className="absolute inset-0 flex items-end justify-between p-4 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-premium">
                <span className="text-white text-xs font-medium tracking-wide">{img.caption}</span>
                <span className="w-8 h-8 shrink-0 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white translate-y-2 group-hover:translate-y-0 transition-premium">
                  <Expand size={14} />
                </span>
              </figcaption>
            </figure>
          </ScrollReveal>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          images={filtered}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
