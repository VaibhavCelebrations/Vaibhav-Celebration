"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ProductCard } from "@/components/ecom/ProductCard";
import { getProductsByTheme } from "@/lib/ecom-placeholder-data";

interface ThemeReturnGiftsProps {
  themeSlug: string;
  themeTitle: string;
}

export function ThemeReturnGifts({ themeSlug, themeTitle }: ThemeReturnGiftsProps) {
  const products = getProductsByTheme(themeSlug);

  if (products.length === 0) return null;

  return (
    <section className="py-16 md:py-24 bg-cream/50">
      <div className="max-w-7xl mx-auto px-5 md:px-10">
        <ScrollReveal>
          <SectionHeader
            eyebrow="Return Gifts"
            title={`Gifts for ${themeTitle.replace(/ Celebration| Birthday/gi, "")}`}
            description="Surprise your little guests with themed return gifts they'll love."
          />
        </ScrollReveal>

        {/* Horizontal scroll on mobile, grid on desktop */}
        <div className="mt-10 flex lg:grid lg:grid-cols-4 gap-4 md:gap-6 overflow-x-auto lg:overflow-visible hide-scrollbar pb-4 lg:pb-0">
          {products.slice(0, 4).map((product, i) => (
            <div key={product.id} className="shrink-0 w-[260px] sm:w-[280px] lg:w-auto">
              <ScrollReveal delay={i * 80}>
                <ProductCard product={product} compact />
              </ScrollReveal>
            </div>
          ))}
        </div>

        {products.length > 4 && (
          <ScrollReveal>
            <div className="mt-8 text-center">
              <Link
                href={`/gifts?theme=${themeSlug}`}
                className="inline-flex items-center gap-2 text-mocha font-semibold text-sm hover:gap-3 transition-all group"
              >
                View All {themeTitle.replace(/ Celebration| Birthday/gi, "")} Gifts
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </ScrollReveal>
        )}
      </div>
    </section>
  );
}
