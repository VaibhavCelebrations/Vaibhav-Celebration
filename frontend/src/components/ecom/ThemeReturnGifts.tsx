"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ProductCard } from "@/components/ecom/ProductCard";
import { ScrollTrigger } from "@/lib/gsap-register";
import * as shopApi from "@/lib/shop-api";
import type { Product } from "@/lib/shop-types";

interface ThemeReturnGiftsProps {
  themeSlug: string;
  themeTitle: string;
}

export function ThemeReturnGifts({ themeSlug, themeTitle }: ThemeReturnGiftsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const result = await shopApi.listProducts({ theme: themeSlug, pageSize: 8 });
        if (!cancelled) {
          setProducts(result.items);
          setTotalCount(result.total);
        }
      } catch {
        if (!cancelled) {
          setProducts([]);
          setTotalCount(0);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          // Wait a tick for the DOM to update, then refresh ScrollTrigger
          // This fixes the sibling gallery strip's pin jumping issues due to dynamic height changes
          setTimeout(() => {
            if (typeof window !== "undefined") {
              ScrollTrigger.refresh();
            }
          }, 100);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [themeSlug]);

  if (!isLoading && products.length === 0) return null;

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

        {isLoading ? (
          <div className="mt-10 flex justify-center py-10">
            <Loader2 size={28} className="animate-spin text-mocha" />
          </div>
        ) : (
          <>
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

            {totalCount > 4 && (
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
          </>
        )}
      </div>
    </section>
  );
}
