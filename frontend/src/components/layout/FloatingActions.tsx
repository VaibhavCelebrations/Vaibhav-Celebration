"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { whatsappHref } from "@/lib/cms/map-media";
import { envWhatsAppNumber, validPhoneOrNull } from "@/lib/business";

type FloatingActionsProps = {
  phone?: string;
};

/** Scroll distance after which "Go to top" appears. */
const SHOW_TOP_AFTER_PX = 400;

/**
 * Bottom-right stack shown on every page: "Go to top" above WhatsApp.
 * Sits below every drawer, modal and lightbox (z-45), and is lifted clear of the sticky
 * action bars on the purchase flows so it never covers a total or a Continue button.
 */
export function FloatingActions({ phone }: FloatingActionsProps) {
  const pathname = usePathname();
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setShowTop(window.scrollY > SHOW_TOP_AFTER_PX);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const prefillMessage = process.env.NEXT_PUBLIC_WHATSAPP_PREFILL_MESSAGE?.trim() || undefined;
  const href = whatsappHref(validPhoneOrNull(phone) ?? envWhatsAppNumber(), prefillMessage);

  // The builders keep a sticky action bar at every width; checkout only on mobile.
  const hasStickyBar = pathname?.startsWith("/build-package") || pathname?.startsWith("/custom-plan");
  const hasMobileStickyBar = pathname?.startsWith("/checkout");
  const bottomClass = hasStickyBar ? "bottom-[100px]" : hasMobileStickyBar ? "bottom-[100px] md:bottom-6" : "bottom-6";

  return (
    <div className={`fixed right-5 md:right-6 z-[45] flex flex-col items-end gap-3 pointer-events-none ${bottomClass}`}>
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Go to top"
        aria-hidden={!showTop}
        tabIndex={showTop ? 0 : -1}
        className={`flex h-12 w-12 items-center justify-center rounded-full border border-border-light bg-surface text-charcoal shadow-lg cursor-pointer transition-all duration-300 hover:bg-mocha hover:text-white hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha focus-visible:ring-offset-2 ${
          showTop ? "pointer-events-auto opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        <ArrowUp size={20} aria-hidden="true" />
      </button>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="pointer-events-auto flex items-center justify-center gap-2 rounded-full bg-[#25D366] text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 p-3 md:px-5 md:py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="shrink-0" aria-hidden="true">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.33 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.03c-.24.68-1.4 1.3-1.93 1.36-.5.06-1.02.27-3.42-.71-2.89-1.19-4.75-4.12-4.9-4.31-.14-.19-1.17-1.56-1.17-2.98 0-1.42.75-2.11 1.02-2.4.27-.29.58-.36.78-.36h.56c.18 0 .42-.03.65.5.24.55.81 1.9.88 2.04.07.14.11.31.02.5-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.89 1.05.94 1.94 1.23 2.22 1.37.28.14.44.12.6-.07.16-.19.68-.79.87-1.06.18-.28.36-.23.61-.14.24.09 1.55.73 1.82.86.27.14.45.2.51.32.07.11.07.65-.17 1.33Z"/>
        </svg>
        <span className="hidden md:block font-bold text-sm tracking-wide">Chat with us</span>
      </a>
    </div>
  );
}
