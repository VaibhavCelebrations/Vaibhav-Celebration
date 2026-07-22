"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface SimpleGalleryGridProps {
  images: string[];
  altPrefix: string;
}

export function SimpleGalleryGrid({ images, altPrefix }: SimpleGalleryGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLightboxIndex((prev) => (prev !== null ? (prev + 1) % images.length : 0));
  };
  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLightboxIndex((prev) => (prev !== null ? (prev - 1 + images.length) % images.length : 0));
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {images.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="relative aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer group shadow-soft hover:shadow-card transition-all duration-300 hover:-translate-y-1"
            onClick={() => openLightbox(i)}
          >
            <Image
              src={src}
              alt={`${altPrefix} - Photo ${i + 1}`}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/20 transition-colors duration-300 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-white/0 group-hover:bg-white/30 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox via Portal */}
      {lightboxIndex !== null && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 md:p-10"
          onClick={closeLightbox}
        >
          <div
            className="relative w-full max-w-5xl aspect-[3/2] rounded-lg overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[lightboxIndex]}
              alt={`${altPrefix} - Enlarged`}
              fill
              className="object-contain"
              sizes="100vw"
              quality={100}
            />
            <button
              onClick={prevImage}
              className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/30 transition-colors z-[101]"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/30 transition-colors z-[101]"
            >
              <ChevronRight size={24} />
            </button>
          </div>
          <button
            className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/30 transition-colors z-[1000] cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              closeLightbox();
            }}
          >
            <X size={24} />
          </button>
          {/* Counter */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium tracking-wider">
            {lightboxIndex + 1} / {images.length}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
