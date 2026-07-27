"use client";

import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, X, Gift, Palette, Sparkles, PenTool } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ProductCard } from "@/components/ecom/ProductCard";
import { placeholderProducts, placeholderCategories } from "@/lib/ecom-placeholder-data";
import { placeholderThemes } from "@/lib/placeholder-data";
import type { GiftFilter } from "@/lib/ecom-types";

const categoryIcons: Record<string, React.ReactNode> = {
  "return-gifts": <Gift size={20} fill="currentColor" />,
  "activity-kits": <Palette size={20} fill="currentColor" />,
  "personalized-items": <Sparkles size={20} fill="currentColor" />,
  "stationery": <PenTool size={20} fill="currentColor" />,
};

const sortOptions = [
  { value: "popularity", label: "Popularity" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "newest", label: "Newest First" },
] as const;

export default function GiftsPage() {
  const [filter, setFilter] = useState<GiftFilter>({
    theme: null,
    category: null,
    search: "",
    sortBy: "popularity",
    priceRange: null,
  });
  const [showFilters, setShowFilters] = useState(false);

  const filteredProducts = useMemo(() => {
    let result = placeholderProducts.filter((p) => p.isActive);

    // Theme filter
    if (filter.theme) {
      result = result.filter((p) => p.themeTags.includes(filter.theme!));
    }

    // Category filter
    if (filter.category) {
      result = result.filter((p) => p.categoryTags.includes(filter.category!));
    }

    // Search
    if (filter.search.trim()) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.shortDescription.toLowerCase().includes(q) ||
          p.themeTags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Sort
    switch (filter.sortBy) {
      case "price_asc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        result.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      default:
        // popularity — keep original order
        break;
    }

    return result;
  }, [filter]);

  const activeFilterCount = [filter.theme, filter.category].filter(Boolean).length;

  const clearFilters = () => {
    setFilter({ theme: null, category: null, search: "", sortBy: "popularity", priceRange: null });
  };

  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-36 pb-16 md:pb-24 bg-cream min-h-screen">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          {/* Header */}
          <ScrollReveal>
            <SectionHeader
              eyebrow="Shop"
              title="Return Gifts & Party Essentials"
              description="Thoughtfully curated gifts, activity kits, and personalized keepsakes for your little one's celebration."
            />
          </ScrollReveal>

          {/* Search Bar */}
          <div className="mt-10 max-w-xl mx-auto relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light" />
            <input
              type="text"
              placeholder="Search gifts, kits, stationery..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="w-full pl-12 pr-4 py-4 rounded-full border border-border-light bg-surface text-charcoal text-sm font-sans placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-mocha/30 focus:border-mocha transition-all shadow-soft"
            />
            {filter.search && (
              <button
                onClick={() => setFilter({ ...filter, search: "" })}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-light hover:text-charcoal cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Category Tiles */}
          <div className="mt-10 flex gap-4 overflow-x-auto hide-scrollbar pb-4 px-2 -mx-2">
            <button
              onClick={() => setFilter({ ...filter, category: null })}
              className={`shrink-0 flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 cursor-pointer ${
                !filter.category
                  ? "bg-mocha text-white shadow-lg shadow-mocha/20 scale-105"
                  : "bg-white text-charcoal hover:bg-cream-dark hover:scale-105 shadow-sm"
              }`}
            >
              All Products
            </button>
            {placeholderCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilter({ ...filter, category: filter.category === cat.slug ? null : cat.slug })}
                className={`shrink-0 flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 cursor-pointer ${
                  filter.category === cat.slug
                    ? "bg-mocha text-white shadow-lg shadow-mocha/20 scale-105"
                    : "bg-white text-charcoal hover:bg-cream-dark hover:scale-105 shadow-sm"
                }`}
              >
                <div className={filter.category === cat.slug ? "text-mocha" : "text-text-light"}>
                  {categoryIcons[cat.slug]}
                </div>
                {cat.name}
              </button>
            ))}
          </div>

          {/* Theme Filter + Sort Row */}
          <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Theme Tags */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              <button
                onClick={() => setFilter({ ...filter, theme: null })}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  !filter.theme
                    ? "bg-charcoal text-white"
                    : "bg-cream-dark text-charcoal hover:bg-blush"
                }`}
              >
                All Themes
              </button>
              {placeholderThemes.filter((t) => t.isActive).map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setFilter({ ...filter, theme: filter.theme === theme.slug ? null : theme.slug })}
                  className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    filter.theme === theme.slug
                      ? "bg-charcoal text-white"
                      : "bg-cream-dark text-charcoal hover:bg-blush"
                  }`}
                >
                  {theme.title.replace(/ Theme| Birthday| Celebration/g, "")}
                </button>
              ))}
            </div>

            {/* Sort + Filter button */}
            <div className="flex items-center gap-3 shrink-0">
              <select
                value={filter.sortBy}
                onChange={(e) => setFilter({ ...filter, sortBy: e.target.value as GiftFilter["sortBy"] })}
                className="px-4 py-2 rounded-lg border border-border-light bg-surface text-sm font-medium text-charcoal focus:outline-none focus:ring-2 focus:ring-mocha/20 cursor-pointer"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all cursor-pointer ${
                  activeFilterCount > 0
                    ? "border-mocha bg-mocha/5 text-mocha"
                    : "border-border-light text-charcoal hover:border-mocha"
                }`}
              >
                <SlidersHorizontal size={14} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 bg-mocha text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              {filter.theme && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-mocha/10 text-mocha text-xs font-semibold rounded-full">
                  Theme: {filter.theme.replace("-theme", "").replace(/-/g, " ")}
                  <button onClick={() => setFilter({ ...filter, theme: null })} className="hover:text-mocha-dark cursor-pointer"><X size={12} /></button>
                </span>
              )}
              {filter.category && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-mocha/10 text-mocha text-xs font-semibold rounded-full">
                  {placeholderCategories.find((c) => c.slug === filter.category)?.name}
                  <button onClick={() => setFilter({ ...filter, category: null })} className="hover:text-mocha-dark cursor-pointer"><X size={12} /></button>
                </span>
              )}
              <button onClick={clearFilters} className="text-xs text-text-muted hover:text-mocha underline cursor-pointer">
                Clear all
              </button>
            </div>
          )}

          {/* Results count */}
          <p className="mt-6 text-sm text-text-muted">
            Showing <span className="font-semibold text-charcoal">{filteredProducts.length}</span> products
          </p>

          {/* Product Grid */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredProducts.map((product, i) => (
              <ScrollReveal key={product.id} delay={i * 50}>
                <ProductCard product={product} />
              </ScrollReveal>
            ))}
          </div>

          {/* Empty State */}
          {filteredProducts.length === 0 && (
            <div className="mt-16 text-center py-20">
              <div className="w-20 h-20 rounded-full bg-cream-dark mx-auto flex items-center justify-center mb-6">
                <Search size={32} className="text-text-light" />
              </div>
              <h3 className="font-display text-2xl font-semibold text-charcoal mb-2">
                No products found
              </h3>
              <p className="text-text-muted text-sm mb-6">
                Try adjusting your filters or search terms
              </p>
              <button onClick={clearFilters} className="btn-outline px-8 py-3 text-sm cursor-pointer">
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <WhatsAppFAB />
    </>
  );
}
