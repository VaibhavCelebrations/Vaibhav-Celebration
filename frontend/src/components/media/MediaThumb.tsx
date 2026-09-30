"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff, Play } from "lucide-react";
import { isVideo, type MediaItem } from "./types";

type MediaThumbProps = {
  media: MediaItem | null | undefined;
  /** Used when the media has no alt text of its own. */
  alt: string;
  /** Passed to next/image — describe how wide the thumbnail is at each breakpoint. */
  sizes: string;
  /** Size and shape come from the caller, e.g. "aspect-[4/3] rounded-xl". */
  className?: string;
  /** Extra classes for the image/video itself, e.g. a hover zoom. */
  mediaClassName?: string;
  /** Load eagerly — for the one image that is the page's main content. */
  preload?: boolean;
};

/**
 * A thumbnail for an image or a video: shows a placeholder while loading, a neutral tile if the
 * file is missing or fails, and a play badge on videos. Fills its box, so it never shifts layout.
 */
export function MediaThumb({ media, alt, sizes, className = "", mediaClassName = "", preload = false }: MediaThumbProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const label = media?.altText?.trim() || alt;

  return (
    <span className={`relative block overflow-hidden bg-cream-dark ${className}`}>
      {!media || failed ? (
        <span className="absolute inset-0 flex items-center justify-center text-text-light" role="img" aria-label={label}>
          <ImageOff size={22} strokeWidth={1.5} aria-hidden="true" />
        </span>
      ) : isVideo(media) ? (
        <>
          {/* "#t=0.1" makes browsers paint the first frame as the poster instead of a black box */}
          <video
            src={`${media.url}#t=0.1`}
            muted
            playsInline
            preload="metadata"
            aria-label={label}
            onLoadedData={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`absolute inset-0 h-full w-full object-cover ${mediaClassName}`}
          />
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-charcoal/70 text-white shadow-md">
              <Play size={16} fill="currentColor" className="ml-0.5" />
            </span>
          </span>
        </>
      ) : (
        <Image
          src={media.url}
          alt={label}
          fill
          sizes={sizes}
          preload={preload}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`object-cover ${mediaClassName}`}
        />
      )}
      {media && !failed && !loaded && <span className="absolute inset-0 animate-pulse bg-cream-dark" aria-hidden="true" />}
    </span>
  );
}
