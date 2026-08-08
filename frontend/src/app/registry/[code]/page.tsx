"use client";

import { use, useRef, useState } from "react";
import Image from "next/image";
import { Lock, Gift, Loader2, Check, X, ShoppingBag } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { FooterClient } from "@/components/layout/FooterClient";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/components/ui/Toast";
import * as shopApi from "@/lib/shop-api";
import { formatPaise } from "@/lib/shop-types";
import type { PublicRegistryDto, ShippingAddress, GiftRegistryItemDto } from "@/lib/shop-types";
import { ApiClientError } from "@/lib/api-client";
import { loadRazorpayScript, openRazorpayCheckout } from "@/lib/load-razorpay";

interface Props {
  params: Promise<{ code: string }>;
}

const EMPTY_ADDRESS: ShippingAddress = { fullName: "", line1: "", line2: "", city: "", state: "", pincode: "", country: "India" };

function GiftItemModal({
  code,
  password,
  item,
  onClose,
  onGifted,
}: {
  code: string;
  password: string;
  item: GiftRegistryItemDto;
  onClose: () => void;
  onGifted: () => void;
}) {
  const { user } = useAuth();
  const { push } = useToast();
  const [address, setAddress] = useState<ShippingAddress>({ ...EMPTY_ADDRESS, fullName: user?.name ?? "" });
  const [contactEmail, setContactEmail] = useState(user?.email ?? "");
  const [contactPhone, setContactPhone] = useState(user?.phone ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const [error, setError] = useState("");
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const inputClass = "w-full px-4 py-3 rounded-xl border border-border-light bg-surface text-charcoal text-sm placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-mocha/30 focus:border-mocha transition-all";

  function pollUntilPaid(orderCode: string) {
    setStatusLabel("Confirming payment…");
    let attempts = 0;
    pollTimer.current = setInterval(async () => {
      attempts += 1;
      try {
        const order = await shopApi.getMyOrder(orderCode);
        if (order.status === "PAID") {
          if (pollTimer.current) clearInterval(pollTimer.current);
          push("Thank you! Your gift is on its way.", "success");
          onGifted();
        } else if (attempts >= 20) {
          if (pollTimer.current) clearInterval(pollTimer.current);
          push("Payment is taking longer than expected. We'll email you once it's confirmed.", "default");
          onGifted();
        }
      } catch {
        // keep polling — transient network errors shouldn't abort confirmation
      }
    }, 2000);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!address.fullName.trim() || !address.line1.trim() || !address.city.trim() || !address.state.trim() || !address.pincode.trim() || !contactEmail.trim() || !contactPhone.trim()) {
      setError("Please fill in all required fields");
      return;
    }
    setIsSubmitting(true);
    try {
      const order = await shopApi.giftRegistryItem(code, item.id, { password, shippingAddress: address, contactEmail: contactEmail.trim(), contactPhone: contactPhone.trim() });
      const sdkReady = await loadRazorpayScript();
      if (!sdkReady) {
        setError("Could not load the payment gateway. Please check your connection and try again.");
        setIsSubmitting(false);
        return;
      }
      const opened = openRazorpayCheckout({
        key: order.razorpayKeyId,
        amount: order.totalInPaise,
        currency: "INR",
        name: "Vaibhav Celebrations",
        description: `Gift · ${item.title}`,
        order_id: order.razorpayOrderId,
        prefill: { name: address.fullName, email: contactEmail.trim(), contact: contactPhone.trim() },
        theme: { color: "#8B5E3C" },
        handler: () => pollUntilPaid(order.orderCode),
        modal: {
          ondismiss: () => {
            setIsSubmitting(false);
            setStatusLabel(null);
            push("Payment was not completed.", "default");
          },
        },
      });
      if (!opened) {
        setError("Could not open the payment gateway. Please try again.");
        setIsSubmitting(false);
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not process your gift. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-charcoal/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-lg bg-surface rounded-[2rem] shadow-2xl p-8 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-cream hover:bg-blush flex items-center justify-center text-charcoal cursor-pointer">
          <X size={16} />
        </button>
        <h2 className="font-display text-2xl font-bold text-charcoal mb-1">Gift This Item</h2>
        <p className="text-text-muted text-sm mb-6">{item.title} {item.priceInPaise && `· ${formatPaise(item.priceInPaise)}`}</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">{error}</div>}
          <input className={inputClass} value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} placeholder="Recipient's full name" />
          <input className={inputClass} value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} placeholder="Address line 1" />
          <input className={inputClass} value={address.line2 ?? ""} onChange={(e) => setAddress({ ...address, line2: e.target.value })} placeholder="Address line 2 (optional)" />
          <div className="grid grid-cols-2 gap-3">
            <input className={inputClass} value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} placeholder="City" />
            <input className={inputClass} value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} placeholder="State" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className={inputClass} value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value })} placeholder="PIN Code" />
            <input className={inputClass} value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })} placeholder="Country" />
          </div>
          <input type="email" className={inputClass} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Your email" />
          <input type="tel" className={inputClass} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Your phone number" />
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3.5 text-sm font-bold uppercase tracking-wider gap-2 mt-2 disabled:opacity-60">
            {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> {statusLabel ?? "Processing…"}</> : "Confirm & Pay"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function PublicRegistryPage({ params }: Props) {
  const { code } = use(params);
  const { isAuthenticated, openAuthModal } = useAuth();

  const [password, setPassword] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState("");
  const [registry, setRegistry] = useState<PublicRegistryDto | null>(null);
  const [giftingItem, setGiftingItem] = useState<GiftRegistryItemDto | null>(null);
  const [giftedItemIds, setGiftedItemIds] = useState<Set<string>>(new Set());

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError("");
    setIsUnlocking(true);
    try {
      const data = await shopApi.getPublicRegistry(code, password);
      setRegistry(data);
    } catch (err) {
      setUnlockError(err instanceof ApiClientError ? err.message : "Could not open this registry.");
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleGiftClick = (item: GiftRegistryItemDto) => {
    if (!isAuthenticated) {
      openAuthModal(() => setGiftingItem(item));
      return;
    }
    setGiftingItem(item);
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-border-light bg-surface text-charcoal text-sm placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-mocha/30 focus:border-mocha transition-all";

  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-36 pb-16 md:pb-24 bg-cream min-h-screen">
        <div className="max-w-5xl mx-auto px-5 md:px-10">
          {!registry ? (
            <div className="max-w-md mx-auto">
              <ScrollReveal>
                <SectionHeader eyebrow="Gift Registry" title="Enter Registry Password" description="Ask the celebration host for the password to view and gift items." />
              </ScrollReveal>
              <ScrollReveal delay={100}>
                <form onSubmit={handleUnlock} className="mt-10 bg-surface rounded-2xl border border-border-light p-8 shadow-soft space-y-4">
                  {unlockError && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">{unlockError}</div>}
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-mocha" />
                    <input type="password" className={`${inputClass} pl-11`} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Registry password" />
                  </div>
                  <button type="submit" disabled={isUnlocking} className="btn-primary w-full py-3.5 text-sm font-bold uppercase tracking-wider gap-2 disabled:opacity-60">
                    {isUnlocking ? <Loader2 size={16} className="animate-spin" /> : "View Registry"}
                  </button>
                </form>
              </ScrollReveal>
            </div>
          ) : (
            <>
              <ScrollReveal>
                <SectionHeader
                  eyebrow="Gift Registry"
                  title={registry.childOrPersonName || "Celebration Gift Registry"}
                  description={registry.celebrationDetails || "Choose a gift from the list below to send directly to the celebration host."}
                />
              </ScrollReveal>

              <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {registry.items.map((item, i) => {
                  const isGifted = item.status !== "AVAILABLE" || giftedItemIds.has(item.id);
                  return (
                    <ScrollReveal key={item.id} delay={i * 60}>
                      <div className="bg-surface rounded-2xl border border-border-light shadow-soft overflow-hidden flex flex-col h-full">
                        <div className="relative aspect-square bg-cream">
                          {item.image ? (
                            <Image src={item.image.url} alt={item.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, 33vw" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Gift size={32} className="text-text-light" /></div>
                          )}
                          {isGifted && (
                            <div className="absolute inset-0 bg-charcoal/50 flex items-center justify-center">
                              <span className="bg-white text-charcoal text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5"><Check size={14} className="text-green-600" /> Already Gifted</span>
                            </div>
                          )}
                        </div>
                        <div className="p-4 flex-1 flex flex-col">
                          <h4 className="font-bold text-charcoal text-sm line-clamp-2">{item.title}</h4>
                          {item.priceInPaise !== null && <p className="text-sm font-semibold text-charcoal mt-1">{formatPaise(item.priceInPaise)}</p>}
                          <div className="mt-auto pt-3">
                            {item.canGiftDirectly && !isGifted ? (
                              <button
                                onClick={() => handleGiftClick(item)}
                                disabled={!item.inStock}
                                className="btn-primary w-full py-2.5 text-xs font-bold uppercase tracking-wider gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              >
                                <ShoppingBag size={14} /> {item.inStock ? "Gift This" : "Out of Stock"}
                              </button>
                            ) : item.externalUrl && !isGifted ? (
                              <a href={item.externalUrl} target="_blank" rel="noreferrer" className="btn-outline w-full py-2.5 text-xs font-bold uppercase tracking-wider text-center block">
                                View & Purchase
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </ScrollReveal>
                  );
                })}
              </div>

              {registry.items.length === 0 && (
                <div className="text-center py-20">
                  <Gift size={40} className="mx-auto text-text-light mb-4" />
                  <p className="text-text-muted">No gift items have been added to this registry yet.</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <FooterClient />
      <WhatsAppFAB />

      {giftingItem && (
        <GiftItemModal
          code={code}
          password={password}
          item={giftingItem}
          onClose={() => setGiftingItem(null)}
          onGifted={() => {
            setGiftedItemIds((prev) => new Set(prev).add(giftingItem.id));
            setGiftingItem(null);
          }}
        />
      )}
    </>
  );
}
