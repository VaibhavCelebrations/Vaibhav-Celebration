"use client";

import { use, useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Loader2, Gift, Trash2, Copy, Check, Plus, X, Search, Link as LinkIcon, Package } from "lucide-react";
import * as shopApi from "@/lib/shop-api";
import { useToast } from "@/components/ui/Toast";
import { friendlyAuthError } from "@/lib/customer-auth-api";
import { formatPaise } from "@/lib/shop-types";
import type { GiftRegistryDetailDto, Product } from "@/lib/shop-types";

interface Props {
  params: Promise<{ id: string }>;
}

function AddItemForm({ registryId, onAdded }: { registryId: string; onAdded: () => void }) {
  const [sourceType, setSourceType] = useState<"INTERNAL_PRODUCT" | "EXTERNAL_LINK">("INTERNAL_PRODUCT");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [manualTitle, setManualTitle] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { push } = useToast();

  useEffect(() => {
    if (sourceType !== "INTERNAL_PRODUCT") return;
    const timer = setTimeout(async () => {
      if (!search.trim()) {
        setSearchResults([]);
        return;
      }
      try {
        const result = await shopApi.listProducts({ search: search.trim(), pageSize: 6 });
        setSearchResults(result.items);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, sourceType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (sourceType === "INTERNAL_PRODUCT" && !selectedProduct) {
      setError("Please search and select a product");
      return;
    }
    if (sourceType === "EXTERNAL_LINK" && !manualTitle.trim() && !externalUrl.trim()) {
      setError("Provide at least a title or a link");
      return;
    }
    setIsSubmitting(true);
    try {
      await shopApi.addRegistryItem(registryId, {
        sourceType,
        internalProductId: sourceType === "INTERNAL_PRODUCT" ? selectedProduct?.id : undefined,
        manualTitle: sourceType === "EXTERNAL_LINK" ? manualTitle.trim() || undefined : undefined,
        externalUrl: sourceType === "EXTERNAL_LINK" ? externalUrl.trim() || undefined : undefined,
        manualPriceInPaise: sourceType === "EXTERNAL_LINK" && manualPrice ? Math.round(parseFloat(manualPrice) * 100) : undefined,
      });
      setSelectedProduct(null);
      setSearch("");
      setManualTitle("");
      setExternalUrl("");
      setManualPrice("");
      push("Item added to registry", "success");
      onAdded();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-border-light bg-surface text-charcoal text-sm placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-mocha/30 focus:border-mocha transition-all";

  return (
    <form onSubmit={handleSubmit} className="bg-surface rounded-2xl border border-border-light p-6 shadow-soft space-y-4">
      <h3 className="font-display text-lg font-bold text-charcoal">Add Gift Item</h3>

      <div className="flex gap-2 bg-cream/60 p-1 rounded-xl w-fit">
        <button type="button" onClick={() => setSourceType("INTERNAL_PRODUCT")} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${sourceType === "INTERNAL_PRODUCT" ? "bg-mocha text-white" : "text-text-muted"}`}>
          <Package size={12} className="inline mr-1.5 -mt-0.5" /> Shop Product
        </button>
        <button type="button" onClick={() => setSourceType("EXTERNAL_LINK")} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${sourceType === "EXTERNAL_LINK" ? "bg-mocha text-white" : "text-text-muted"}`}>
          <LinkIcon size={12} className="inline mr-1.5 -mt-0.5" /> External Link
        </button>
      </div>

      {error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">{error}</div>}

      {sourceType === "INTERNAL_PRODUCT" ? (
        <div className="relative">
          {selectedProduct ? (
            <div className="flex items-center gap-3 p-3 bg-cream/60 rounded-xl">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                <Image src={selectedProduct.images[0]?.media.url ?? "/placeholder-product.svg"} alt={selectedProduct.title} fill className="object-cover" sizes="48px" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-charcoal line-clamp-1">{selectedProduct.title}</p>
                <p className="text-xs text-text-muted">{formatPaise(selectedProduct.priceInPaise)}</p>
              </div>
              <button type="button" onClick={() => setSelectedProduct(null)} className="text-text-light hover:text-red-500 cursor-pointer"><X size={16} /></button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light" />
                <input className={`${inputClass} pl-11`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products to add…" />
              </div>
              {searchResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-surface border border-border-light rounded-xl shadow-lg max-h-64 overflow-y-auto">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setSelectedProduct(p); setSearchResults([]); }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-cream transition-colors text-left cursor-pointer"
                    >
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
                        <Image src={p.images[0]?.media.url ?? "/placeholder-product.svg"} alt={p.title} fill className="object-cover" sizes="40px" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-charcoal line-clamp-1">{p.title}</p>
                        <p className="text-xs text-text-muted">{formatPaise(p.priceInPaise)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <input className={inputClass} value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} placeholder="Item title" />
          <input className={inputClass} value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="Link to the item (optional)" />
          <input type="number" className={inputClass} value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} placeholder="Approximate price in ₹ (optional)" />
        </div>
      )}

      <button type="submit" disabled={isSubmitting} className="btn-primary px-6 py-3 text-sm font-semibold gap-2 disabled:opacity-60">
        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Add Item
      </button>
    </form>
  );
}

export default function RegistryDetailPage({ params }: Props) {
  const { id } = use(params);
  const [registry, setRegistry] = useState<GiftRegistryDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const { push } = useToast();

  const load = useCallback(async () => {
    try {
      setRegistry(await shopApi.getMyRegistry(id));
    } catch {
      setRegistry(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const handleCopyLink = () => {
    if (!registry) return;
    navigator.clipboard?.writeText(registry.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!registry) return;
    try {
      await shopApi.deleteRegistryItem(registry.id, itemId);
      setRegistry({ ...registry, items: registry.items.filter((i) => i.id !== itemId) });
    } catch (err) {
      push(friendlyAuthError(err), "error");
    }
  };

  const handleToggleStatus = async () => {
    if (!registry) return;
    const nextStatus = registry.status === "CLOSED" ? "ACTIVE" : "CLOSED";
    try {
      const updated = await shopApi.updateMyRegistry(registry.id, { status: nextStatus });
      setRegistry({ ...registry, status: updated.status });
      push(`Registry ${nextStatus === "CLOSED" ? "closed" : "reactivated"}`, "success");
    } catch (err) {
      push(friendlyAuthError(err), "error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={28} className="animate-spin text-mocha" />
      </div>
    );
  }

  if (!registry) {
    return (
      <div className="text-center py-20">
        <h2 className="font-display text-xl font-bold text-charcoal mb-4">Registry not found</h2>
        <Link href="/account/registry" className="btn-primary px-8 py-3 text-sm">Back to Registries</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/account/registry" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-mocha font-semibold">
        <ArrowLeft size={14} /> Back to Registries
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal">{registry.childOrPersonName || `Registry ${registry.registryCode}`}</h1>
          <p className="text-text-muted text-sm mt-1 font-mono">{registry.registryCode}</p>
          {registry.celebrationDetails && <p className="text-sm text-text-muted mt-2 max-w-lg">{registry.celebrationDetails}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCopyLink} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border-light text-sm font-semibold text-charcoal hover:border-mocha transition-colors cursor-pointer">
            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />} {copied ? "Copied!" : "Copy Share Link"}
          </button>
          <button onClick={handleToggleStatus} className="px-4 py-2.5 rounded-lg border border-border-light text-sm font-semibold text-charcoal hover:border-mocha transition-colors cursor-pointer">
            {registry.status === "CLOSED" ? "Reactivate" : "Close Registry"}
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border-light p-6 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold text-charcoal">Gift Items ({registry.items.length})</h3>
          <button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-1.5 text-sm text-mocha font-semibold hover:underline cursor-pointer">
            {showAddForm ? <X size={14} /> : <Plus size={14} />} {showAddForm ? "Cancel" : "Add Item"}
          </button>
        </div>

        {showAddForm && (
          <div className="mb-6">
            <AddItemForm registryId={registry.id} onAdded={() => { setShowAddForm(false); void load(); }} />
          </div>
        )}

        {registry.items.length === 0 ? (
          <div className="text-center py-12">
            <Gift size={32} className="mx-auto text-text-light mb-3" />
            <p className="text-text-muted text-sm">No gift items added yet.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {registry.items.map((item) => (
              <div key={item.id} className="flex gap-4 p-3 bg-cream/50 rounded-xl border border-border-light">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-white">
                  {item.image ? (
                    <Image src={item.image.url} alt={item.title} fill className="object-cover" sizes="64px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Gift size={20} className="text-text-light" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-charcoal line-clamp-1">{item.title}</p>
                  {item.priceInPaise !== null && <p className="text-xs text-text-muted mt-0.5">{formatPaise(item.priceInPaise)}</p>}
                  <span className={`inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    item.status === "PURCHASED" ? "bg-green-50 text-green-700" : item.status === "RESERVED" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"
                  }`}>
                    {item.status}
                  </span>
                </div>
                <button onClick={() => void handleDeleteItem(item.id)} className="text-text-light hover:text-red-500 transition-colors cursor-pointer self-start">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
