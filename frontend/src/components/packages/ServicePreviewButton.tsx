"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { MediaViewer } from "@/components/media/MediaViewer";
import type { MediaItem } from "@/components/media/types";

/** "Preview" link beside a package inclusion; opens that service's images/videos. Renders nothing without media. */
export function ServicePreviewButton({
  label,
  media,
  description,
  className = "",
}: {
  label: string;
  media: MediaItem[];
  description?: string | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  if (media.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Preview ${label}`}
        className={`inline-flex items-center gap-1 text-xs font-semibold text-mocha underline underline-offset-2 hover:text-mocha-dark cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha rounded ${className}`}
      >
        <Eye size={13} aria-hidden="true" /> Preview
      </button>
      {open && <MediaViewer items={media} title={label} description={description} onClose={() => setOpen(false)} />}
    </>
  );
}
