"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import { MediaThumb } from "./MediaThumb";
import { VideoPlayer } from "./VideoPlayer";
import { isVideo, isViewable, type MediaItem } from "./types";

type MediaViewerProps = {
  items: MediaItem[];
  initialIndex?: number;
  onClose: () => void;
  /** What is being viewed, e.g. a product or service name. Shown in the header and read to screen readers. */
  title?: string;
  /** Longer text shown under the media (e.g. the product description). */
  description?: string | null;
  /** Extra controls under the media, e.g. a "Select" button. */
  action?: ReactNode;
};

const FOCUSABLE = 'a[href], button:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])';

/**
 * Full-screen viewer for a mixed set of images and videos: swipe or arrow keys to move, Esc to
 * close, focus kept inside while open and returned to the opener afterwards. The one lightbox
 * used across the site.
 */
export function MediaViewer({ items, initialIndex = 0, onClose, title, description, action }: MediaViewerProps) {
  const viewable = items.filter(isViewable);
  const start = Math.min(Math.max(initialIndex, 0), Math.max(viewable.length - 1, 0));
  const [current, setCurrent] = useState(start);
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [emblaRef, emblaApi] = useEmblaCarousel({ startIndex: start, loop: viewable.length > 2 });

  // Portals need the document; render only after mount so server and first client render agree.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setCurrent(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const goPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const goNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  // Keyboard, scroll lock, and focus: move in on open, trap while open, hand back on close.
  useEffect(() => {
    if (!mounted) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      // Leave arrow keys to a focused video so they still seek.
      const onVideo = document.activeElement instanceof HTMLVideoElement;
      if (e.key === "ArrowLeft" && !onVideo) goPrev();
      if (e.key === "ArrowRight" && !onVideo) goNext();
      if (e.key !== "Tab" || !dialogRef.current) return;

      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null,
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [mounted, onClose, goPrev, goNext]);

  if (!mounted || viewable.length === 0) return null;

  const item = viewable[current] ?? viewable[0];
  const many = viewable.length > 1;
  const label = title ?? item.altText ?? "Media viewer";
  // Load the slide on screen and its neighbours; the rest wait until the customer gets near them.
  const isNear = (i: number) => {
    const distance = Math.abs(i - current);
    return distance <= 1 || distance === viewable.length - 1;
  };

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-[300] flex flex-col bg-charcoal/95 backdrop-blur-sm h-dvh"
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 md:px-6 md:py-4">
        <div className="min-w-0">
          {title && <p className="truncate font-display text-base font-semibold text-white md:text-lg">{title}</p>}
          {many && (
            <p className="text-xs font-medium text-white/60" aria-live="polite">
              {current + 1} / {viewable.length}
            </p>
          )}
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
        >
          <X size={22} aria-hidden="true" />
        </button>
      </div>

      {/* Slides */}
      <div className="relative min-h-0 flex-1">
        <div ref={emblaRef} className="h-full overflow-hidden">
          <div className="flex h-full touch-pan-y">
            {viewable.map((slide, i) => (
              <div
                key={`${slide.url}-${i}`}
                className="relative h-full min-w-0 flex-[0_0_100%] px-4 md:px-20"
                // Off-screen slides must not be reachable by keyboard or screen reader.
                inert={i !== current}
                onClick={(e) => {
                  // A click on the empty area around the media closes the viewer.
                  if (e.target === e.currentTarget) onClose();
                }}
              >
                {!isNear(i) ? null : isVideo(slide) ? (
                  <div className="flex h-full items-center justify-center">
                    <VideoPlayer
                      src={slide.url}
                      label={slide.altText || label}
                      active={i === current}
                      className="max-h-full max-w-full rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="relative h-full w-full">
                    <Image
                      src={slide.url}
                      alt={slide.altText || label}
                      fill
                      sizes="100vw"
                      preload={i === start}
                      className="object-contain"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {many && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous"
              className="absolute left-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:left-5 sm:flex cursor-pointer"
            >
              <ChevronLeft size={26} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next"
              className="absolute right-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:right-5 sm:flex cursor-pointer"
            >
              <ChevronRight size={26} aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {/* Footer: caption, description, actions, thumbnails */}
      <div className="shrink-0 px-4 pb-4 pt-3 md:px-6 md:pb-6">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
          {item.caption && <p className="text-sm font-medium text-white/85">{item.caption}</p>}
          {description && <p className="max-h-24 overflow-y-auto text-sm leading-relaxed text-white/75">{description}</p>}
          {(action || item.link) && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              {action}
              {item.link && (
                <Link
                  href={item.link.href}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-mocha px-6 text-xs font-bold uppercase tracking-wider text-white hover:bg-mocha-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {item.link.label} <ArrowRight size={14} aria-hidden="true" />
                </Link>
              )}
            </div>
          )}
        </div>

        {many && (
          <div className="mt-3 flex justify-center">
            <div className="flex max-w-full gap-2 overflow-x-auto hide-scrollbar p-1">
              {viewable.map((thumb, i) => (
                <button
                  key={`${thumb.url}-thumb-${i}`}
                  type="button"
                  onClick={() => emblaApi?.scrollTo(i)}
                  aria-label={`Show ${isVideo(thumb) ? "video" : "image"} ${i + 1} of ${viewable.length}`}
                  aria-current={i === current}
                  className={`shrink-0 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer ${
                    i === current ? "ring-2 ring-white opacity-100" : "opacity-50 hover:opacity-90"
                  }`}
                >
                  <MediaThumb media={thumb} alt="" sizes="64px" className="h-12 w-16 rounded-lg" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
