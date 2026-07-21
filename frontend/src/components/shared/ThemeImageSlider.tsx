"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export function ThemeImageSlider({ images, altPrefix }: { images: string[], altPrefix: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Auto advance
  useEffect(() => {
    if (isHovered || isLightboxOpen) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [isHovered, isLightboxOpen, images.length]);

  const next = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };
  
  const prev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <>
      <div 
        className="relative w-full aspect-square md:aspect-[4/5] lg:aspect-square overflow-hidden rounded-2xl cursor-pointer group shadow-xl"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setIsLightboxOpen(true)}
      >
        {images.map((img, i) => (
          <Image
            key={img + i}
            src={img}
            alt={`${altPrefix} - Image ${i + 1}`}
            fill
            className={`object-cover transition-opacity duration-1000 ease-in-out ${i === currentIndex ? "opacity-100" : "opacity-0"}`}
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority={i === 0}
          />
        ))}

        {/* Navigation Arrows */}
        <button 
          onClick={prev}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/30 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 hover:bg-white/50 transition-all z-10"
        >
          <ChevronLeft size={20} />
        </button>
        <button 
          onClick={next}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/30 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 hover:bg-white/50 transition-all z-10"
        >
          <ChevronRight size={20} />
        </button>
        
        {/* Indicators */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
          {images.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentIndex ? "w-6 bg-white" : "w-2 bg-white/50"}`} />
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {isLightboxOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 md:p-10 animate-in fade-in duration-300"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div 
            className="relative w-full max-w-5xl aspect-square md:aspect-[3/2] rounded-lg overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[currentIndex]}
              alt={`${altPrefix} - Enlarged`}
              fill
              className="object-contain"
              sizes="100vw"
              quality={100}
            />
            {/* Lightbox Navigation */}
            <button 
              onClick={prev}
              className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/30 transition-colors z-[101]"
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              onClick={next}
              className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/30 transition-colors z-[101]"
            >
              <ChevronRight size={24} />
            </button>
          </div>
          <button 
            className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/30 transition-colors z-[1000] cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setIsLightboxOpen(false);
            }}
          >
            <X size={24} />
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
