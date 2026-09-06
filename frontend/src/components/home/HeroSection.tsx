"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import heroBg from "@/assets/bg-1.png";
import type { HomeHeroSection } from "@/lib/cms/types";
import { resolveSectionMedia } from "@/lib/cms/map-media";
import { asText } from "@/lib/cms/text";

type HeroSectionProps = {
  content?: HomeHeroSection;
};

const DEFAULT_HEADLINE = "One Theme. Every Detail. Beautifully Celebrated";
const DEFAULT_ACCENT = "Beautifully Celebrated";

export function HeroSection({ content }: HeroSectionProps) {
  const background = content?.backgroundImage
    ? resolveSectionMedia(content.backgroundImage, heroBg.src)
    : heroBg.src;

  const eyebrow = asText(content?.eyebrow, "Your Complete Celebration Ecosystem ✦");
  const headline = asText(content?.headline, DEFAULT_HEADLINE);
  const headlineAccent = asText(content?.headlineAccent, DEFAULT_ACCENT);
  const subheadline = asText(
    content?.subheadline,
    "From the first invite to activities, welcome details, personalized return gifts and keepsakes — Vaibhav Celebrations brings every element together under one thoughtful concept, tailored around the person, milestone or moment being celebrated.",
  );
  const primaryCta = {
    label: asText(content?.primaryCta?.label, "Explore Celebrations"),
    href: asText(content?.primaryCta?.href, "/themes"),
  };
  const secondaryCta = {
    label: asText(content?.secondaryCta?.label, "Build Your Celebration"),
    href: "/packages",
  };

  const accentIndex = headline.includes(headlineAccent) ? headline.indexOf(headlineAccent) : -1;
  const lead = accentIndex >= 0 ? headline.slice(0, accentIndex).trimEnd() : "One Theme. Every Detail.";
  const accent = accentIndex >= 0 ? headlineAccent : DEFAULT_ACCENT;

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════
          MOBILE / TABLET (< md)
          Image on top → gradient fade to cream → text below on cream bg
          ═══════════════════════════════════════════════════════════════ */}
      <section className="md:hidden flex flex-col pt-[110px] bg-cream">
        {/* Text content on cream background */}
        <div className="px-5 pb-6 relative z-10 bg-cream">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { staggerChildren: 0.12 } }}
          >
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 1, 0.15, 1] } }}
              className="inline-flex items-center gap-2 text-xs font-medium text-mocha mb-2 italic font-display"
            >
              {eyebrow}
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.1, ease: [0.25, 1, 0.15, 1] } }}
              className="font-display text-[1.6rem] leading-[1.2] tracking-[-0.02em] text-charcoal font-semibold"
            >
              {lead}{" "}
              <span className="italic font-normal text-mocha">{accent}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.2, ease: [0.25, 1, 0.15, 1] } }}
              className="mt-3 text-[13px] text-text-muted leading-relaxed"
            >
              {subheadline}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.3, ease: [0.25, 1, 0.15, 1] } }}
              className="mt-6 flex flex-col gap-3"
            >
              <Link
                href={primaryCta.href}
                className="btn-primary w-full text-center text-xs px-6 py-3.5 rounded-full uppercase tracking-wide font-bold shadow-md hover:shadow-lg transition-all"
              >
                {primaryCta.label}
              </Link>
              <Link
                href={secondaryCta.href}
                className="btn-outline w-full flex items-center justify-center gap-2 text-center text-xs px-6 py-3.5 rounded-full uppercase tracking-wide font-bold bg-white shadow-sm hover:shadow-md transition-all"
              >
                {secondaryCta.label}
                <ArrowRight size={14} />
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Image container with top gradient fade to cream */}
        <div className="relative w-full aspect-[4/3] -mt-1">
          <Image
            src={background}
            alt="Celebration hero"
            fill
            priority
            className="object-cover object-[70%_center]"
            sizes="100vw"
          />
          {/* Gradient fade: cream → image */}
          <div
            className="absolute top-0 left-0 right-0 h-[25%] pointer-events-none"
            style={{
              background: "linear-gradient(to bottom, var(--color-cream) 0%, var(--color-cream) 5%, transparent 100%)",
            }}
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          DESKTOP (md+) — original layout, completely unchanged
          ═══════════════════════════════════════════════════════════════ */}
      <section
        className="hidden md:flex relative min-h-[90dvh] w-full overflow-hidden pt-[130px] pb-[100px] bg-cover bg-center"
        style={{
          backgroundImage: `url(${background})`,
        }}
      >
        <div className="absolute inset-y-0 left-0 w-2/3 lg:w-1/2 bg-gradient-to-r from-cream/95 via-cream/70 to-transparent z-0" />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-surface to-transparent z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-10 w-full relative z-10 flex h-full items-center">
          <motion.div
            className="relative z-10 max-w-2xl"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
            }}
          >
            <motion.p
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.25, 1, 0.15, 1] } } }}
              className="inline-flex items-center gap-2 text-base font-medium text-mocha mb-6 italic font-display"
            >
              {eyebrow}
            </motion.p>

            <motion.h1
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.25, 1, 0.15, 1] } } }}
              className="font-display text-4xl lg:text-[3.15rem] leading-[1.18] tracking-[-0.02em] text-charcoal font-semibold"
            >
              {lead}
              <br />{" "}
              <span className="italic font-normal text-mocha">{accent}</span>
            </motion.h1>

            <motion.p
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.25, 1, 0.15, 1] } } }}
              className="mt-6 text-lg text-text-muted leading-relaxed max-w-xl"
            >
              {subheadline}
            </motion.p>

            <motion.div
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.25, 1, 0.15, 1] } } }}
              className="mt-8 flex flex-row items-center gap-4"
            >
              <Link
                href={primaryCta.href}
                className="btn-primary text-center text-sm px-7 py-3.5 rounded-full uppercase tracking-wide font-bold"
              >
                {primaryCta.label}
              </Link>
              <Link
                href={secondaryCta.href}
                className="btn-outline flex items-center justify-center gap-2 text-center text-sm px-7 py-3.5 rounded-full uppercase tracking-wide font-bold bg-white"
              >
                {secondaryCta.label}
                <ArrowRight size={16} />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
