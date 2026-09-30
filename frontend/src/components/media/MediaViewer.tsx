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

/** Above the navbar, drawers, modals and floating buttons. Set inline so it can never lose to a stylesheet. */
const VIEWER_Z_INDEX = 1000;

/**
 * Preview popup for a mixed set of images and videos: a centred card on desktop, a bottom sheet
 * on phones. Swipe or arrow keys to move, Esc / backdrop / Close to dismiss, focus kept inside
 * while open and returned to the opener afterwards. The one media popup used across the site.
 */
export function MediaViewer({ items, initialIndex = 0, onClose, title, description, action }: MediaViewerProps) {
  const viewable = items.filter(isViewable);
  const start = Math.min(Math.max(initialIndex, 0), Math.max(viewable.length - 1, 0));
  const [current, setCurrent] = useState(start);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
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
      if (e.key !== "Tab" || !panelRef.current) return;

      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
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
  const label = title ?? item.altText ?? "Preview";
  // Load the slide on screen and its neighbours; the rest wait until the customer gets near them.
  const isNear = (i: number) => {
    const distance = Math.abs(i - current);
    return distance <= 1 || distance === viewable.length - 1;
  };
  const arrowClass =
    "absolute top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-charcoal shadow-md transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha cursor-pointer";

  return createPortal(
    <div
      className="fixed inset-0 flex items-end justify-center bg-charcoal/70 sm:items-center sm:p-6"
      style={{ zIndex: VIEWER_Z_INDEX }}
      onMouseDown={(e) => {
        // Press on the dimmed area outside the card closes the popup.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="flex w-full flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl sm:max-w-3xl sm:rounded-3xl animate-slide-up"
        style={{ maxHeight: "92dvh" }}
      >
        {/* Header — always visible, so Close is always reachable */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border-light px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold text-charcoal sm:text-lg">{title ?? "Preview"}</p>
            {many && (
              <p className="text-xs font-medium text-text-muted" aria-live="polite">
                {current + 1} of {viewable.length}
              </p>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream text-charcoal transition-colors hover:bg-blush focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha cursor-pointer"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Media stage: a fixed 4:3 box (capped on short screens), so it can never collapse */}
          <div className="relative w-full bg-cream-dark" style={{ aspectRatio: "4 / 3", maxHeight: "58dvh" }}>
            <div ref={emblaRef} className="absolute inset-0 overflow-hidden">
              <div className="flex h-full touch-pan-y">
                {viewable.map((slide, i) => (
                  <div
                    key={`${slide.url}-${i}`}
                    className="relative h-full min-w-0"
                    style={{ flex: "0 0 100%" }}
                    // Off-screen slides must not be reachable by keyboard or screen reader.
                    inert={i !== current}
                  >
                    {!isNear(i) ? null : isVideo(slide) ? (
                      <div className="flex h-full items-center justify-center bg-black">
                        <VideoPlayer src={slide.url} label={slide.altText || label} active={i === current} className="h-full w-full object-contain" />
                      </div>
                    ) : (
                      <Image
                        src={slide.url}
                        alt={slide.altText || label}
                        fill
                        sizes="(min-width: 640px) 768px, 100vw"
                        preload={i === start}
                        className="object-contain"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {many && (
              <>
                <button type="button" onClick={goPrev} aria-label="Previous" className={`${arrowClass} left-2 sm:left-3`}>
                  <ChevronLeft size={22} aria-hidden="true" />
                </button>
                <button type="button" onClick={goNext} aria-label="Next" className={`${arrowClass} right-2 sm:right-3`}>
                  <ChevronRight size={22} aria-hidden="true" />
                </button>
              </>
            )}
          </div>

          {/* Details */}
          <div className="px-4 py-4 sm:px-6 sm:py-5">
            {many && (
              <div className="mb-4 flex gap-2 overflow-x-auto hide-scrollbar p-1">
                {viewable.map((thumb, i) => (
                  <button
                    key={`${thumb.url}-thumb-${i}`}
                    type="button"
                    onClick={() => emblaApi?.scrollTo(i)}
                    aria-label={`Show ${isVideo(thumb) ? "video" : "image"} ${i + 1} of ${viewable.length}`}
                    aria-current={i === current}
                    className={`shrink-0 overflow-hidden rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha cursor-pointer ${
                      i === current ? "ring-2 ring-mocha" : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <MediaThumb media={thumb} alt="" sizes="64px" className="h-12 w-16" />
                  </button>
                ))}
              </div>
            )}

            {item.caption && <p className="text-sm font-semibold text-charcoal">{item.caption}</p>}
            {description && <p className="mt-1 text-sm leading-relaxed text-text-muted">{description}</p>}

            {(action || item.link) && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {action}
                {item.link && (
                  <Link
                    href={item.link.href}
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-mocha px-6 text-xs font-bold uppercase tracking-wider text-white hover:bg-mocha-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha focus-visible:ring-offset-2"
                  >
                    {item.link.label} <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
