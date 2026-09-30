"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { MediaThumb } from "@/components/media/MediaThumb";
import { MediaViewer } from "@/components/media/MediaViewer";

interface SimpleGalleryGridProps {
  images: string[];
  altPrefix: string;
}

export function SimpleGalleryGrid({ images, altPrefix }: SimpleGalleryGridProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const items = images.map((url, i) => ({ url, altText: `${altPrefix} - Photo ${i + 1}` }));

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {items.map((item, i) => (
          <button
            key={`${item.url}-${i}`}
            type="button"
            onClick={() => setViewerIndex(i)}
            aria-label={`View ${item.altText}`}
            className="relative block rounded-2xl overflow-hidden cursor-pointer group shadow-soft hover:shadow-card transition-all duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha focus-visible:ring-offset-2"
          >
            <MediaThumb
              media={item}
              alt={item.altText}
              sizes="(max-width: 768px) 50vw, 33vw"
              className="aspect-[4/3]"
              mediaClassName="transition-transform duration-700 group-hover:scale-105"
            />
            <span className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/20 transition-colors duration-300 flex items-center justify-center" aria-hidden="true">
              <span className="w-10 h-10 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
                <Maximize2 size={18} />
              </span>
            </span>
          </button>
        ))}
      </div>

      {viewerIndex !== null && (
        <MediaViewer items={items} initialIndex={viewerIndex} onClose={() => setViewerIndex(null)} title={altPrefix} />
      )}
    </>
  );
}
