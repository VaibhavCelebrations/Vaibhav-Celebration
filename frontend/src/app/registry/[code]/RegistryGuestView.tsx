"use client";

import { useState } from "react";
import { Lock, Gift, Loader2, Check, ShoppingBag, Copy, ExternalLink } from "lucide-react";
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
  const [guestName, setGuestName] = useState("");
  const [copied, setCopied] = useState(false);

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
              {registry.coverImageUrl && (
                <div className="relative h-48 md:h-72 rounded-[2rem] overflow-hidden mb-8">
                  <SafeGiftImage src={registry.coverImageUrl} alt="" />
                </div>
              )}
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-mocha mb-2">Gift Registry</p>
              <h1 className="font-display text-3xl md:text-5xl font-bold text-charcoal">{registry.title}</h1>
              <p className="text-text-muted mt-3 max-w-2xl">
                {registry.celebrationDetails || "Choose a gift from the list below. Vaibhav Celebrations products are delivered to the registry address."}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-charcoal">
                {registry.ownerDisplayName && <span>For {registry.ownerDisplayName}</span>}
                {registry.occasion && <span>· {registry.occasion}</span>}
                {registry.eventDate && <span>· {new Date(registry.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>}
              </div>

              {registry.shippingAddress && (
                <section className="mt-8 bg-surface rounded-2xl border border-border-light p-6 shadow-soft">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-display text-lg font-bold text-charcoal">Gifts will be delivered to the registry address</h2>
                      <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-charcoal leading-relaxed">{registry.shippingAddress.formatted}</pre>
                    </div>
                    <button type="button" onClick={() => void copyAddress()} className="btn-outline px-4 py-2 text-xs font-bold uppercase tracking-wider shrink-0 gap-2">
                      {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Address copied!" : "Copy Address"}
                    </button>
                  </div>
                </section>
              )}

              <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {registry.items.map((item) => {
                  const remaining = item.remaining;
                  const available = item.available;
                  const qty = Math.min(qtyByItem[item.id] ?? 1, Math.max(1, available || remaining));
                  return (
                    <article key={item.id} className="bg-surface rounded-2xl border border-border-light shadow-soft overflow-hidden flex flex-col">
                      <div className="relative aspect-square bg-cream">
                        <SafeGiftImage src={item.image?.url} alt={item.title} />
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
                        <p className="text-xs text-text-muted mt-2">
                          Requested {item.quantityDesired} · Purchased {item.quantityPurchased} · Remaining {remaining}
                        </p>
                        {item.quantityPurchased > 0 && remaining > 0 && (
                          <p className="text-[11px] font-semibold text-amber-700 mt-1">Partially purchased</p>
                        )}
                        <div className="mt-auto pt-3 space-y-2">
                          {remaining > 0 && (
                            <label className="flex items-center justify-between text-xs text-text-muted">
                              Quantity
                              <input
                                type="number"
                                min={1}
                                max={item.sourceType === "INTERNAL_PRODUCT" ? available : remaining}
                                value={qty}
                                onChange={(e) => setQtyByItem((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))}
                                className="w-16 px-2 py-1 rounded-lg border border-border-light text-charcoal"
                              />
                            </label>
                          )}
                          {item.canGiftDirectly && remaining > 0 ? (
                            <button
                              type="button"
                              onClick={() => void addInternalGift(item)}
                              disabled={!item.inStock || busyId === item.id || available < 1}
                              className="btn-primary w-full py-2.5 text-xs font-bold uppercase tracking-wider gap-2 disabled:opacity-50 cursor-pointer"
                            >
                              {busyId === item.id ? <Loader2 size={14} className="animate-spin" /> : <ShoppingBag size={14} />}
                              {!item.inStock ? "Out of Stock" : "Add gift to cart"}
                            </button>
                          ) : item.externalUrl && remaining > 0 ? (
                            <>
                              <a href={item.externalUrl} target="_blank" rel="noreferrer" className="btn-outline w-full py-2.5 text-xs font-bold uppercase tracking-wider text-center flex items-center justify-center gap-2">
                                View Product on Store <ExternalLink size={12} />
                              </a>
                              <button type="button" onClick={() => setConfirmItem(item)} className="w-full text-xs font-semibold text-mocha py-2 cursor-pointer">
                                I purchased this gift
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </article>
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

      {confirmItem && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-charcoal/60 p-4" onClick={() => setConfirmItem(null)}>
          <div className="bg-surface rounded-[2rem] p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-2xl font-bold text-charcoal">Have you purchased this gift?</h2>
            <p className="text-sm text-text-muted mt-2">This helps other guests know it is already taken. Purchases from external stores cannot be verified automatically.</p>
            <input className={`${inputClass} mt-4`} value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Your name (optional)" />
            <div className="flex gap-2 mt-6">
              <button type="button" onClick={() => setConfirmItem(null)} className="flex-1 py-3 rounded-xl border border-border-light text-sm font-semibold">Cancel</button>
              <button type="button" onClick={() => void confirmExternal()} disabled={busyId === confirmItem.id} className="btn-primary flex-1 py-3 text-sm">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
