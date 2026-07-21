"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { placeholderThemes } from "@/lib/placeholder-data";

/* ── Local theme background images ──────────────────────────────── */
import spaceBg from "@/assets/theme/space_theme.png";
import cocomelonBg from "@/assets/theme/cocomelon_theme.png";
import princessBg from "@/assets/theme/princess_theme.png";

/* ── Per-theme styling ──────────────────────────────────────────── */
const themePanelStyles = [
  {
    bg: spaceBg,
    fallbackColor: "#0d0d2b",
    titleColor: "!text-white",
    titleShadow: "drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]",
    descColor: "text-white/90",
    tagBorder: "border-white/30 text-white",
    btnClass: "bg-white text-charcoal hover:bg-cream",
  },
  {
    bg: cocomelonBg,
    fallbackColor: "#4aa84a",
    titleColor: "!text-charcoal",
    titleShadow: "",
    descColor: "text-charcoal/80",
    tagBorder: "border-charcoal/30 text-charcoal",
    btnClass: "bg-charcoal text-white hover:bg-charcoal-light",
  },
  {
    bg: princessBg,
    fallbackColor: "#e8a4c8",
    titleColor: "!text-purple-950",
    titleShadow: "",
    descColor: "text-purple-900/80",
    tagBorder: "border-purple-900/30 text-purple-950",
    btnClass: "bg-purple-900 text-white hover:bg-purple-800",
  },
];

export function ThemeShowcase() {
  const topThemes = placeholderThemes.slice(0, 3);

  return (
    <div
      id="themes"
      className="relative"
      style={{
        marginTop: "-2rem", // Reduced negative margin so it doesn't clip the hover cards above
        zIndex: 20,
      }}
    >
      {/* ── Panel 0: Compact Intro ─────────── */}
      <section
        className="sticky flex flex-col items-center justify-center overflow-hidden"
        style={{
          top: "0",
          zIndex: 1,
          backgroundColor: "#1a1a1a",
          borderRadius: "2.5rem 2.5rem 0 0",
          height: "60vh",
          boxShadow: "0 -20px 40px rgba(0,0,0,0.15)",
        }}
      >
        <div className="relative text-center px-5 md:px-10">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-10 md:w-16 bg-gradient-to-r from-transparent to-gold-accent/60" />
            <p className="text-sm font-bold text-gold-accent uppercase tracking-[0.2em]">
              Our Themes
            </p>
            <div className="h-px w-10 md:w-16 bg-gradient-to-l from-transparent to-gold-accent/60" />
          </div>
          {/* Forced text color with !text-cream to override globals.css h2 styles */}
          <h2 className="font-display text-5xl md:text-6xl lg:text-7xl !text-cream font-bold leading-tight max-w-4xl mx-auto">
            Handpicked themes kids absolutely love
          </h2>
        </div>
      </section>

      {/* ── Panels 1–3: Theme Sections ──────────────────────────── */}
      {topThemes.map((theme, i) => {
        const s = themePanelStyles[i] || themePanelStyles[0];

        return (
          <section
            key={theme.id}
            className="sticky h-screen overflow-hidden"
            style={{
              top: "0",
              zIndex: 2 + i,
              backgroundColor: s.fallbackColor,
              borderRadius: "2rem 2rem 0 0",
              boxShadow: "0 -20px 50px rgba(0,0,0,0.4)",
            }}
          >
            <Image
              src={s.bg}
              alt={`${theme.title} background`}
              fill
              className="object-cover"
              sizes="100vw"
              placeholder="blur"
              priority={i === 0}
            />

            <div className="absolute inset-0 flex items-center">
              <div className="w-full lg:w-[50%] px-8 md:px-16 lg:px-20">
                <h3 className={`font-display text-4xl md:text-5xl lg:text-7xl font-bold leading-[1.05] mb-6 ${s.titleColor} ${s.titleShadow}`}>
                  {theme.title}
                </h3>

                <p className={`text-sm md:text-base lg:text-lg max-w-md leading-relaxed mb-10 ${s.descColor}`}>
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

      {/* ── Panel 4: Redesigned Simple CTA Section ─────────────────────────── */}
      <section
        className="sticky min-h-screen overflow-hidden flex flex-col items-center justify-center text-center"
        style={{
          top: "0",
          zIndex: 10,
          borderRadius: "2rem 2rem 0 0",
          backgroundColor: "#755846", // Solid mocha color
          boxShadow: "0 -20px 50px rgba(0,0,0,0.4)",
        }}
      >
        <div className="relative w-full max-w-5xl mx-auto px-6 py-20">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-10 md:w-16 bg-gradient-to-r from-transparent to-white/40" />
            <p className="text-sm font-bold text-white/70 uppercase tracking-[0.2em]">
              More to Explore
            </p>
            <div className="h-px w-10 md:w-16 bg-gradient-to-l from-transparent to-white/40" />
          </div>

          <h3 className="font-display text-6xl md:text-7xl lg:text-8xl !text-white font-bold mb-8 leading-[1.1]">
            Can&apos;t find your<br />perfect theme?
          </h3>
          
          <p className="text-white/80 text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed mb-12">
            We have many more magical themes waiting. From jungle safaris to
            superhero quests — discover celebrations designed to wow your little one.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link
              href="/themes"
              className="inline-flex items-center justify-center bg-white text-charcoal font-bold px-12 py-5 rounded-full transition-all duration-300 hover:scale-105 hover:bg-cream text-sm uppercase tracking-wider min-w-[240px]"
            >
              View All Themes
            </Link>
            <Link
              href="/consultation"
              className="inline-flex items-center justify-center border-2 border-white text-white font-bold px-12 py-5 rounded-full transition-all duration-300 hover:bg-white/10 hover:border-white text-sm uppercase tracking-wider min-w-[240px]"
            >
              Request Custom Theme
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
