"use client";

import { Calendar, Gift, MapPin, MessageSquare, Pencil, Type } from "lucide-react";
import { formatPaise } from "@/lib/shop-types";
import { SafeGiftImage } from "@/components/registry/SafeGiftImage";
import type { StepProps } from "../types";

function EditRow({
  icon: Icon,
  label,
  value,
  onEdit,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: React.ReactNode;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border-light last:border-0">
      <Icon size={16} className="text-mocha mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
        <div className="text-sm text-charcoal mt-0.5">{value}</div>
      </div>
      <button type="button" onClick={onEdit} className="shrink-0 text-xs font-bold text-mocha hover:text-mocha-dark cursor-pointer flex items-center gap-1">
        <Pencil size={12} /> Edit
      </button>
    </div>
  );
}

export function ReviewStep({ registry, goNext, goBack, goTo }: StepProps) {
  return (
    <div className="animate-step-in space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-mocha">Step 4 of 6</p>
        <h1 className="font-display text-2xl font-bold text-charcoal mt-1">Review your registry</h1>
        <p className="text-text-muted text-sm mt-1">Check everything looks right. You can jump back to fix anything before publishing.</p>
      </div>

      <section className="bg-surface rounded-2xl border border-border-light p-5">
        <h2 className="text-sm font-bold text-charcoal mb-2">Registry details</h2>
        <EditRow icon={Type} label="Title" value={registry.title} onEdit={() => goTo("details")} />
        <EditRow
          icon={Calendar}
          label="Event date"
          value={registry.eventDate ? new Date(registry.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : <span className="text-red-600">Not set</span>}
          onEdit={() => goTo("details")}
        />
        <EditRow
          icon={MapPin}
          label="Delivery address"
          value={registry.shippingAddress?.formatted ?? <span className="text-red-600">Not set</span>}
          onEdit={() => goTo("details")}
        />
        <EditRow
          icon={MessageSquare}
          label="Message to guests"
          value={registry.celebrationDetails || <span className="text-text-light">No message added</span>}
          onEdit={() => goTo("details")}
        />
      </section>

      <section className="bg-surface rounded-2xl border border-border-light p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-charcoal">Gifts ({registry.items.length})</h2>
          <button type="button" onClick={() => goTo("products")} className="text-xs font-bold text-mocha hover:text-mocha-dark cursor-pointer flex items-center gap-1">
            <Pencil size={12} /> Edit
          </button>
        </div>
        {registry.items.length === 0 ? (
          <div className="text-center py-8">
            <Gift size={24} className="mx-auto text-text-light mb-2" />
            <p className="text-xs text-red-600 font-medium">No gifts added yet — add at least one before publishing.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {registry.items.slice(0, 8).map((item) => (
              <div key={item.id} className="rounded-xl overflow-hidden border border-border-light bg-cream/40">
                <div className="aspect-square"><SafeGiftImage src={item.image?.url} alt={item.title} /></div>
                <div className="p-2">
                  <p className="text-[11px] font-semibold text-charcoal line-clamp-1">{item.title}</p>
                  {item.priceInPaise !== null && <p className="text-[10px] text-text-muted">{formatPaise(item.priceInPaise)}</p>}
                </div>
              </div>
            ))}
            {registry.items.length > 8 && (
              <div className="rounded-xl border border-dashed border-border-light flex items-center justify-center text-xs text-text-muted font-semibold">
                +{registry.items.length - 8} more
              </div>
            )}
          </div>
        )}
      </section>

      <div className="flex items-center justify-between pt-2">
        <button type="button" onClick={goBack} className="text-sm font-semibold text-text-muted hover:text-charcoal cursor-pointer">
          Back
        </button>
        <button type="button" onClick={goNext} className="btn-primary px-8 py-3 text-sm font-bold uppercase tracking-wider">
          Continue to preview
        </button>
      </div>
    </div>
  );
}
