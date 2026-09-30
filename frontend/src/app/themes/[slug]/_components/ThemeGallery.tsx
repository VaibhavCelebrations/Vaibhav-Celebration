"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { MediaThumb } from "@/components/media/MediaThumb";
import { MediaViewer } from "@/components/media/MediaViewer";
import { isVideo, type MediaItem } from "@/components/media/types";

const AUTO_ADVANCE_MS = 4000;

export function ThemeGallery({ media, title }: { media: MediaItem[]; title: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const many = media.length > 1;

  const nextImage = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % media.length);
  }, [media.length]);

  const prevImage = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
  }, [media.length]);

  // Auto-advance, but never while the customer is looking closely (hover, keyboard focus, viewer
  // open) or has asked for reduced motion.
  useEffect(() => {
    if (!many || paused || viewerOpen) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(nextImage, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [many, paused, viewerOpen, nextImage]);

  if (media.length === 0) return null;
  const current = media[currentIndex] ?? media[0];

  return (
    <div
      className="flex flex-col-reverse lg:flex-row gap-4 h-full w-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Thumbnails */}
      {many && (
        <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto lg:w-24 xl:w-28 shrink-0 hide-scrollbar pb-2 lg:pb-0 lg:max-h-[80vh]">
          {media.map((item, idx) => (
            <button
              key={`${item.url}-${idx}`}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Show ${isVideo(item) ? "video" : "photo"} ${idx + 1} of ${media.length}`}
              aria-current={currentIndex === idx}
              className={`w-20 lg:w-full shrink-0 rounded-xl overflow-hidden border-2 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha ${
                currentIndex === idx ? "border-mocha opacity-100 scale-95 shadow-md" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <MediaThumb media={item} alt="" sizes="112px" className="aspect-square" />
            </button>
          ))}
        </div>
      )}

      {/* Main media — opens the full-screen viewer */}
      <div className="relative w-full rounded-[2rem] overflow-hidden group shadow-card lg:max-h-[85vh]">
        <button
          type="button"
          onClick={() => setViewerOpen(true)}
          aria-label={`View ${title} ${isVideo(current) ? "video" : "photo"} full screen`}
          className="block w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-mocha"
        >
          <MediaThumb
            key={current.url}
            media={current}
            alt={`${title} theme preview`}
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="aspect-[4/3] lg:aspect-[3/4] xl:aspect-[4/5]"
            preload={currentIndex === 0}
          />
          <span
            className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-surface/80 text-charcoal shadow-sm backdrop-blur-md opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
            aria-hidden="true"
          >
            <Maximize2 size={18} />
          </span>
        </button>

        {many && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={prevImage}
              aria-label="Previous"
              className="pointer-events-auto w-10 h-10 rounded-full bg-surface/80 backdrop-blur-md flex items-center justify-center text-charcoal hover:bg-white transition-colors shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha"
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={nextImage}
              aria-label="Next"
              className="pointer-events-auto w-10 h-10 rounded-full bg-surface/80 backdrop-blur-md flex items-center justify-center text-charcoal hover:bg-white transition-colors shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha"
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {viewerOpen && (
        <MediaViewer items={media} initialIndex={currentIndex} onClose={() => setViewerOpen(false)} title={title} />
      )}
    </div>
  );
}
