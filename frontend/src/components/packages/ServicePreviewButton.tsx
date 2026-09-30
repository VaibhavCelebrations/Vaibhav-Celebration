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
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-mocha/30 bg-mocha/5 px-2.5 py-1 align-middle text-xs font-semibold text-mocha transition-colors hover:bg-mocha hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha focus-visible:ring-offset-1 ${className}`}
      >
        <Eye size={13} aria-hidden="true" /> Preview
      </button>
      {open && <MediaViewer items={media} title={label} description={description} onClose={() => setOpen(false)} />}
    </>
  );
}
