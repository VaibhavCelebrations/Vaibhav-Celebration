"use client";

import { useEffect, useState, useRef } from "react";
import { Gift } from "lucide-react";
import { getApiBaseUrl } from "@/lib/api-client";

export function SafeGiftImage({
  src,
  alt,
  className = "",
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Handle relative URLs for backend uploads
  const displaySrc = src
    ? src.startsWith("/")
      ? `${getApiBaseUrl().replace("/api/v1", "")}${src}`
      : !src.startsWith("http")
      ? `https://${src}`
      : src
    : null;

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [displaySrc]);

  useEffect(() => {
    if (imgRef.current?.complete) {
      setLoaded(true);
    }
  }, [displaySrc]);

  if (!displaySrc || failed) {
    return (
      <div className={`flex h-full w-full flex-col items-center justify-center bg-cream text-text-light ${className}`} role="img" aria-label="Image unavailable">
        <Gift size={28} className="mb-2 opacity-60" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-center px-2">Image unavailable</span>
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full overflow-hidden bg-cream ${className}`}>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-blush/40" aria-hidden />}
      {/* External store CDNs often block hotlinking when a Referer is sent. */}
      <img
        ref={imgRef}
        key={displaySrc}
        src={displaySrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
