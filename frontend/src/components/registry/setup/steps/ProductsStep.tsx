"use client";

import { useEffect, useState } from "react";
import { Check, Link as LinkIcon, Loader2, Package, Plus, Search, Trash2 } from "lucide-react";
import * as shopApi from "@/lib/shop-api";
import { friendlyAuthError } from "@/lib/customer-auth-api";
import { formatPaise } from "@/lib/shop-types";
import type { Product } from "@/lib/shop-types";
import { SafeGiftImage } from "@/components/registry/SafeGiftImage";
import type { StepProps } from "../types";

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-border-light bg-surface text-charcoal text-sm placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-mocha/30 focus:border-mocha transition-all";

function ExternalLinkForm({ registryId, onAdded }: { registryId: string; onAdded: () => void }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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
        quantityDesired: 1,
      });
      setUrl("");
      setTitle("");
      onAdded();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-cream/50 rounded-2xl border border-border-light p-4 space-y-3">
      <p className="text-xs font-bold text-charcoal flex items-center gap-1.5"><LinkIcon size={13} className="text-mocha" /> Link a gift from another store</p>
      {error && <p className="text-[11px] text-red-600 font-medium">{error}</p>}
      <input className={inputClass} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a product URL (optional)" />
      <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Product title" />
      <button
        type="button"
        onClick={() => void submit()}
        disabled={isSaving}
        className="btn-outline px-4 py-2 text-xs font-bold uppercase tracking-wider disabled:opacity-60"
      >
        {isSaving ? <Loader2 size={14} className="animate-spin" /> : "Add gift"}
      </button>
    </div>
  );
}

export function ProductsStep({ registry, goNext, goBack, refresh }: StepProps) {
  const [tab, setTab] = useState<"shop" | "external">("shop");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const addedProductIds = new Set(registry.items.map((i) => i.internalProductId).filter(Boolean) as string[]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
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
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  const addProduct = async (product: Product) => {
    setBusyId(product.id);
    setError("");
    try {
      await shopApi.addRegistryItem(registry.id, { sourceType: "INTERNAL_PRODUCT", internalProductId: product.id, quantityDesired: 1 });
      await refresh();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusyId(null);
    }
  };

  const removeItem = async (itemId: string) => {
    setBusyId(itemId);
    try {
      await shopApi.deleteRegistryItem(registry.id, itemId);
      await refresh();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="animate-step-in space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-mocha">Step 3 of 6</p>
        <h1 className="font-display text-2xl font-bold text-charcoal mt-1">Add gifts to your registry</h1>
        <p className="text-text-muted text-sm mt-1">
          Search our shop below, or link a gift from any other store. Add as many as you like — you can edit this later.
        </p>
      </div>

      {error && <div role="alert" className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">{error}</div>}

      <div className="flex gap-2 bg-cream p-1 rounded-xl w-fit">
        <button type="button" onClick={() => setTab("shop")} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer ${tab === "shop" ? "bg-mocha text-white" : "text-text-muted"}`}>
          <Package size={12} className="inline mr-1.5 -mt-0.5" /> Our shop
        </button>
        <button type="button" onClick={() => setTab("external")} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer ${tab === "external" ? "bg-mocha text-white" : "text-text-muted"}`}>
          <LinkIcon size={12} className="inline mr-1.5 -mt-0.5" /> External store
        </button>
      </div>

      {tab === "shop" ? (
        <div className="space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light" />
            <input className={`${inputClass} pl-11`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products by name…" aria-label="Search products" />
          </div>

          {isSearching ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="aspect-[3/4] rounded-2xl bg-surface animate-pulse" />)}
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 bg-surface rounded-2xl border border-dashed border-border-light">
              <Search size={28} className="mx-auto text-text-light mb-3" />
              <p className="text-sm text-text-muted">{searched ? "No products match your search." : "Start typing to find products."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {results.map((product) => {
                const added = addedProductIds.has(product.id);
                const isBusy = busyId === product.id;
                return (
                  <div key={product.id} className={`relative rounded-2xl border overflow-hidden bg-surface transition-all ${added ? "border-mocha ring-2 ring-mocha/20" : "border-border-light"}`}>
                    <div className="relative aspect-square bg-cream">
                      <SafeGiftImage src={product.images[0]?.media.url} alt={product.title} />
                      {added && (
                        <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-mocha text-white">
                          <Check size={13} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold text-charcoal line-clamp-2 min-h-[2rem]">{product.title}</p>
                      <p className="text-xs text-text-muted mt-1">{formatPaise(product.priceInPaise)}</p>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => (added ? undefined : void addProduct(product))}
                        className={`mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-60 ${
                          added ? "bg-cream text-text-muted cursor-default" : "bg-mocha text-white hover:bg-mocha-dark cursor-pointer"
                        }`}
                      >
                        {isBusy ? <Loader2 size={12} className="animate-spin" /> : added ? <><Check size={12} /> Added</> : <><Plus size={12} /> Add to registry</>}
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

      <section className="bg-cream/50 rounded-2xl border border-border-light p-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-charcoal mb-3">
          Selected for your registry ({registry.items.length})
        </h2>
        {registry.items.length === 0 ? (
          <p className="text-xs text-text-muted">Nothing added yet — pick a few gifts above to continue.</p>
        ) : (
          <ul className="space-y-2">
            {registry.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 bg-surface rounded-xl p-2.5 border border-border-light">
                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0"><SafeGiftImage src={item.image?.url} alt={item.title} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-charcoal line-clamp-1">{item.title}</p>
                  <p className="text-[11px] text-text-muted">{item.sourceType === "EXTERNAL_LINK" ? item.storeName || "External store" : "Vaibhav Celebrations"}</p>
                </div>
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => void removeItem(item.id)}
                  aria-label={`Remove ${item.title}`}
                  className="shrink-0 text-text-light hover:text-red-500 cursor-pointer disabled:opacity-50"
                >
                  {busyId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex items-center justify-between pt-2">
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
