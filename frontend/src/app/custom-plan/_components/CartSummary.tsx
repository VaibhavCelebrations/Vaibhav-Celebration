"use client";

import { Loader2, Sparkles, X } from "lucide-react";
import { FreeDeliveryProgress } from "@/components/ecom/FreeDeliveryProgress";
import type { BuilderLineItem, BuilderQuote } from "@/lib/builder-api";
import { formatPaise } from "@/lib/shop-types";

const SECTION_TITLES: Record<string, string> = {
  "per-child": "Per-child items",
  "per-group": "Group items",
  fixed: "Add-ons",
};

/** Line keys look like `choice-<serviceId>-<index>`; service ids never contain a hyphen. */
export function parseChoiceKey(key: string): string | null {
  const m = /^choice-([^-]+)-\d+$/.exec(key);
  return m ? m[1] : null;
}

type Props = {
  quote: BuilderQuote | null;
  loading: boolean;
  error: string | null;
  /** When set, product lines get a remove button. */
  onRemoveChoice?: (serviceId: string, sku: string) => void;
  onRemoveGiftRegistry?: () => void;
  /** Group lines under section headings (review) instead of a flat list (side cart). */
  grouped?: boolean;
  emptyHint?: string;
};

export function PersonalizationNotice({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 ${className}`}>
      <Sparkles size={16} className="text-amber-700 mt-0.5 shrink-0" />
      <p className="text-xs text-amber-900 leading-relaxed">
        <strong>Personalised items in your plan.</strong> Our team will contact you soon to collect the details before we
        start production.
      </p>
    </div>
  );
}

export function CartSummary({ quote, loading, error, onRemoveChoice, onRemoveGiftRegistry, grouped, emptyHint }: Props) {
  if (!quote) {
    return (
      <div className="text-center py-8 px-4">
        {loading ? (
          <Loader2 size={20} className="animate-spin text-mocha mx-auto" />
        ) : (
          <>
            <p className="text-sm font-semibold text-charcoal">Your cart is empty</p>
            <p className="text-xs text-text-muted mt-1">{emptyHint ?? "Pick items to see your price update here."}</p>
          </>
        )}
        {error && <p role="alert" className="text-xs text-red-600 mt-3">{error}</p>}
      </div>
    );
  }

  const lines = quote.lineItems.filter((l) => l.section !== "package");
  const renderLine = (line: BuilderLineItem) => {
    const serviceId = parseChoiceKey(line.key);
    const isGiftRegistry = line.key === "gift-registry-addon";
    const canRemove = Boolean(onRemoveChoice && serviceId && line.sku) || Boolean(onRemoveGiftRegistry && isGiftRegistry);
    return (
      <li key={line.key} className="flex items-start justify-between gap-3 text-sm">
        <div className="min-w-0">
          <p className="text-charcoal font-medium leading-snug">{line.label}</p>
          {line.sublabel && <p className="text-[11px] text-text-light font-medium mt-0.5">{line.sublabel}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-bold text-charcoal whitespace-nowrap">{formatPaise(line.lineTotalInPaise)}</span>
          {canRemove && (
            <button
              type="button"
              aria-label={`Remove ${line.label}`}
              onClick={() => (isGiftRegistry ? onRemoveGiftRegistry?.() : onRemoveChoice?.(serviceId!, line.sku!))}
              className="w-6 h-6 rounded-full text-text-light hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={loading}>
      {grouped ? (
        <div className="space-y-5">
          {(["per-child", "per-group", "fixed"] as const).map((section) => {
            const items = lines.filter((l) => l.section === section);
            if (!items.length) return null;
            return (
              <div key={section}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-mocha mb-3">{SECTION_TITLES[section]}</p>
                <ul className="space-y-3">{items.map(renderLine)}</ul>
              </div>
            );
          })}
        </div>
      ) : (
        <ul className="space-y-3.5 max-h-[38vh] overflow-y-auto pr-1 hide-scrollbar">{lines.map(renderLine)}</ul>
      )}

      {quote.hasPersonalization && <PersonalizationNotice className="mt-4" />}

      <div className="mt-5 pt-4 border-t border-border-light space-y-2.5">
        <FreeDeliveryProgress
          subtotalInPaise={quote.subtotalInPaise}
          freeShippingThresholdInPaise={quote.freeShippingThresholdInPaise}
          shippingFeeInPaise={quote.shippingInPaise || 19_900}
          shippingWaived={quote.shippingWaived}
        />
        <div className="flex justify-between text-sm text-text-muted">
          <span>Subtotal</span>
          <span className="font-bold text-charcoal">{formatPaise(quote.subtotalInPaise)}</span>
        </div>
        <div className="flex justify-between text-sm text-text-muted">
          <span>Delivery</span>
          <span className="font-bold text-charcoal">{quote.shippingWaived ? "FREE" : formatPaise(quote.shippingInPaise)}</span>
        </div>
        <div className="flex justify-between text-sm text-text-muted">
          <span>GST ({quote.gstPercent}%)</span>
          <span className="font-bold text-charcoal">{formatPaise(quote.gstInPaise)}</span>
        </div>
        <div className="flex justify-between items-end pt-3 border-t border-border-light">
          <span className="text-base font-bold text-charcoal">Total</span>
          <span className="font-display text-2xl font-bold text-mocha">{formatPaise(quote.totalInPaise)}</span>
        </div>
      </div>
      {error && <p role="alert" className="text-xs text-red-600 mt-3">{error}</p>}
    </div>
  );
}
