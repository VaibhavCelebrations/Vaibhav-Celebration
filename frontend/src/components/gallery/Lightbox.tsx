"use client";

import { MediaViewer } from "@/components/media/MediaViewer";

interface LightboxProps {
  images: { imageUrl: string; altText: string; caption: string; themeSlug?: string | null }[];
  initialIndex: number;
  onClose: () => void;
}

/** Gallery lightbox — the shared MediaViewer, with an "Explore Theme" link on themed photos. */
export function Lightbox({ images, initialIndex, onClose }: LightboxProps) {
  return (
    <MediaViewer
      items={images.map((img) => ({
        url: img.imageUrl,
        altText: img.altText,
        caption: img.caption,
        link: img.themeSlug ? { href: `/themes/${img.themeSlug}`, label: "Explore Theme" } : undefined,
      }))}
      initialIndex={initialIndex}
      onClose={onClose}
    />
  );
}
