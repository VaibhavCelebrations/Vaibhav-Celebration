"use client";

import { useState } from "react";
import Image from "next/image";
import { Expand } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { GalleryCard } from "@/lib/cms/types";
import { Lightbox } from "./Lightbox";

const heightMap: Record<string, string> = {
  portrait: "aspect-[3/4]",
  landscape: "aspect-[4/3]",
  square: "aspect-square",
};

type MasonryGalleryProps = {
  images: GalleryCard[];
};

export function MasonryGallery({ images }: MasonryGalleryProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const themeTags = Array.from(new Set(images.flatMap((img) => img.tags))).sort();
  const filtered = activeTag
    ? images.filter((img) => img.tags.includes(activeTag))
    : images;

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-10 justify-center">
        <button
          onClick={() => setActiveTag(null)}
          className={`text-xs font-medium tracking-wide uppercase px-4 py-2 rounded-full transition-premium ${
            !activeTag ? "bg-mocha text-white" : "bg-cream-dark text-text hover:bg-blush"
          }`}
        >
          All
        </button>
        {themeTags.map((tag) => (
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
