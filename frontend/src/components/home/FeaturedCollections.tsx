import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { ProductCollection } from "@/lib/shop-types";

/** Collections the admin marked "Featured". Renders nothing when there are none. */
export function FeaturedCollections({ collections }: { collections: ProductCollection[] }) {
  if (collections.length === 0) return null;

  return (
    <section className="py-12 md:py-16" aria-labelledby="featured-collections-heading">
      <div className="max-w-7xl mx-auto px-5 md:px-10">
        <ScrollReveal>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-mocha mb-2">Curated for you</p>
              <h2 id="featured-collections-heading" className="font-display text-2xl md:text-4xl font-bold text-charcoal">
                Featured Collections
              </h2>
            </div>
            <Link
              href="/gifts"
              className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-mocha hover:text-charcoal transition-colors group"
            >
              View all gifts
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {collections.map((collection, i) => {
            // Fall back to the first product photo so a collection without a hero image still looks complete.
            const image = collection.heroImage ?? collection.products[0]?.images[0]?.media ?? null;
            return (
              <ScrollReveal key={collection.id} delay={i * 60}>
                <Link
                  href={`/gifts/collection/${collection.slug}`}
                  className="group block h-full overflow-hidden rounded-2xl border border-border-light bg-surface shadow-soft transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha focus-visible:ring-offset-2"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-cream-dark/40">
                    {image ? (
                      <Image
                        src={image.url}
                        alt={image.altText || collection.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-mocha/10 to-blush/30" aria-hidden="true" />
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-display text-lg md:text-xl font-semibold text-charcoal">{collection.title}</h3>
                    {collection.description && (
                      <p className="mt-1.5 text-sm text-text-muted line-clamp-2">{collection.description}</p>
                    )}
                    <p className="mt-4 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-mocha">
                      <span>
                        {collection.productCount} {collection.productCount === 1 ? "item" : "items"}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        Explore
                        <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                      </span>
                    </p>
                  </div>
                </Link>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
