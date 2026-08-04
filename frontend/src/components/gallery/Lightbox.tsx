"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

interface LightboxProps {
  images: { imageUrl: string; altText: string; caption: string; themeSlug?: string | null }[];
  initialIndex: number;
  onClose: () => void;
}

export function Lightbox({ images, initialIndex, onClose }: LightboxProps) {
  const [current, setCurrent] = useState(initialIndex);

  const goNext = useCallback(() => {
    setCurrent((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, goNext, goPrev]);

  const img = images[current];

  return (
    <div className="fixed inset-0 z-[100] bg-charcoal/95 backdrop-blur-sm flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 md:top-6 md:right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-20"
        aria-label="Close"
      >
        <X size={24} />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-4 md:top-6 md:left-6 text-white/60 text-sm font-medium z-20">
        {current + 1} / {images.length}
      </div>

      {/* Prev button */}
      <button
        onClick={goPrev}
        className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-20"
        aria-label="Previous image"
      >
        <ChevronLeft size={28} />
      </button>

      {/* Next button */}
      <button
        onClick={goNext}
        className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-20"
        aria-label="Next image"
      >
        <ChevronRight size={28} />
      </button>

      {/* Image */}
      <div className="relative w-[90vw] h-[80vh] md:w-[85vw] md:h-[85vh]">
        <Image
          src={img.imageUrl}
          alt={img.altText}
          fill
          className="object-contain"
          sizes="90vw"
          priority
        />
      </div>

      {/* Caption & Theme Link */}
      <div className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-20">
        {img.themeSlug && (
          <a
            href={`/themes/${img.themeSlug}`}
            className="h-10 px-6 rounded-full bg-mocha text-white text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-2 hover:bg-mocha-dark shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            Explore Theme <ArrowRight size={14} />
          </a>
        )}
        {img.caption && (
          <div className="text-white/80 text-sm font-medium bg-charcoal/60 backdrop-blur-sm px-6 py-2 rounded-full">
            {img.caption}
          </div>
        )}
      </div>
    </div>
  );
}
