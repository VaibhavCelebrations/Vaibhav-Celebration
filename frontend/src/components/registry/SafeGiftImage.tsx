"use client";

import { useState } from "react";
import { Gift } from "lucide-react";

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

  if (!src || failed) {
    return (
      <div className={`flex h-full w-full flex-col items-center justify-center bg-cream text-text-light ${className}`} role="img" aria-label="Image unavailable">
        <Gift size={28} className="mb-2 opacity-60" />
        <span className="text-[11px] font-semibold uppercase tracking-wider">Image unavailable</span>
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full overflow-hidden bg-cream ${className}`}>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-blush/40" aria-hidden />}
      {/* External store images are untrusted hosts; native img + fallback keeps layout intact. */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
