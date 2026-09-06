"use client";

import Image from "next/image";
import Link from "next/link";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X, Loader2, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { FooterClient } from "@/components/layout/FooterClient";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ProductCard } from "@/components/ecom/ProductCard";
import { useCatalog } from "@/context/catalog-context";
import * as shopApi from "@/lib/shop-api";
import type { GiftFilter, Product, ProductCategory, ProductCollection } from "@/lib/shop-types";

const sortOptions = [
  { value: "newest", label: "Newest First" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
] as const;

const PAGE_SIZE = 12;

function GiftsPageContent() {
  const { themes } = useCatalog();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [collections, setCollections] = useState<ProductCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const [filter, setFilter] = useState<GiftFilter>({
    theme: searchParams.get("theme"),
    category: searchParams.get("category"),
    search: "",
    sortBy: "newest",
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [productsResult, categoriesResult, collectionsResult] = await Promise.allSettled([
          shopApi.listProducts({ pageSize: 500, sort: "newest" }),
          shopApi.listProductCategories(),
          shopApi.listProductCollections(),
        ]);
        if (!cancelled) {
          if (productsResult.status === "fulfilled") {
            setProducts(productsResult.value.items ?? []);
          } else {
            setProducts([]);
            setLoadError("Could not load shop products. Please refresh and try again.");
          }
          setCategories(categoriesResult.status === "fulfilled" ? (categoriesResult.value ?? []) : []);
          setCollections(collectionsResult.status === "fulfilled" ? (collectionsResult.value ?? []) : []);
        }
      } catch {
        if (!cancelled) {
          setProducts([]);
          setCategories([]);
          setCollections([]);
          setLoadError("Could not load shop products. Please refresh and try again.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => p.isActive);

    if (filter.theme) {
      result = result.filter((p) => Array.isArray(p.themes) && p.themes.some((t) => t.slug === filter.theme));
    }

    if (filter.category === "personalized") {
      result = result.filter(
        (p) => p.personalizationEnabled || (p.personalizationFields?.length ?? 0) > 0,
      );
    } else if (filter.category) {
      result = result.filter((p) => Array.isArray(p.categories) && p.categories.some((c) => c.slug === filter.category));
    }

    if (filter.search.trim()) {
      const q = filter.search.toLowerCase();
      result = result.filter((p) => {
        const title = typeof p.title === "string" ? p.title : "";
        const description = typeof p.description === "string" ? p.description : "";
        const themeMatch = Array.isArray(p.themes) && p.themes.some((t) => t.title?.toLowerCase().includes(q));
        return title.toLowerCase().includes(q) || description.toLowerCase().includes(q) || themeMatch;
      });
    }

    switch (filter.sortBy) {
      case "price_asc":
        result = [...result].sort((a, b) => a.priceInPaise - b.priceInPaise);
        break;
      case "price_desc":
        result = [...result].sort((a, b) => b.priceInPaise - a.priceInPaise);
        break;
      case "newest":
      default:
        result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return result;
  }, [products, filter]);

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const activeFilterCount = [filter.theme, filter.category].filter(Boolean).length;

  const clearFilters = () => {
    setFilter({ theme: null, category: null, search: "", sortBy: "newest" });
  };

  const sidebarContentNode = (
    <div className="space-y-8">
      {/* Search */}
      <div>
        <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider mb-3">Search</h4>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" />
          <input
            type="text"
            placeholder="Search gifts..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-light bg-surface text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-mocha/30 focus:border-mocha transition-all"
          />
          {filter.search && (
            <button
              onClick={() => setFilter({ ...filter, search: "" })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-charcoal cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Categories */}
      <div>
        <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider mb-3">Categories</h4>
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => setFilter({ ...filter, category: null })}
            className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all text-left ${
              !filter.category ? "bg-mocha text-white font-semibold shadow-md shadow-mocha/20" : "text-charcoal hover:bg-cream-dark"
            }`}
          >
            All Products
            {!filter.category && <Check size={14} />}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter({ ...filter, category: filter.category === cat.slug ? null : cat.slug })}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all text-left ${
                filter.category === cat.slug ? "bg-mocha text-white font-semibold shadow-md shadow-mocha/20" : "text-charcoal hover:bg-cream-dark"
              }`}
            >
              {cat.name}
              {filter.category === cat.slug && <Check size={14} />}
            </button>
          ))}
          {!categories.some((c) => c.slug === "personalized") && (
            <button
              onClick={() => setFilter({ ...filter, category: filter.category === "personalized" ? null : "personalized" })}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all text-left ${
                filter.category === "personalized" ? "bg-mocha text-white font-semibold shadow-md shadow-mocha/20" : "text-charcoal hover:bg-cream-dark"
              }`}
            >
              Personalized
              {filter.category === "personalized" && <Check size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Themes */}
      <div>
        <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider mb-3">Themes</h4>
        <div className="flex flex-wrap gap-2">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setFilter({ ...filter, theme: filter.theme === theme.slug ? null : theme.slug })}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
                filter.theme === theme.slug
                  ? "bg-charcoal border-charcoal text-white"
                  : "bg-surface border-border-light text-charcoal hover:border-charcoal hover:bg-cream-dark"
              }`}
            >
              {theme.title.replace(/ Theme| Birthday| Celebration/g, "")}
            </button>
          ))}
        </div>
      </div>
      
      {activeFilterCount > 0 && (
        <div className="pt-4 border-t border-border-light">
          <button onClick={clearFilters} className="text-sm font-semibold text-mocha hover:text-mocha-dark transition-colors cursor-pointer">
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-36 pb-16 md:pb-24 bg-cream min-h-screen">
        <div className="max-w-[1400px] mx-auto px-5 md:px-10">
          
          <ScrollReveal>
            <SectionHeader
              eyebrow="Shop"
              title="The Celebration Shop"
              description="Thoughtfully curated gifts, activity kits, and personalized keepsakes for your little one's celebration."
            />
          </ScrollReveal>

          {/* Collections Banner */}
          {!isLoading && (collections.length > 0 || categories.length > 0) && (
            <div className="mt-8 mb-4">
              <h3 className="font-serif text-2xl text-charcoal mb-4">Shop by Category</h3>
              <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
                
                {/* Visual Category Filters */}
                {categories.map(cat => (
                  <button
                    key={`cat-${cat.id}`}
                    onClick={() => {
                      setFilter(prev => ({ ...prev, category: prev.category === cat.slug ? null : cat.slug }));
                      const shopEl = document.getElementById("shop-grid");
                      if (shopEl) shopEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className={`group relative flex-none w-64 h-36 rounded-2xl overflow-hidden snap-start shrink-0 cursor-pointer border ${filter.category === cat.slug ? "border-mocha border-2" : "border-border-light"}`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-cream-dark to-mocha/10" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-5 bg-white/40 backdrop-blur-[2px] group-hover:bg-white/20 transition-all">
                      <h4 className="text-charcoal font-display font-bold text-lg text-center drop-shadow-sm">{cat.name}</h4>
                      {filter.category === cat.slug && (
                        <span className="mt-2 text-xs font-bold uppercase tracking-wider text-mocha bg-white px-3 py-1 rounded-full shadow-sm">Selected</span>
                      )}
                    </div>
                  </button>
                ))}

                {/* Collections */}
                {collections.filter(c => c.isActive).map(c => (
                  <Link 
                    key={`col-${c.id}`} 
                    href={`/gifts/collection/${c.slug}`}
                    className="group relative flex-none w-64 h-36 rounded-2xl overflow-hidden snap-start shrink-0 bg-white border border-border-light shadow-sm hover:shadow-md transition-shadow"
                  >
                    {c.heroImage?.url ? (
                      <div className="absolute inset-0 flex items-center justify-center p-4">
                        <Image 
                          src={c.heroImage.url} 
                          alt={c.title}
                          fill
                          className="object-contain transition-transform duration-700 group-hover:scale-105 p-2"
                        />
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-charcoal/80" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/20 to-transparent flex flex-col justify-end p-5">
                      <h4 className="text-white font-display font-bold text-lg drop-shadow-md">{c.title}</h4>
                      <p className="text-white/90 text-xs font-medium uppercase tracking-wider mt-1">{c.productCount} Products</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div id="shop-grid" className="mt-12 flex flex-col lg:flex-row gap-8 lg:gap-12">
            
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-72 shrink-0">
              <div className="sticky top-32 bg-white/50 backdrop-blur-md p-6 rounded-3xl border border-border-light shadow-sm">
                {sidebarContentNode}
              </div>
            </aside>

            {/* Mobile Filters Modal */}
            {showFilters && (
              <div className="fixed inset-0 z-50 flex lg:hidden">
                <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm" onClick={() => setShowFilters(false)} />
                <div className="relative w-[85vw] max-w-sm h-full bg-cream p-6 overflow-y-auto shadow-2xl flex flex-col">
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-border-light">
                    <h3 className="font-display text-xl font-bold text-charcoal">Filters</h3>
                    <button onClick={() => setShowFilters(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface text-charcoal hover:bg-cream-dark transition-colors cursor-pointer">
                      <X size={18} />
                    </button>
                  </div>
                  {sidebarContentNode}
                  <div className="mt-auto pt-8">
                    <button onClick={() => setShowFilters(false)} className="btn-primary w-full py-3 text-sm cursor-pointer">
                      Apply Filters
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 min-w-0">
              
              {/* Top Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-border-light">
                <div className="text-sm text-text-muted">
                  {!isLoading && (
                    <>Showing <span className="font-semibold text-charcoal">{filteredProducts.length}</span> products</>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setShowFilters(true)}
                    className="lg:hidden flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl border border-border-light bg-surface text-sm font-bold text-charcoal hover:border-mocha transition-colors cursor-pointer"
                  >
                    <SlidersHorizontal size={16} />
                    Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                  </button>

                  <select
                    value={filter.sortBy}
                    onChange={(e) => setFilter({ ...filter, sortBy: e.target.value as GiftFilter["sortBy"] })}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-border-light bg-surface text-sm font-semibold text-charcoal focus:outline-none focus:ring-2 focus:ring-mocha/20 cursor-pointer"
                  >
                    {sortOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="flex justify-center py-32">
                  <Loader2 size={32} className="animate-spin text-mocha" />
                </div>
              )}

              {!isLoading && loadError && (
                <div className="text-center py-16 bg-white/40 rounded-3xl border border-red-100">
                  <h3 className="font-display text-xl font-bold text-charcoal mb-2">Shop is temporarily unavailable</h3>
                  <p className="text-text-muted text-sm mb-6">{loadError}</p>
                  <button onClick={() => window.location.reload()} className="btn-outline px-6 py-2.5 text-sm cursor-pointer">
                    Retry
                  </button>
                </div>
              )}

              {/* Product Grid */}
              {!isLoading && !loadError && (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {paginatedProducts.map((product, i) => (
                    <ScrollReveal key={product.id} delay={(i % 12) * 50}>
                      <ProductCard product={product} />
                    </ScrollReveal>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!isLoading && !loadError && filteredProducts.length === 0 && (
                <div className="text-center py-24 bg-white/40 rounded-3xl border border-border-light mt-8">
                  <div className="w-16 h-16 rounded-full bg-cream-dark mx-auto flex items-center justify-center mb-6">
                    <Search size={24} className="text-text-light" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-charcoal mb-2">
                    No products found
                  </h3>
                  <p className="text-text-muted text-sm mb-6">
                    Try adjusting your filters or search terms
                  </p>
                  <button onClick={clearFilters} className="btn-outline px-6 py-2.5 text-sm cursor-pointer">
                    Clear All Filters
                  </button>
                </div>
              )}

              {/* Pagination */}
              {!isLoading && totalPages > 1 && (
                <div className="mt-16 flex items-center justify-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage(p => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-full border border-border-light bg-surface text-charcoal hover:bg-cream-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  
                  <div className="flex items-center gap-1 mx-2">
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const page = i + 1;
                      // Simple pagination truncation logic
                      if (totalPages > 7 && page !== 1 && page !== totalPages && Math.abs(page - currentPage) > 1) {
                        if (page === 2 || page === totalPages - 1) return <span key={page} className="px-1 text-text-light">...</span>;
                        return null;
                      }
                      
                      return (
                        <button
                          key={page}
                          onClick={() => {
                            setCurrentPage(page);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold transition-colors cursor-pointer ${
                            currentPage === page 
                              ? "bg-mocha text-white shadow-md shadow-mocha/20" 
                              : "text-charcoal hover:bg-cream-dark"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      setCurrentPage(p => Math.min(totalPages, p + 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-full border border-border-light bg-surface text-charcoal hover:bg-cream-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </main>
      <FooterClient />
      <WhatsAppFAB />
    </>
  );
}

export default function GiftsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream flex items-center justify-center"><Loader2 size={32} className="animate-spin text-mocha" /></div>}>
      <GiftsPageContent />
    </Suspense>
  );
}
