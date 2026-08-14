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
            key={theme.id}
            className="sticky relative h-[100dvh] md:h-screen overflow-hidden"
            style={{
              top: "96px",
              zIndex: 2 + i,
              backgroundColor: s.fallbackColor,
              borderRadius: "2rem 2rem 0 0",
              boxShadow: "0 -20px 50px rgba(0,0,0,0.15)",
            }}
          >
            <CmsImage
              src={theme.cardImageUrl}
              alt={theme.title}
              fill
              className={`object-cover ${s.objectPos}`}
              sizes="100vw"
              priority={i === 0}
            />

            <div className="absolute inset-0 flex items-center">
              <div className="w-full md:w-[65%] lg:w-[50%] px-6 md:px-12 lg:px-24">
                <h3 className={`font-display text-3xl md:text-4xl lg:text-5xl font-bold leading-[1.05] mb-4 md:mb-6 ${s.titleColor} ${s.titleShadow}`}>
                  {theme.title}
                </h3>

                <p className={`text-sm md:text-base lg:text-lg max-w-md leading-relaxed mb-6 md:mb-10 ${s.descColor}`}>
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
          </section>
        );
      })}

      {/* ── Panel 4: Warm CTA Section ─────────────────────────── */}
      <section
        className="sticky min-h-screen overflow-hidden flex flex-col items-center justify-center text-center bg-cover bg-[70%_center] md:bg-center"
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
        <div className="relative w-full max-w-5xl mx-auto px-6 py-20">
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

          <p className="text-white/80 text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-12">
            We have many more magical themes waiting. From jungle safaris to
            superhero quests — discover celebrations designed to wow your little one.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link
              href="/themes"
              className="inline-flex items-center justify-center bg-white text-charcoal font-bold px-10 py-4 rounded-full transition-all duration-300 hover:scale-105 hover:bg-cream text-sm uppercase tracking-wider min-w-[220px]"
            >
              View All Themes
            </Link>
            <Link
              href="/consultation"
              className="inline-flex items-center justify-center border-2 border-white text-white font-bold px-10 py-4 rounded-full transition-all duration-300 hover:bg-white/10 hover:border-white text-sm uppercase tracking-wider min-w-[220px]"
            >
              Request Custom Theme
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
