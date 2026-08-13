"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import heroBg from "@/assets/bg-1.png";
import type { HomeHeroSection } from "@/lib/cms/types";
import { resolveSectionMedia } from "@/lib/cms/map-media";

type HeroSectionProps = {
  content?: HomeHeroSection;
};

export function HeroSection({ content }: HeroSectionProps) {
  const background = content?.backgroundImage
    ? resolveSectionMedia(content.backgroundImage, heroBg.src)
    : heroBg.src;

  return (
    <section
      className="relative min-h-[90dvh] w-full flex overflow-hidden pt-[110px] pb-[100px] md:pt-[130px] bg-cover bg-[70%_center] md:bg-center"
      style={{
        backgroundImage: `url(${background})`,
      }}
    >
      <div className="absolute inset-y-0 left-0 w-full md:w-2/3 lg:w-1/2 bg-gradient-to-r from-cream/95 via-cream/60 to-transparent z-0" />
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-surface to-transparent z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-5 md:px-10 w-full relative z-10 flex h-full items-center">
        <motion.div 
          className="relative z-10 max-w-2xl"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
          }}
        >
          <motion.p 
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.25, 1, 0.15, 1] } } }}
            className="inline-flex items-center gap-2 text-sm md:text-base font-medium text-mocha mb-5 italic font-display"
          >
            {content?.eyebrow ?? "Your Complete Celebration Ecosystem ✦"}
          </motion.p>

          <motion.h1 
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.25, 1, 0.15, 1] } } }}
            className="font-display text-3xl sm:text-4xl lg:text-[3rem] leading-[1.15] text-charcoal font-semibold"
          >
            {content?.headline ? (
              content.headlineAccent &&
              content.headline.includes(content.headlineAccent) ? (
                <>
                  {content.headline.slice(
                    0,
                    content.headline.indexOf(content.headlineAccent),
                  )}
                  <span className="italic font-normal text-mocha">
                    {content.headlineAccent}
                  </span>
                  {content.headline.slice(
                    content.headline.indexOf(content.headlineAccent) +
                      content.headlineAccent.length,
                  )}
                </>
              ) : (
                content.headline
              )
            ) : (
              <>
                One Theme. Every Detail.
                <br className="hidden sm:block" />{" "}
                <span className="italic font-normal text-mocha">
                  Beautifully Celebrated.
                </span>
              </>
            )}
          </motion.h1>

          <motion.p 
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.25, 1, 0.15, 1] } } }}
            className="mt-6 text-base md:text-lg text-text-muted leading-relaxed max-w-xl"
          >
            {content?.subheadline ??
              "From the first invite to activities, welcome details, personalized return gifts and keepsakes — Vaibhav Celebrations brings every element together under one thoughtful concept, tailored around the person, milestone or moment being celebrated."}
          </motion.p>

          <motion.div 
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.25, 1, 0.15, 1] } } }}
            className="mt-8 flex flex-col sm:flex-row items-center gap-4"
          >
            <Link
              href={content?.primaryCta?.href ?? "/themes"}
              className="btn-primary w-full sm:w-auto text-center text-sm px-7 py-3.5 rounded-full uppercase tracking-wide font-bold"
            >
              {content?.primaryCta?.label ?? "Explore Celebrations"}
            </Link>
            <Link
              href={content?.secondaryCta?.href ?? "/build-package"}
              className="btn-outline w-full sm:w-auto flex justify-center text-center text-sm px-7 py-3.5 rounded-full uppercase tracking-wide font-bold bg-white"
            >
              {content?.secondaryCta?.label ?? "Build Your Celebration"}
              <ArrowRight size={16} />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
