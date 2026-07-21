"use client";

import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";

const clipLayouts = [
  // Layout 1: Angular grid
  [
    "polygon(0% 0%, 65% 0%, 55% 100%, 0% 100%)",
    "polygon(68% 0%, 100% 0%, 100% 48%, 58% 48%)",
    "polygon(58% 52%, 100% 52%, 100% 100%, 48% 100%)",
  ],
  // Layout 2: Diamond shapes
  [
    "polygon(50% 0%, 100% 30%, 80% 100%, 0% 70%)",
    "polygon(0% 0%, 45% 0%, 35% 65%, 0% 50%)",
    "polygon(85% 40%, 100% 55%, 100% 100%, 55% 100%)",
  ],
  // Layout 3: Vertical strips
  [
    "polygon(0% 0%, 35% 0%, 30% 100%, 0% 100%)",
    "polygon(38% 5%, 68% 0%, 65% 95%, 33% 100%)",
    "polygon(71% 0%, 100% 0%, 100% 100%, 68% 100%)",
  ],
  // Layout 4: Hexagonal feel
  [
    "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
    "polygon(0% 0%, 22% 0%, 0% 45%)",
    "polygon(78% 100%, 100% 100%, 100% 55%)",
  ],
];

const placeholderColors = [
  "from-blush to-lavender",
  "from-skyblue to-navy/20",
  "from-mint to-sage/30",
  "from-peach to-gold-light/40",
];

export function HeroClippedImages() {
  const [activeLayout, setActiveLayout] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveLayout((prev) => (prev + 1) % clipLayouts.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const currentClips = clipLayouts[activeLayout];

  return (
    <div className="relative w-full aspect-[4/5] md:aspect-[5/6] max-w-lg mx-auto lg:mx-0">
      {/* Clip-path image containers */}
      {currentClips.map((clip, i) => (
        <div
          key={i}
          className={`absolute inset-0 bg-gradient-to-br ${
            placeholderColors[(activeLayout + i) % placeholderColors.length]
          } transition-all duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)]`}
          style={{ clipPath: clip }}
        >
          {/* Wireframe label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-navy/30 text-xs font-medium tracking-wider uppercase bg-white/40 px-3 py-1.5 rounded-full">
              Hero Image {i + 1}
            </span>
          </div>
        </div>
      ))}

      {/* Overlapping seal badge */}
      <div className="seal seal-pulse absolute -left-4 bottom-8 md:-left-8 md:bottom-14 w-24 h-24 md:w-28 md:h-28 bg-navy text-ivory flex items-center justify-center text-center shadow-soft z-10">
        <span className="font-display text-[10px] md:text-xs leading-tight tracking-wide px-2">
          Explore
          <br />
          Themes
        </span>
      </div>

      {/* Floating accent card */}
      <div className="hidden md:flex absolute -right-6 top-8 bg-paper rounded-xl shadow-soft px-5 py-4 items-center gap-3 max-w-[190px] z-10">
        <Sparkles size={20} className="text-gold shrink-0" />
        <p className="text-xs text-navy/80 leading-snug">
          One theme. Every detail, thoughtfully designed.
        </p>
      </div>

      {/* Layout indicator dots */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {clipLayouts.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveLayout(i)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === activeLayout
                ? "bg-gold w-5"
                : "bg-gold-light/50 hover:bg-gold-light"
            }`}
            aria-label={`Layout ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
