"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Expand, ArrowRight } from "lucide-react";
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
  const [columns, setColumns] = useState(4);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateCols = () => {
      if (window.innerWidth < 640) setColumns(2);
      else if (window.innerWidth < 1024) setColumns(3);
      else setColumns(4);
    };
    updateCols();
    window.addEventListener("resize", updateCols);
    return () => window.removeEventListener("resize", updateCols);
  }, []);

  const themeTags = Array.from(new Set(images.flatMap((img) => img.tags))).sort();
  const filtered = activeTag
    ? images.filter((img) => img.tags.includes(activeTag))
    : images;

  // Chunk items for true Pinterest masonry (left-to-right visual order, rendering in vertical columns)
  const cols: GalleryCard[][] = Array.from({ length: columns }, () => []);
  filtered.forEach((img, i) => cols[i % columns].push(img));

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

      {!mounted ? (
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-mocha/30 border-t-mocha rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex gap-4">
          {cols.map((col, colIndex) => (
            <div key={colIndex} className="flex flex-col gap-4 flex-1">
              {col.map((img) => {
                const globalIndex = filtered.findIndex((f) => f.id === img.id);
                return (
                  <ScrollReveal key={img.id} delay={(colIndex * 100) + 50}>
                    <figure className="group relative overflow-hidden rounded-2xl shadow-soft transition-premium hover:shadow-card w-full">
                      <div className={`relative w-full ${['aspect-[3/4]', 'aspect-[4/3]', 'aspect-square', 'aspect-[4/5]', 'aspect-[3/2]'][globalIndex % 5]}`}>
                        <Image
                          src={img.imageUrl}
                          alt={img.altText}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                      </div>
                      <div className="absolute inset-0 flex flex-col justify-end p-4 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-premium pointer-events-none">
                        <div className="flex items-end justify-between pointer-events-auto">
                          <span className="text-white text-xs font-medium tracking-wide translate-y-2 group-hover:translate-y-0 transition-premium delay-75">
                            {img.caption}
                          </span>
                          <div className="flex items-center gap-2">
                            {img.themeSlug && (
                              <Link
                                href={`/themes/${img.themeSlug}`}
                                className="h-8 px-3 shrink-0 rounded-full bg-mocha text-white text-[10px] uppercase font-bold tracking-wider flex items-center justify-center gap-1 hover:bg-mocha-dark transition-premium translate-y-2 group-hover:translate-y-0 shadow-md"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Theme <ArrowRight size={12} />
                              </Link>
                            )}
                            <button
                              className="w-8 h-8 shrink-0 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-premium translate-y-2 group-hover:translate-y-0 delay-75 cursor-pointer"
                              onClick={() => setLightboxIndex(globalIndex)}
                              aria-label="View larger"
                            >
                              <Expand size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </figure>
                  </ScrollReveal>
                );
              })}
            </div>
          ))}
        </div>
      )}

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
