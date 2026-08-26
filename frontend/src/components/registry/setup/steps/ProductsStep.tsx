"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, Link as LinkIcon, Loader2, Package, Plus, Search, Trash2, Image as ImageIcon } from "lucide-react";
import * as shopApi from "@/lib/shop-api";
import { friendlyAuthError } from "@/lib/customer-auth-api";
import { formatPaise } from "@/lib/shop-types";
import type { Product, ExtractedProductDto } from "@/lib/shop-types";
import { SafeGiftImage } from "@/components/registry/SafeGiftImage";
import type { StepProps } from "../types";

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-border-light bg-surface text-charcoal text-sm placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-mocha/30 focus:border-mocha transition-all";

function ExternalLinkForm({ registryId, onAdded }: { registryId: string; onAdded: () => void }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const [storeName, setStoreName] = useState("");
  
  const [error, setError] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fetched, setFetched] = useState(false);

  const handleFetch = async () => {
    if (!url.trim()) {
      setError("Please paste a product URL first.");
      return;
    }
    setError("");
    setIsFetching(true);
    try {
      const extracted = await shopApi.extractRegistryProduct(url.trim());
      if (extracted.title) setTitle(extracted.title);
      if (extracted.image) setImage(extracted.image);
      if (extracted.priceInPaise) setPrice((extracted.priceInPaise / 100).toString());
      if (extracted.storeName) setStoreName(extracted.storeName);
      setFetched(true);
    } catch (err) {
      setError(friendlyAuthError(err) || "Could not fetch details. Please fill them manually.");
      setFetched(true); // Still show the manual form
    } finally {
      setIsFetching(false);
    }
  };

  const submit = async () => {
    if (!title.trim() && !url.trim()) {
      setError("Provide at least a title or a product URL");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await shopApi.addRegistryItem(registryId, {
        sourceType: "EXTERNAL_LINK",
        externalUrl: url.trim() || undefined,
        manualTitle: title.trim() || undefined,
        manualImageUrl: image.trim() || undefined,
        manualPriceInPaise: price ? Math.round(parseFloat(price) * 100) : undefined,
        storeName: storeName.trim() || undefined,
        quantityDesired: 1,
      });
      setUrl("");
      setTitle("");
      setPrice("");
      setImage("");
      setStoreName("");
      setFetched(false);
      onAdded();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-cream/50 rounded-2xl border border-border-light p-5 space-y-4 shadow-sm">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold text-charcoal flex items-center gap-1.5"><LinkIcon size={14} className="text-mocha" /> Link a gift from another store</p>
        <p className="text-xs text-text-muted leading-relaxed">Paste a product URL and we'll automatically fetch its details for your registry.</p>
      </div>
      
      {error && <p className="text-xs text-red-600 font-medium px-3 py-2 bg-red-50 rounded-lg">{error}</p>}
      
      <div className="flex gap-2">
        <input 
          className={`${inputClass} flex-1`} 
          value={url} 
          onChange={(e) => {
            setUrl(e.target.value);
            setFetched(false); // Reset form if URL changes
          }} 
          placeholder="https://example.com/product" 
        />
        <button
          type="button"
          onClick={() => void handleFetch()}
          disabled={isFetching || !url.trim()}
          className="btn-primary px-6 py-3 text-xs font-bold uppercase tracking-wider disabled:opacity-60 shrink-0"
        >
          {isFetching ? <Loader2 size={14} className="animate-spin" /> : "Fetch"}
        </button>
      </div>

      {fetched && (
        <div className="space-y-3 pt-3 border-t border-border-light/60 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-[80px_1fr] gap-4">
            <div className="aspect-square bg-white rounded-xl border border-border-light overflow-hidden flex items-center justify-center shrink-0">
               {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt="Preview" className="w-full h-full object-cover" />
               ) : (
                  <ImageIcon size={20} className="text-text-light" />
               )}
            </div>
            <div className="space-y-3">
              <input className={`${inputClass} py-2`} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Product title" />
              <div className="flex gap-3">
                <input className={`${inputClass} py-2`} type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price (₹)" />
                <input className={`${inputClass} py-2`} value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Store Name" />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={isSaving || (!title.trim() && !url.trim())}
            className="w-full btn-outline py-3 text-xs font-bold uppercase tracking-wider disabled:opacity-60 bg-white hover:bg-cream mt-2 shadow-sm"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Add to Registry"}
          </button>
        </div>
      )}
    </div>
  );
}

export function ProductsStep({ registry, onUpdated, goNext, goBack, refresh }: StepProps) {
  const [tab, setTab] = useState<"shop" | "external">("shop");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(true); // default true for initial load
  const [searched, setSearched] = useState(false);
  
  // Optimistic UI state
  const [optimisticAdds, setOptimisticAdds] = useState<Set<string>>(new Set());
  const [optimisticRemoves, setOptimisticRemoves] = useState<Set<string>>(new Set());
  
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const addedProductIds = new Set(
    registry.items
      .map((i) => i.internalProductId)
      .filter(Boolean) as string[]
  );

  useEffect(() => {
    let cancelled = false;
    
    const fetchProducts = async () => {
      setIsSearching(true);
      try {
        const result = await shopApi.listProducts({ search: search.trim() || undefined, pageSize: 12 });
        if (!cancelled) {
          setResults(result.items);
          setSearched(true);
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    };
    
    // minimal debounce for fast typing
    const timer = setTimeout(fetchProducts, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  const addProduct = async (product: Product) => {
    // Optimistic update
    setOptimisticAdds(new Set(optimisticAdds).add(product.id));
    setError("");
    
    try {
      await shopApi.addRegistryItem(registry.id, { sourceType: "INTERNAL_PRODUCT", internalProductId: product.id, quantityDesired: 1 });
      await refresh();
    } catch (err) {
      setError(friendlyAuthError(err));
      // Revert on fail
      const nextAdds = new Set(optimisticAdds);
      nextAdds.delete(product.id);
      setOptimisticAdds(nextAdds);
    }
  };

  const removeItem = async (itemId: string, productId?: string) => {
    // Optimistic update
    setOptimisticRemoves(new Set(optimisticRemoves).add(itemId));
    if (productId) {
      const nextAdds = new Set(optimisticAdds);
      nextAdds.delete(productId);
      setOptimisticAdds(nextAdds);
    }
    
    try {
      await shopApi.deleteRegistryItem(registry.id, itemId);
      await refresh();
    } catch (err) {
      setError(friendlyAuthError(err));
      // Revert on fail
      const nextRemoves = new Set(optimisticRemoves);
      nextRemoves.delete(itemId);
      setOptimisticRemoves(nextRemoves);
      if (productId) {
        setOptimisticAdds(new Set(optimisticAdds).add(productId));
      }
    }
  };

  const activeItems = registry.items.filter(i => !optimisticRemoves.has(i.id));

  return (
    <div className="animate-step-in space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-mocha">Step 3 of 4</p>
        <h1 className="font-display text-2xl font-bold text-charcoal mt-1">Add gifts to your registry</h1>
        <p className="text-text-muted text-sm mt-1">
          Search our shop below, or link a gift from any other store. Add as many as you like.
        </p>
      </div>

      {error && <div role="alert" className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium transition-all">{error}</div>}

      <div className="flex gap-2 bg-cream p-1 rounded-xl w-fit">
        <button type="button" onClick={() => setTab("shop")} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-all ${tab === "shop" ? "bg-mocha text-white shadow-sm" : "text-text-muted hover:bg-cream"}`}>
          <Package size={12} className="inline mr-1.5 -mt-0.5" /> Our shop
        </button>
        <button type="button" onClick={() => setTab("external")} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-all ${tab === "external" ? "bg-mocha text-white shadow-sm" : "text-text-muted hover:bg-cream"}`}>
          <LinkIcon size={12} className="inline mr-1.5 -mt-0.5" /> External store
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1 w-full space-y-4">
          {tab === "shop" ? (
            <div className="space-y-4">
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light" />
                <input className={`${inputClass} pl-11`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products by name…" aria-label="Search products" />
              </div>

              {isSearching ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="rounded-2xl border border-border-light bg-surface overflow-hidden">
                      <div className="aspect-square bg-cream/50 animate-pulse" />
                      <div className="p-3 space-y-2">
                        <div className="h-4 bg-cream animate-pulse rounded w-3/4" />
                        <div className="h-3 bg-cream animate-pulse rounded w-1/2" />
                        <div className="h-8 bg-cream animate-pulse rounded-lg w-full mt-2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : results.length === 0 ? (
                <div className="text-center py-12 bg-surface rounded-2xl border border-dashed border-border-light">
                  <Search size={28} className="mx-auto text-text-light mb-3" />
                  <p className="text-sm text-text-muted">{searched ? "No products match your search." : "Start typing to find products."}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {results.map((product) => {
                    const effectivelyAdded = addedProductIds.has(product.id) || optimisticAdds.has(product.id);
                    
                    return (
                      <div key={product.id} className={`group relative rounded-2xl border overflow-hidden bg-surface transition-all ${effectivelyAdded ? "border-mocha ring-2 ring-mocha/20" : "border-border-light hover:border-mocha/50"}`}>
                        <div className="relative aspect-square bg-cream overflow-hidden">
                          <SafeGiftImage src={product.images[0]?.media.url} alt={product.title} />
                          {effectivelyAdded && (
                            <div className="absolute inset-0 bg-white/40 flex items-center justify-center backdrop-blur-[1px]">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-mocha text-white shadow-lg animate-scale-in">
                                <Check size={20} strokeWidth={3} />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider line-clamp-1 mb-1">{product.categories?.[0]?.name || "Gift"}</p>
                          <p className="text-sm font-bold text-charcoal line-clamp-1 mb-0.5">{product.title}</p>
                          <p className="text-xs text-mocha font-semibold">{formatPaise(product.priceInPaise)}</p>
                          <button
                            type="button"
                            onClick={() => (effectivelyAdded ? undefined : void addProduct(product))}
                            className={`mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                              effectivelyAdded ? "bg-mocha/10 text-mocha cursor-default" : "bg-mocha text-white hover:bg-mocha-dark cursor-pointer shadow-sm hover:shadow"
                            }`}
                          >
                            {effectivelyAdded ? <><Check size={12} /> Added</> : <><Plus size={12} /> Add</>}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <ExternalLinkForm registryId={registry.id} onAdded={() => void refresh()} />
          )}
        </div>

        {/* Selected Items Sidebar */}
        <div className="w-full md:w-72 shrink-0 space-y-4">
          <div className="bg-surface rounded-2xl border border-border-light p-4 sticky top-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-charcoal mb-3">
              Selected ({activeItems.length})
            </h2>
            {activeItems.length === 0 ? (
              <p className="text-xs text-text-muted py-4 text-center border border-dashed border-border-light rounded-xl">No gifts selected yet.</p>
            ) : (
              <ul className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {activeItems.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 bg-cream/50 rounded-xl p-2 border border-transparent hover:border-border-light transition-colors group">
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white"><SafeGiftImage src={item.image?.url} alt={item.title} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-charcoal line-clamp-1">{item.title}</p>
                      <p className="text-[10px] text-text-muted">{item.sourceType === "EXTERNAL_LINK" ? item.storeName || "External" : "Vaibhav"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeItem(item.id, item.internalProductId || undefined)}
                      aria-label={`Remove ${item.title}`}
                      className="shrink-0 w-6 h-6 flex items-center justify-center text-text-light hover:text-red-500 hover:bg-red-50 rounded-md cursor-pointer transition-colors opacity-50 group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-border-light">
        <button type="button" onClick={goBack} className="text-sm font-semibold text-text-muted hover:text-charcoal cursor-pointer">
          Back
        </button>
        <button type="button" onClick={goNext} className="btn-primary px-8 py-3 text-sm font-bold uppercase tracking-wider">
          Continue
        </button>
      </div>
    </div>
  );
}
