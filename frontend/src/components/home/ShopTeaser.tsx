import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { ProductCard } from "@/components/ecom/ProductCard";
import * as shopApi from "@/lib/shop-api";

export async function ShopTeaser() {
  const products = await shopApi.listProducts({ pageSize: 4, sort: "newest" }).catch(() => ({ items: [], total: 0, page: 1, pageSize: 4 }));
  const featured = products.items.filter((p) => p.isActive).slice(0, 4);

  return (
    <section className="py-12 md:py-16 bg-cream-dark/30 border-y border-border-light">
      <div className="max-w-7xl mx-auto px-5 md:px-10">
        <ScrollReveal>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-10 mb-8">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-mocha/10 to-blush/20 flex items-center justify-center shrink-0">
                <ShoppingBag size={24} className="text-mocha" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-display text-lg md:text-xl font-semibold text-charcoal">
                  Need Only Return Gifts?
                </h3>
                <p className="text-sm text-text-muted mt-1">
                  Shop personalized return gifts, themed keepsakes and festive hampers — no celebration package required.
                </p>
              </div>
            </div>
            <Link
              href="/gifts"
              className="btn-primary text-sm font-bold px-8 py-3.5 rounded-full uppercase tracking-wider flex items-center gap-2 shrink-0 group"
            >
              Shop Return Gifts
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </ScrollReveal>

        {featured.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {featured.map((product, i) => (
              <ScrollReveal key={product.id} delay={i * 60}>
                <ProductCard product={product} compact />
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
