"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function ThemeGallery({ images }: { images: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextImage = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prevImage = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // Auto-play
  useEffect(() => {
    const timer = setInterval(nextImage, 3000);
    return () => clearInterval(timer);
  }, [nextImage]);

  return (
    <div className="flex flex-col-reverse lg:flex-row gap-4 h-full sticky top-24">
      {/* Thumbnails */}
      <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto lg:w-24 xl:w-28 shrink-0 no-scrollbar pb-2 lg:pb-0 max-h-[80vh]">
        {images.map((src, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`relative w-20 h-20 lg:w-full lg:aspect-square shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
              currentIndex === idx ? "border-mocha opacity-100 scale-95 shadow-md" : "border-transparent opacity-60 hover:opacity-100"
            }`}
          >
            <Image
              src={src}
              alt={`Thumbnail ${idx + 1}`}
              fill
              className="object-cover"
              sizes="112px"
            />
          </button>
        ))}
      </div>

      {/* Main Image */}
      <div className="relative w-full aspect-[4/3] lg:aspect-[3/4] xl:aspect-[4/5] rounded-[2rem] overflow-hidden group shadow-card max-h-[85vh]">
        <Image
          key={images[currentIndex]} // Key to trigger re-render on change
          src={images[currentIndex]}
          alt="Theme preview"
          fill
          className="object-cover transition-all duration-500 animate-in fade-in zoom-in-95"
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
        
        {/* Navigation Buttons (visible on hover) */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={prevImage} className="w-10 h-10 rounded-full bg-surface/80 backdrop-blur-md flex items-center justify-center text-charcoal hover:bg-white transition-colors shadow-sm">
            <ChevronLeft size={20} />
          </button>
          <button onClick={nextImage} className="w-10 h-10 rounded-full bg-surface/80 backdrop-blur-md flex items-center justify-center text-charcoal hover:bg-white transition-colors shadow-sm">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
