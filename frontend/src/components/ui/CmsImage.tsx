"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

type CmsImageProps = Omit<ImageProps, "src"> & {
  src: string;
  fallbackSrc?: string;
};

const DEFAULT_FALLBACK = "/theme/gallery_setup.png";

/** next/image wrapper with graceful fallback when CMS CDN URLs fail in dev. */
export function CmsImage({
  src,
  fallbackSrc = DEFAULT_FALLBACK,
  alt,
  ...props
}: CmsImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc);

  return (
    <Image
      {...props}
      alt={alt}
      src={currentSrc || fallbackSrc}
      onError={() => {
        if (currentSrc !== fallbackSrc) setCurrentSrc(fallbackSrc);
      }}
    />
  );
}
