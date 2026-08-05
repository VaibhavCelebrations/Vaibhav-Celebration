"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { listActivePopups } from "@/lib/cms/content";
import type { Popup } from "@/lib/cms/types";
import { CacheStore } from "@/lib/cache-store";

export function PopupModal() {
  const pathname = usePathname();
  
  let placement: string | null = null;
  if (pathname === "/") placement = "HOMEPAGE";
  else if (pathname.startsWith("/themes")) placement = "THEMES_PAGE";
  else if (pathname.startsWith("/packages")) placement = "PACKAGES_PAGE";
  else if (pathname.startsWith("/gallery")) placement = "GALLERY_PAGE";

  const [popups, setPopups] = useState<Popup[]>([]);
  const [activePopup, setActivePopup] = useState<Popup | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchPopups = async () => {
      if (!placement) return;
      try {
        const data = await listActivePopups(placement);
        if (mounted && data.length > 0) {
          setPopups(data);
        }
      } catch (err) {
        console.error("Failed to load popups", err);
      }
    };
    void fetchPopups();
    return () => {
      mounted = false;
    };
  }, [placement]);

  useEffect(() => {
    if (popups.length === 0) return;

    // Find the first popup that hasn't been dismissed
    const nextPopup = popups.find((p) => {
      const dismissed = CacheStore.getItem<boolean>(`dismissed_popup_${p.id}`, false);
      return !dismissed;
    });

    if (nextPopup) {
      const delay = nextPopup.triggerAfterSeconds * 1000;
      const timer = setTimeout(() => {
        setActivePopup(nextPopup);
        setIsVisible(true);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [popups]);

  if (!activePopup || !isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    CacheStore.setItem(`dismissed_popup_${activePopup.id}`, true);
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-charcoal/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-surface rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl relative animate-in zoom-in-95 duration-300">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-charcoal flex items-center justify-center z-10 shadow-sm cursor-pointer transition-colors"
        >
          <X size={16} />
        </button>

        {activePopup.image && (
          <div className="relative w-full aspect-[16/9] bg-cream">
            <Image
              src={activePopup.image.url}
              alt={activePopup.image.altText || activePopup.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 500px"
            />
          </div>
        )}

        <div className="p-8 text-center">
          <h2 className="font-display text-2xl font-bold text-charcoal mb-3">
            {activePopup.title}
          </h2>
          {activePopup.bodyText && (
            <p className="text-text-muted mb-6">{activePopup.bodyText}</p>
          )}

          {activePopup.ctaLabel && activePopup.ctaUrl && (
            <Link
              href={activePopup.ctaUrl}
              onClick={handleDismiss}
              className="btn-primary w-full py-3 text-sm"
            >
              {activePopup.ctaLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
