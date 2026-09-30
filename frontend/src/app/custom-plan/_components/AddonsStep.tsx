"use client";

import { Check, Gift } from "lucide-react";
import { AddonPicker } from "@/components/builder/AddonPicker";
import type { BuilderProduct, CustomPlanOptions } from "@/lib/builder-api";
import { formatPaise } from "@/lib/shop-types";

type Props = {
  /** Add-on products the admin tagged with the chosen theme. */
  addons: BuilderProduct[];
  themeTitle: string;
  guestCount: number;
  selectedAddons: string[];
  personalization: Record<string, boolean>;
  onToggleAddon: (sku: string) => void;
  onPersonalize: (sku: string, on: boolean) => void;
  giftRegistry: CustomPlanOptions["giftRegistry"] | null;
  selected: boolean;
  onToggle: (on: boolean) => void;
};

export function AddonsStep({
  addons,
  themeTitle,
  guestCount,
  selectedAddons,
  personalization,
  onToggleAddon,
  onPersonalize,
  giftRegistry,
  selected,
  onToggle,
}: Props) {
  return (
    <section className="animate-slide-up">
      <h1 className="font-display text-2xl md:text-3xl font-semibold text-charcoal mb-2">Add-ons</h1>
      <p className="text-sm text-text-muted mb-8">
        Optional extras for the {themeTitle || "chosen"} theme, priced per child. Add any you like, or skip this step.
      </p>

      <AddonPicker
        addons={addons}
        themeTitle={themeTitle}
        guestCount={guestCount}
        selectedSkus={selectedAddons}
        personalization={personalization}
        onToggle={onToggleAddon}
        onPersonalize={onPersonalize}
      />

      {giftRegistry?.available && (
        <button
          type="button"
          aria-pressed={selected}
          onClick={() => onToggle(!selected)}
          className={`mt-8 w-full text-left rounded-2xl border p-5 md:p-6 transition-all bg-surface cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha focus-visible:ring-offset-2 ${
            selected ? "border-2 border-mocha shadow-md ring-2 ring-mocha/10" : "border-border hover:border-mocha/50"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-mocha/10 flex items-center justify-center shrink-0" aria-hidden="true">
              <Gift size={22} className="text-mocha" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <h2 className="font-display text-lg font-semibold text-charcoal">{giftRegistry.label}</h2>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-charcoal">
                    {giftRegistry.priceInPaise > 0 ? formatPaise(giftRegistry.priceInPaise) : "Free"}
                  </p>
                  <p className="text-xs text-text-light">one-time</p>
                </div>
              </div>
              <p className="text-sm text-text-muted mt-1.5 leading-relaxed">
                Share a guided gift list with your guests so they can gift exactly what your child loves.
              </p>
              <ul className="mt-3 space-y-1 text-xs text-text-muted">
                <li>• Guests shop from your list and contributions are tracked for you</li>
                <li>• Set it up right after payment, or any time from your account</li>
              </ul>
              <span
                className={`inline-flex items-center gap-2 mt-4 text-sm font-semibold rounded-full px-4 py-2 transition-colors ${
                  selected ? "bg-mocha text-white" : "bg-cream-dark text-charcoal"
                }`}
              >
                {selected ? (
                  <>
                    <Check size={16} aria-hidden="true" /> Added to your plan
                  </>
                ) : (
                  "Add to my plan"
                )}
              </span>
            </div>
          </div>
        </button>
      )}
    </section>
  );
}
