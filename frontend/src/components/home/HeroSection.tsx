"use client";

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
    <section
      className="relative min-h-[90dvh] w-full flex overflow-hidden pt-[110px] pb-[100px] md:pt-[130px] bg-cover bg-[70%_center] md:bg-center"
      style={{
        backgroundImage: `url(${background})`,
      }}
    >
      <div className="absolute inset-y-0 left-0 w-full md:w-2/3 lg:w-1/2 bg-gradient-to-r from-cream/95 via-cream/70 to-transparent z-0" />
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-surface to-transparent z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-5 md:px-10 w-full relative z-10 flex h-full items-center">
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
            className="inline-flex items-center gap-2 text-sm md:text-base font-medium text-mocha mb-6 italic font-display"
          >
            {eyebrow}
          </motion.p>

          <motion.h1
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.25, 1, 0.15, 1] } } }}
            className="font-display text-[2.15rem] sm:text-4xl lg:text-[3.15rem] leading-[1.18] tracking-[-0.02em] text-charcoal font-semibold"
          >
            {lead}
            <br className="hidden sm:block" />{" "}
            <span className="italic font-normal text-mocha">{accent}</span>
          </motion.h1>

          <motion.p
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.25, 1, 0.15, 1] } } }}
            className="mt-6 text-base md:text-lg text-text-muted leading-relaxed max-w-xl"
          >
            {subheadline}
          </motion.p>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.25, 1, 0.15, 1] } } }}
            className="mt-8 flex flex-col sm:flex-row items-center gap-4"
          >
            <Link
              href={primaryCta.href}
              className="btn-primary w-full sm:w-auto text-center text-sm px-7 py-3.5 rounded-full uppercase tracking-wide font-bold"
            >
              {primaryCta.label}
            </Link>
            <Link
              href={secondaryCta.href}
              className="btn-outline w-full sm:w-auto flex items-center justify-center gap-2 text-center text-sm px-7 py-3.5 rounded-full uppercase tracking-wide font-bold bg-white"
            >
              {secondaryCta.label}
              <ArrowRight size={16} />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
