"use client";

import { useState } from "react";
import { Check, Images, PackagePlus, Sparkles } from "lucide-react";
import { MediaThumb } from "@/components/media/MediaThumb";
import { MediaViewer } from "@/components/media/MediaViewer";
import { productMedia, type BuilderProduct } from "@/lib/builder-api";
import { PERSONALIZATION_FOLLOW_UP_NOTE } from "@/lib/personalization";
import { formatPaise } from "@/lib/shop-types";

type Props = {
  /** Add-on products the admin tagged with the chosen theme. */
  addons: BuilderProduct[];
  themeTitle: string;
  guestCount: number;
  selectedSkus: string[];
  /** SKU → customer wants personalization. */
  personalization: Record<string, boolean>;
  onToggle: (sku: string) => void;
  onPersonalize: (sku: string, on: boolean) => void;
};

/** Add-ons are charged per child, with the product's minimum quantity as a floor — same rule as the quote API. */
function lineFor(p: BuilderProduct, guestCount: number, personalize: boolean) {
  const unit = p.priceInPaise + (personalize && p.personalizationEnabled ? p.personalizationCostInPaise : 0);
  const qty = Math.max(guestCount, p.minOrderQuantity);
  return { qty, total: unit * qty, moqApplied: guestCount < p.minOrderQuantity };
}

function AddonCard({
  product: p,
  guestCount,
  selected,
  personalize,
  onToggle,
  onPersonalize,
}: {
  product: BuilderProduct;
  guestCount: number;
  selected: boolean;
  personalize: boolean;
  onToggle: () => void;
  onPersonalize: (on: boolean) => void;
}) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const media = productMedia(p);
  const line = lineFor(p, guestCount, personalize);

  return (
    <div
      className={`flex flex-col rounded-2xl border bg-surface transition-all duration-200 ${
        selected ? "border-2 border-mocha shadow-md" : "border-border hover:border-mocha/50"
      }`}
    >
      <button
        type="button"
        onClick={() => setViewerOpen(true)}
        disabled={media.length === 0}
        aria-label={`View ${p.title}${media.length > 1 ? `: ${media.length} photos` : ""} and details`}
        className="relative m-3 mb-0 rounded-xl overflow-hidden cursor-zoom-in disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha focus-visible:ring-offset-2"
      >
        <MediaThumb media={media[0]} alt={p.title} sizes="(max-width: 768px) 50vw, 280px" className="aspect-[4/3]" />
        {media.length > 1 && (
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-charcoal/75 px-2 py-1 text-xs font-semibold text-white">
            <Images size={12} aria-hidden="true" /> {media.length}
          </span>
        )}
        {selected && (
          <span className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-mocha text-white shadow" aria-hidden="true">
            <Check size={16} strokeWidth={3} />
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-sm font-semibold text-charcoal leading-snug line-clamp-2">{p.title}</h3>
        <p className="mt-1 text-sm font-bold text-mocha">
          {formatPaise(p.priceInPaise)}
          <span className="text-xs font-medium text-text-muted"> per child</span>
        </p>
        {p.personalizationEnabled && (
          <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-mocha">
            <Sparkles size={12} aria-hidden="true" /> Can be personalized
            {p.personalizationCostInPaise > 0 && ` (+${formatPaise(p.personalizationCostInPaise)})`}
          </p>
        )}
        {selected && (
          <p className="mt-2 self-start rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">
            × {line.qty} = {formatPaise(line.total)}
          </p>
        )}
        {selected && line.moqApplied && (
          <p className="mt-1 text-xs text-amber-700">
            Minimum {p.minOrderQuantity} units, so you are charged for {line.qty}
          </p>
        )}
        <div className="mt-auto pt-3">
          <button
            type="button"
            aria-pressed={selected}
            onClick={onToggle}
            className={`w-full h-11 rounded-xl text-sm font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha focus-visible:ring-offset-2 ${
              selected ? "bg-mocha text-white hover:bg-mocha-dark" : "border border-mocha text-mocha hover:bg-mocha/10"
            }`}
          >
            {selected ? "Added" : "Add"}
          </button>
        </div>
      </div>

      {selected && p.personalizationEnabled && (
        <div className="border-t border-border-light px-3 py-3">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={personalize}
              onChange={(e) => onPersonalize(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-mocha"
            />
            <span className="text-xs font-semibold text-charcoal">
              Personalize{" "}
              <span className="text-mocha">
                {p.personalizationCostInPaise > 0 ? `(+${formatPaise(p.personalizationCostInPaise)} per unit)` : "(no extra cost)"}
              </span>
            </span>
          </label>
          {personalize && (
            <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs leading-relaxed text-amber-900">{PERSONALIZATION_FOLLOW_UP_NOTE}</p>
          )}
        </div>
      )}

      {viewerOpen && (
        <MediaViewer
          items={media}
          title={p.title}
          description={p.description}
          onClose={() => setViewerOpen(false)}
          action={
            <button
              type="button"
              onClick={() => {
                onToggle();
                setViewerOpen(false);
              }}
              className="btn-primary h-11 px-6 text-sm font-bold cursor-pointer"
            >
              {selected ? "Remove add-on" : "Add this"}
            </button>
          }
        />
      )}
    </div>
  );
}

/**
 * Optional add-on products for the chosen theme. Used by both the package flow and the custom
 * plan. Any number can be added; none is required.
 */
export function AddonPicker({ addons, themeTitle, guestCount, selectedSkus, personalization, onToggle, onPersonalize }: Props) {
  if (addons.length === 0) {
    return (
      <div className="rounded-2xl border border-border-light bg-surface p-8 text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-mocha/10" aria-hidden="true">
          <PackagePlus size={22} className="text-mocha" />
        </span>
        <p className="font-semibold text-charcoal">No add-ons for {themeTitle || "this theme"} yet</p>
        <p className="mt-1 text-sm text-text-muted">There is nothing extra to add for this theme. You can continue to the next step.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm font-semibold text-text-muted" aria-live="polite">
        {selectedSkus.length === 0 ? "None added" : `${selectedSkus.length} add-on${selectedSkus.length === 1 ? "" : "s"} added`}
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {addons.map((p) => (
          <AddonCard
            key={p.sku}
            product={p}
            guestCount={guestCount}
            selected={selectedSkus.includes(p.sku)}
            personalize={Boolean(personalization[p.sku])}
            onToggle={() => onToggle(p.sku)}
            onPersonalize={(on) => onPersonalize(p.sku, on)}
          />
        ))}
      </div>
    </div>
  );
}
