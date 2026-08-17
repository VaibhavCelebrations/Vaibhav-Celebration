"use client";

import { useState } from "react";
import { Lock, Gift, Loader2, Check, ShoppingBag, Copy, ExternalLink, X, Calendar, MapPin } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { FooterClient } from "@/components/layout/FooterClient";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";
import { useToast } from "@/components/ui/Toast";
import * as shopApi from "@/lib/shop-api";
import { formatPaise } from "@/lib/shop-types";
import type { PublicRegistryDto, GiftRegistryItemDto } from "@/lib/shop-types";
import { ApiClientError } from "@/lib/api-client";
import { SafeGiftImage } from "@/components/registry/SafeGiftImage";

export function RegistryGuestView({ code, initial, needsPassword }: { code: string; initial: PublicRegistryDto | null; needsPassword: boolean }) {
  const { isAuthenticated, openAuthModal, user } = useAuth();
  const { addItem, openCart } = useCart();
  const { push } = useToast();
  const [password, setPassword] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState("");
  const [registry, setRegistry] = useState<PublicRegistryDto | null>(initial);
  const [qtyByItem, setQtyByItem] = useState<Record<string, number>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmItem, setConfirmItem] = useState<GiftRegistryItemDto | null>(null);
  const [activeItem, setActiveItem] = useState<GiftRegistryItemDto | null>(null);
  const [guestName, setGuestName] = useState("");
  const [copied, setCopied] = useState(false);
  const [showAddress, setShowAddress] = useState(false);

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-border-light bg-surface text-charcoal text-sm placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-mocha/30 focus:border-mocha";

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError("");
    setIsUnlocking(true);
    try {
      setRegistry(await shopApi.getPublicRegistry(code, password));
    } catch (err) {
      setUnlockError(err instanceof ApiClientError ? err.message : "Could not open this registry.");
    } finally {
      setIsUnlocking(false);
    }
  };

  const copyAddress = async () => {
    if (!registry?.shippingAddress) return;
    await navigator.clipboard.writeText(registry.shippingAddress.formatted);
    setCopied(true);
    push("Address copied!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const addInternalGift = async (item: GiftRegistryItemDto) => {
    if (!item.internalProductId) return;
    const qty = Math.min(qtyByItem[item.id] ?? 1, item.available);
    if (qty < 1) return;
    const run = async () => {
      setBusyId(item.id);
      try {
        await addItem(item.internalProductId!, qty, undefined, item.id);
        openCart();
        push("Gift added to cart — it will be delivered to the registry address", "success");
      } catch {
        /* cart context toasts */
      } finally {
        setBusyId(null);
      }
    };
    if (!isAuthenticated) {
      openAuthModal(() => void run());
      return;
    }
    await run();
  };

  const confirmExternal = async () => {
    if (!confirmItem) return;
    setBusyId(confirmItem.id);
    try {
      const updated = await shopApi.confirmExternalRegistryGift(code, confirmItem.id, {
        password: password || undefined,
        quantity: Math.min(qtyByItem[confirmItem.id] ?? 1, confirmItem.remaining),
        guestName: guestName || user?.name,
        guestEmail: user?.email,
      });
      setRegistry((prev) =>
        prev ? { ...prev, items: prev.items.map((i) => (i.id === confirmItem.id ? { ...i, ...(updated as Partial<GiftRegistryItemDto>) } : i)) } : prev,
      );
      setConfirmItem(null);
      push("Thank you — this gift is marked as purchased", "success");
    } catch (err) {
      push(err instanceof ApiClientError ? err.message : "Could not update this gift", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-36 pb-16 md:pb-24 bg-cream min-h-screen">
        <div className="max-w-5xl mx-auto px-5 md:px-10">
          {!registry ? (
            <div className="max-w-md mx-auto">
              <h1 className="font-display text-3xl font-bold text-charcoal text-center">Gift Registry</h1>
              <p className="text-text-muted text-sm text-center mt-2 mb-8">
                {needsPassword ? "Ask the host for the password to view this private registry." : "This registry is unavailable, closed, or still being prepared."}
              </p>
              {needsPassword && (
                <form onSubmit={unlock} className="bg-surface rounded-2xl border border-border-light p-8 shadow-soft space-y-4">
                  {unlockError && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">{unlockError}</div>}
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-mocha" />
                    <input type="password" className={`${inputClass} pl-11`} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Registry password" aria-label="Registry password" />
                  </div>
                  <button type="submit" disabled={isUnlocking} className="btn-primary w-full py-3.5 text-sm font-bold uppercase tracking-wider gap-2 disabled:opacity-60">
                    {isUnlocking ? <Loader2 size={16} className="animate-spin" /> : "View Registry"}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-10 items-center mb-16">
                <div className="order-2 md:order-1 flex flex-col items-center md:items-start text-center md:text-left">
                  <h1 className="font-display text-4xl md:text-6xl font-bold text-charcoal leading-tight">{registry.title}</h1>
                  
                  <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-3">
                    {registry.eventDate && (
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border-light text-sm text-charcoal bg-white shadow-sm font-medium">
                        <Calendar size={16} className="text-mocha" /> {new Date(registry.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                      </div>
                    )}
                    {registry.shippingAddress && (
                      <button type="button" onClick={() => setShowAddress(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border-light text-sm text-charcoal bg-white shadow-sm font-medium hover:border-mocha transition-colors cursor-pointer">
                        <MapPin size={16} className="text-mocha" /> Delivery Address
                      </button>
                    )}
                  </div>
                  
                  <p className="text-text-muted mt-6 max-w-lg leading-relaxed text-[15px]">
                    {registry.celebrationDetails || "Your presence is our biggest gift, but here's a little wish list if you'd like."}
                  </p>
                </div>
                {registry.coverImageUrl && (
                  <div className="order-1 md:order-2">
                    <div className="relative aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-card border-4 border-white bg-cream">
                      <SafeGiftImage src={registry.coverImageUrl} alt="" />
                    </div>
                  </div>
                )}
              </div>



              <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {registry.items.map((item) => {
                  const remaining = item.remaining;
                  return (
                    <button type="button" onClick={() => setActiveItem(item)} key={item.id} className="bg-surface rounded-2xl border border-border-light shadow-soft overflow-hidden flex flex-col text-left hover:-translate-y-1 transition-transform cursor-pointer group">
                      <div className="relative aspect-square bg-cream overflow-hidden">
                        <div className="absolute inset-0 transition-transform group-hover:scale-105 duration-500">
                          <SafeGiftImage src={item.image?.url} alt={item.title} />
                        </div>
                        {remaining <= 0 && (
                          <div className="absolute inset-0 bg-charcoal/50 flex items-center justify-center">
                            <span className="bg-white text-charcoal text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5"><Check size={14} className="text-green-600" /> Purchased</span>
                          </div>
                        )}
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-mocha">
                          {item.sourceType === "EXTERNAL_LINK" ? item.storeName || "External store" : "Vaibhav Celebrations"}
                        </p>
                        <h3 className="font-bold text-charcoal text-sm mt-1 line-clamp-2">{item.title}</h3>
                        {item.priceInPaise !== null && <p className="text-sm font-semibold mt-1">{formatPaise(item.priceInPaise)}</p>}
                        {item.quantityPurchased > 0 && remaining > 0 && (
                          <p className="text-[11px] font-semibold text-amber-700 mt-2">Partially purchased</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {registry.items.length === 0 && (
                <div className="text-center py-20">
                  <Gift size={40} className="mx-auto text-text-light mb-4" />
                  <p className="text-text-muted">No gift items have been added yet.</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <FooterClient />
      <WhatsAppFAB />

      {showAddress && registry?.shippingAddress && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-charcoal/60 p-4" onClick={() => setShowAddress(false)}>
          <div className="bg-surface rounded-[2rem] p-8 max-w-md w-full relative" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setShowAddress(false)} className="absolute top-6 right-6 text-text-light hover:text-charcoal"><X size={20} /></button>
            <h2 className="font-display text-2xl font-bold text-charcoal mb-4">Delivery Address</h2>
            <p className="text-sm text-text-muted mb-4">Gifts purchased through Vaibhav Celebrations will be delivered here directly. If buying externally, please use this address for delivery.</p>
            <div className="bg-cream p-4 rounded-xl font-sans text-sm text-charcoal leading-relaxed whitespace-pre-wrap mb-6">
              {registry.shippingAddress.formatted}
            </div>
            <button type="button" onClick={() => void copyAddress()} className="btn-primary w-full py-3 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2">
              {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Address Copied!" : "Copy Address"}
            </button>
          </div>
        </div>
      )}

      {activeItem && (() => {
        const item = activeItem;
        const remaining = item.remaining;
        const available = item.available;
        const qty = Math.min(qtyByItem[item.id] ?? 1, Math.max(1, available || remaining));

        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-charcoal/60 p-4" onClick={() => { setActiveItem(null); setConfirmItem(null); }}>
            <div className="bg-surface rounded-[2rem] p-6 md:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-6">
                <p className="text-[10px] font-bold uppercase tracking-wider text-mocha">
                  {item.sourceType === "EXTERNAL_LINK" ? item.storeName || "External store" : "Vaibhav Celebrations"}
                </p>
                <button type="button" onClick={() => { setActiveItem(null); setConfirmItem(null); }} className="text-text-light hover:text-charcoal cursor-pointer"><X size={20} /></button>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-cream border border-border-light shadow-sm">
                  <SafeGiftImage src={item.image?.url} alt={item.title} />
                </div>
                <div className="flex flex-col">
                  <h2 className="font-display text-2xl font-bold text-charcoal">{item.title}</h2>
                  {item.priceInPaise !== null && <p className="text-xl font-semibold mt-2 text-charcoal">{formatPaise(item.priceInPaise)}</p>}
                  {item.description && <p className="text-sm text-text-muted mt-4">{item.description}</p>}
                  
                  <div className="mt-6 pt-6 border-t border-border-light space-y-4 flex-1 flex flex-col justify-end">
                    <p className="text-sm text-text-muted">
                      Requested {item.quantityDesired} · Purchased {item.quantityPurchased} · Remaining {remaining}
                    </p>
                    
                    {remaining > 0 ? (
                      <>
                        <label className="flex items-center justify-between text-sm text-charcoal font-semibold">
                          Quantity
                          <input
                            type="number"
                            min={1}
                            max={item.sourceType === "INTERNAL_PRODUCT" ? available : remaining}
                            value={qty}
                            onChange={(e) => setQtyByItem((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))}
                            className="w-20 px-3 py-2 rounded-xl border border-border-light text-charcoal text-center"
                          />
                        </label>

                        {item.canGiftDirectly ? (
                          <button
                            type="button"
                            onClick={() => { void addInternalGift(item); setActiveItem(null); }}
                            disabled={!item.inStock || busyId === item.id || available < 1}
                            className="btn-primary w-full py-3.5 text-sm font-bold uppercase tracking-wider gap-2 mt-4 disabled:opacity-50 cursor-pointer"
                          >
                            {busyId === item.id ? <Loader2 size={16} className="animate-spin" /> : <ShoppingBag size={16} />}
                            {!item.inStock ? "Out of Stock" : "Add gift to cart"}
                          </button>
                        ) : item.externalUrl ? (
                          <div className="mt-4 p-5 bg-cream/50 rounded-2xl border border-border-light space-y-4">
                            <ul className="text-xs text-text-muted space-y-2 list-disc list-inside leading-relaxed">
                              <li>Click the buy link below to purchase this gift from {item.storeName || "the external store"}.</li>
                              <li>After purchasing, please come back and mark it as purchased so no one else buys the same gift.</li>
                            </ul>
                            <a href={item.externalUrl} target="_blank" rel="noreferrer" className="btn-primary w-full py-3.5 text-sm font-bold uppercase tracking-wider text-center flex items-center justify-center gap-2">
                              Buy on {item.storeName || "Store"} <ExternalLink size={14} />
                            </a>
                            <button type="button" onClick={() => setConfirmItem(item)} className="w-full text-sm font-semibold text-mocha py-2 cursor-pointer mt-2 hover:underline">
                              I purchased this gift
                            </button>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-green-800 text-center text-sm font-semibold mt-4">
                        This gift has already been fully purchased!
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {confirmItem === item && (
                <div className="mt-8 p-6 bg-cream rounded-2xl border border-border-light shadow-soft">
                  <h3 className="font-display text-lg font-bold text-charcoal">Have you purchased this gift?</h3>
                  <p className="text-sm text-text-muted mt-1">This helps other guests know it is already taken.</p>
                  <input className={`${inputClass} mt-4`} value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Your name (optional)" />
                  <div className="flex gap-3 mt-4">
                    <button type="button" onClick={() => setConfirmItem(null)} className="flex-1 py-3 rounded-xl border border-border-light bg-white text-sm font-semibold hover:bg-cream transition-colors cursor-pointer">Cancel</button>
                    <button type="button" onClick={() => { void confirmExternal(); setActiveItem(null); }} disabled={busyId === confirmItem.id} className="btn-primary flex-1 py-3 text-sm cursor-pointer">Confirm Purchase</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </>
  );
}
