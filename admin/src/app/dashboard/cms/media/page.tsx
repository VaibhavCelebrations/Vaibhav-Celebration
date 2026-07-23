"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { MediaPicker } from "@/components/ui/MediaPicker";
import type { MediaRef } from "@/types/common";

export default function MediaPage() {
  const [selected, setSelected] = useState<MediaRef | null>(null);
  return <div className="w-full"><PageHeader eyebrow="Content" title="Media Library" description="Upload and select assets stored securely in the media library." /><div className="card max-w-xl p-5"><MediaPicker kind="media" value={selected} onChange={setSelected} /><p className="mt-3 text-sm text-(--color-text-muted)">{selected ? `Selected: ${selected.url}` : "Select or upload an image to manage media assets."}</p></div></div>;
}
