"use client";

import { Calendar, Gift, MapPin } from "lucide-react";
import { formatPaise } from "@/lib/shop-types";
import type { PublicRegistryDto } from "@/lib/shop-types";
import { SafeGiftImage } from "@/components/registry/SafeGiftImage";

/**
 * Read-only rendering of the guest-facing registry page, reused so the
 * "Preview" step shows guests' actual experience instead of a disconnected
 * mock-up. Mirrors the hero + gift grid layout of the public registry page
 * (frontend/src/app/registry/[code]/RegistryGuestView.tsx) without any of
 * the buy/gift/unlock interactions.
 */
export function RegistryPreviewCard({ registry }: { registry: PublicRegistryDto }) {
  return (
    <div className="rounded-[2rem] border border-border-light bg-cream/60 p-4 md:p-8">
      <div className="grid md:grid-cols-2 gap-8 items-center mb-10">
        <div className="order-2 md:order-1 flex flex-col items-center md:items-start text-center md:text-left">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-charcoal leading-tight">{registry.title}</h2>
          <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-3">
            {registry.eventDate && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border-light text-sm text-charcoal bg-white shadow-sm font-medium">
                <Calendar size={15} className="text-mocha" />
                {new Date(registry.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </div>
            )}
            {registry.shippingAddress && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border-light text-sm text-charcoal bg-white shadow-sm font-medium">
                <MapPin size={15} className="text-mocha" /> Delivery address on file
              </div>
            )}
          </div>
          <p className="text-text-muted mt-4 max-w-lg leading-relaxed text-sm">
            {registry.celebrationDetails || "Your presence is our biggest gift, but here's a little wish list if you'd like."}
          </p>
        </div>
        {registry.coverImageUrl && (
          <div className="order-1 md:order-2">
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-card border-4 border-white bg-cream">
              <SafeGiftImage src={registry.coverImageUrl} alt="" />
            </div>
          </div>
        )}
      </div>

      {registry.items.length === 0 ? (
        <div className="text-center py-16">
          <Gift size={32} className="mx-auto text-text-light mb-3" />
          <p className="text-text-muted text-sm">No gifts added yet — guests will see this list once you add products.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {registry.items.map((item) => (
            <div key={item.id} className="bg-surface rounded-2xl border border-border-light shadow-soft overflow-hidden flex flex-col text-left">
              <div className="relative aspect-square bg-cream overflow-hidden">
                <SafeGiftImage src={item.image?.url} alt={item.title} />
              </div>
              <div className="p-3 flex-1 flex flex-col">
                <p className="text-[10px] font-bold uppercase tracking-wider text-mocha">
                  {item.sourceType === "EXTERNAL_LINK" ? item.storeName || "External store" : "Vaibhav Celebrations"}
                </p>
                <h3 className="font-bold text-charcoal text-xs mt-1 line-clamp-2">{item.title}</h3>
                {item.priceInPaise !== null && <p className="text-xs font-semibold mt-1">{formatPaise(item.priceInPaise)}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
