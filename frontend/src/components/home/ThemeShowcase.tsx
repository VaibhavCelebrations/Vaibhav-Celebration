"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CmsImage } from "@/components/ui/CmsImage";
import type { ThemeCard } from "@/lib/cms/types";

/* ── Local theme background images ──────────────────────────────── */
import themeExploreBg from "@/assets/Theme_explore.png";

/* ── Per-theme styling ──────────────────────────────────────────── */
const themePanelStyles = [
  {
    objectPos: "object-[80%_center] md:object-center",
    fallbackColor: "#e8e0d8",
    titleColor: "!text-white",
    titleShadow: "drop-shadow-md",
    descColor: "text-white/90 drop-shadow-md",
    tagBorder: "border-white/30 text-white",
    btnClass: "bg-white text-charcoal hover:bg-cream",
    overlayGradient: "",
  },
  {
    objectPos: "object-[75%_center] md:object-center",
    fallbackColor: "#d4c8b8",
    titleColor: "!text-charcoal",
    titleShadow: "drop-shadow-md",
    descColor: "text-charcoal/90 drop-shadow-sm",
    tagBorder: "border-charcoal/30 text-charcoal",
    btnClass: "bg-charcoal text-white hover:bg-mocha",
    overlayGradient: "",
  },
  {
    objectPos: "object-[80%_center] md:object-center",
    fallbackColor: "#e0d0c4",
    titleColor: "!text-charcoal",
    titleShadow: "drop-shadow-md",
    descColor: "text-charcoal/90 drop-shadow-sm",
    tagBorder: "border-charcoal/30 text-charcoal",
    btnClass: "bg-charcoal text-white hover:bg-mocha",
    overlayGradient: "",
  },
];

type ThemeShowcaseProps = {
  themes: ThemeCard[];
};

export function ThemeShowcase({ themes }: ThemeShowcaseProps) {
  const topThemes = themes.slice(0, 3);

  return (
    <div
      id="themes"
      className="relative"
      style={{
        marginTop: "-2rem",
        zIndex: 20,
      }}
    >
      {/* ── Panel 0: Compact Intro — warm taupe/champagne instead of black ─────────── */}
      <section
        className="sticky flex flex-col items-center justify-center overflow-hidden"
        style={{
          top: "96px",
          zIndex: 1,
          background: "linear-gradient(160deg, #f5efe8 0%, #e8ddd2 50%, #d4c4b0 100%)",
          borderRadius: "2.5rem 2.5rem 0 0",
          height: "60vh",
          paddingBottom: "4rem",
          marginBottom: "-4rem",
          boxShadow: "0 -20px 40px rgba(0,0,0,0.08)",
        }}
      >
        <div className="relative text-center px-5 md:px-10">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-10 md:w-16 bg-gradient-to-r from-transparent to-mocha/60" />
            <p className="text-sm font-bold text-mocha uppercase tracking-[0.2em]">
              Explore Celebrations
            </p>
            <div className="h-px w-10 md:w-16 bg-gradient-to-l from-transparent to-mocha/60" />
          </div>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl text-charcoal font-semibold leading-tight max-w-4xl mx-auto">
            Handpicked themes kids absolutely love
          </h2>
          <p className="mt-4 text-charcoal/60 text-base md:text-lg max-w-2xl mx-auto">
            Each theme is a complete experience — from invitations and décor to activities, return gifts and keepsakes.
          </p>
        </div>
      </section>

      {/* ── Panels 1–3: Theme Sections ──────────────────────────── */}
      {topThemes.map((theme, i) => {
        const s = themePanelStyles[i] || themePanelStyles[0];

        return (
          <section
            key={theme.slug}
            className={`sticky w-full overflow-hidden md:h-screen ${i > 0 ? "-mt-8 md:-mt-0" : ""}`}
            style={{
              top: "96px",
              zIndex: 2 + i,
              backgroundColor: s.fallbackColor,
              borderRadius: "2rem 2rem 0 0",
              boxShadow: "0 -20px 50px rgba(0,0,0,0.15)",
            }}
          >
            {/* ─── MOBILE / TABLET (< md) ─────────────────────────────
                Image on top → gradient fades to beige → text below     */}
            <div className="md:hidden flex flex-col">
              {/* Image area with gradient fade to black at bottom */}
              <div className="relative w-full aspect-[4/3]">
                <CmsImage
                  src={theme.cardImageUrl}
                  alt={theme.title}
                  fill
                  className="object-cover object-center"
                  sizes="100vw"
                  priority={i === 0}
                />
                {/* Intense short gradient fade: image → dark */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-[15%] pointer-events-none"
                  style={{
                    background: "linear-gradient(to top, rgba(24,20,18,1) 0%, rgba(24,20,18,0.8) 50%, transparent 100%)",
                  }}
                />
              </div>

              {/* Text content on dark bg */}
              {/* -mt-[1px] ensures a pixel-perfect seamless blend with the image gradient above it */}
              <div className="px-5 pb-4 -mt-[1px] relative z-10" style={{ backgroundColor: "rgba(24,20,18,1)" }}>
                {/* Shift text up to sit on the gradient without pulling up the solid background */}
                <div className="-translate-y-7 relative z-20">
                  <h3 className="font-display text-xl font-bold leading-[1.1] mb-2 !text-white drop-shadow-md">
                    {theme.title}
                  </h3>
                  <p className="text-[13px] text-white/75 max-w-sm leading-relaxed mb-4 drop-shadow-sm">
                    {theme.shortDescription}
                  </p>
                  <Link
                    href={`/themes/${theme.slug}`}
                    className="inline-flex items-center gap-2 font-bold px-5 py-2.5 rounded-full transition-all duration-300 hover:scale-105 text-xs uppercase tracking-wider bg-white text-charcoal hover:bg-cream shadow-md"
                  >
                    Explore Theme
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>

            {/* ─── DESKTOP (md+) — original layout, completely unchanged ── */}
            <div className="hidden md:block h-screen">
              <CmsImage
                src={theme.cardImageUrl}
                alt={theme.title}
                fill
                className={`object-cover ${s.objectPos}`}
                sizes="100vw"
                priority={i === 0}
              />

              <div className="absolute inset-0 flex items-center">
                <div className="w-[65%] lg:w-[50%] px-12 lg:px-24">
                  <h3 className={`font-display text-4xl lg:text-5xl font-bold leading-[1.05] mb-6 ${s.titleColor} ${s.titleShadow}`}>
                    {theme.title}
                  </h3>

                  <p className={`text-base lg:text-lg max-w-md leading-relaxed mb-10 ${s.descColor}`}>
                    {theme.shortDescription}
                  </p>

                  <Link
                    href={`/themes/${theme.slug}`}
                    className={`inline-flex items-center gap-3 font-bold px-8 py-4 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-2xl text-sm uppercase tracking-wider ${s.btnClass}`}
                  >
                    Explore Theme
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* ── Panel 4: Warm CTA Section ─────────────────────────── */}
      <section
        className="sticky overflow-hidden flex flex-col items-center justify-center text-center bg-cover bg-[70%_center] md:bg-center md:min-h-screen -mt-8 md:-mt-0"
        style={{
          top: "96px",
          zIndex: 10,
          borderRadius: "2rem 2rem 0 0",
          background: "linear-gradient(160deg, #a08772 0%, #8b7260 50%, #755846 100%)",
          backgroundImage: `url(${themeExploreBg.src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          boxShadow: "0 -20px 50px rgba(0,0,0,0.2)",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40" />
        <div className="relative w-full max-w-5xl mx-auto px-5 md:px-6 py-10 md:py-20">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-10 md:w-16 bg-gradient-to-r from-transparent to-white/40" />
            <p className="text-sm font-bold text-white/70 uppercase tracking-[0.2em]">
              More to Explore
            </p>
            <div className="h-px w-10 md:w-16 bg-gradient-to-l from-transparent to-white/40" />
          </div>

          <h3 className="font-display text-3xl sm:text-4xl md:text-5xl !text-white font-bold mb-8 leading-[1.15]">
            Can&apos;t find your<br />perfect theme?
          </h3>

          <p className="text-white/80 text-sm md:text-lg max-w-2xl mx-auto leading-relaxed mb-6 md:mb-12">
            We have many more magical themes waiting. From jungle safaris to
            superhero quests — discover celebrations designed to wow your little one.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-6">
            <Link
              href="/themes"
              className="inline-flex items-center justify-center bg-white text-charcoal font-bold px-7 py-3 md:px-10 md:py-4 rounded-full transition-all duration-300 hover:scale-105 hover:bg-cream text-xs md:text-sm uppercase tracking-wider w-full sm:w-auto sm:min-w-[220px]"
            >
              View All Themes
            </Link>
            <Link
              href="/consultation"
              className="inline-flex items-center justify-center border-2 border-white text-white font-bold px-7 py-3 md:px-10 md:py-4 rounded-full transition-all duration-300 hover:bg-white/10 hover:border-white text-xs md:text-sm uppercase tracking-wider w-full sm:w-auto sm:min-w-[220px]"
            >
              Request Custom Theme
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
