"use client";

import { Heart } from "lucide-react";

export function FavoriteButton() {
  return (
    <button
      className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white hover:bg-white/30 transition-all cursor-pointer"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        // TODO: Implement actual favorite logic
      }}
      aria-label="Save theme"
    >
      <Heart size={18} />
    </button>
  );
}
