"use client";

import { useEffect, useRef, useState } from "react";
import { VideoOff } from "lucide-react";

type VideoPlayerProps = {
  src: string;
  /** Accessible name, e.g. "Video invitation sample". */
  label: string;
  /** False while another slide is showing: playback stops so audio never continues off-screen. */
  active?: boolean;
  className?: string;
};

/** Native video with controls. Never autoplays; the customer presses play. */
export function VideoPlayer({ src, label, active = true, className = "" }: VideoPlayerProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!active) ref.current?.pause();
  }, [active]);

  if (failed) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 text-white/70 ${className}`} role="alert">
        <VideoOff size={28} strokeWidth={1.5} aria-hidden="true" />
        <p className="text-sm">This video could not be played.</p>
      </div>
    );
  }

  return (
    <video
      ref={ref}
      // "#t=0.1" shows the first frame as the poster before play is pressed
      src={`${src}#t=0.1`}
      controls
      playsInline
      preload="metadata"
      aria-label={label}
      onError={() => setFailed(true)}
      className={`bg-black ${className}`}
    />
  );
}
