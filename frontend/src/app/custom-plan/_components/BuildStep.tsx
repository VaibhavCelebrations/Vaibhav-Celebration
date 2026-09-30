"use client";

import { memo, useMemo, useState } from "react";
import { Check, Images, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { MediaThumb } from "@/components/media/MediaThumb";
import { MediaViewer } from "@/components/media/MediaViewer";
import { groupByStage, productMedia, type BuilderProduct, type CustomPlanService } from "@/lib/builder-api";
import { PERSONALIZATION_FOLLOW_UP_NOTE } from "@/lib/personalization";
import { formatPaise } from "@/lib/shop-types";
import { estimateLine, type Selections } from "./shared";

type CardProps = {
  product: BuilderProduct;
  serviceId: string;
  isGroup: boolean;
  guestCount: number;
  selected: boolean;
  personalize: boolean;
  onToggle: (serviceId: string, sku: string) => void;
  onPersonalize: (sku: string, on: boolean) => void;
};

const ProductCard = memo(function ProductCard({
  product: p,
  serviceId,
  isGroup,
  guestCount,
  selected,
  personalize,
  onToggle,
  onPersonalize,
}: CardProps) {
  const line = estimateLine(p, guestCount, isGroup, personalize);
  const media = productMedia(p);
  const [viewerOpen, setViewerOpen] = useState(false);
  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-surface transition-all duration-200 ${
        selected ? "border-2 border-mocha shadow-md ring-2 ring-mocha/10" : "border-border hover:border-mocha/50 hover:shadow-sm"
      }`}
    >
      {/* Photo opens the gallery and description; selecting is a separate button below. */}
      <button
        type="button"
        onClick={() => setViewerOpen(true)}
        disabled={media.length === 0}
        aria-label={`View ${p.title}${media.length > 1 ? `: ${media.length} photos` : ""} and details`}
        className="relative m-3 mb-0 rounded-xl overflow-hidden cursor-zoom-in disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha focus-visible:ring-offset-2"
      >
        <MediaThumb media={media[0]} alt={p.title} sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw" className="aspect-[4/3]" />
        {media.length > 1 && (
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-charcoal/75 px-2 py-1 text-xs font-semibold text-white">
            <Images size={12} aria-hidden="true" /> {media.length}
          </span>
        )}
        {selected && (
          <span className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center bg-mocha text-white shadow" aria-hidden="true">
            <Check size={16} strokeWidth={3} />
          </span>
        )}
      </button>

      <div className="flex flex-col flex-1 p-3">
        <h4 className="text-sm font-semibold text-charcoal leading-snug line-clamp-2">{p.title}</h4>
        <p className="text-sm font-bold text-mocha mt-1">
          {formatPaise(p.priceInPaise)}
          <span className="text-xs font-medium text-text-muted"> {isGroup ? "per group" : "per child"}</span>
        </p>
        {p.personalizationEnabled && (
          <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-mocha">
            <Sparkles size={12} aria-hidden="true" /> Can be personalized
            {p.personalizationCostInPaise > 0 && ` (+${formatPaise(p.personalizationCostInPaise)})`}
          </p>
        )}
        {selected && (
          <p className="text-xs text-emerald-800 bg-emerald-50 rounded-md px-2 py-1 mt-2 self-start">
            {isGroup && !line.moqApplied ? "1 group" : `× ${line.qty}`} = {formatPaise(line.total)}
          </p>
        )}
        {selected && line.moqApplied && (
          <p className="text-xs text-amber-700 mt-1">
            Minimum {p.minOrderQuantity} units, so you are charged for {line.qty}
          </p>
        )}
        <div className="mt-auto pt-3">
          <button
            type="button"
            aria-pressed={selected}
            onClick={() => onToggle(serviceId, p.sku)}
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
              onChange={(e) => onPersonalize(p.sku, e.target.checked)}
              className="mt-0.5 w-4 h-4 shrink-0 cursor-pointer accent-mocha"
            />
            <span className="text-xs font-semibold text-charcoal">
              Personalize{" "}
              <span className="text-mocha">
                {p.personalizationCostInPaise > 0 ? `(+${formatPaise(p.personalizationCostInPaise)} per unit)` : "(no extra cost)"}
              </span>
            </span>
          </label>
          {personalize && (
            <p className="text-xs text-amber-900 bg-amber-50 rounded-lg p-2 mt-2 leading-relaxed">{PERSONALIZATION_FOLLOW_UP_NOTE}</p>
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
                onToggle(serviceId, p.sku);
                setViewerOpen(false);
              }}
              className="btn-primary h-11 px-6 text-sm font-bold cursor-pointer"
            >
              {selected ? "Remove from my plan" : "Add to my plan"}
            </button>
          }
        />
      )}
    </div>
  );
});

type Props = {
  services: CustomPlanService[];
  loading: boolean;
  error: string | null;
  themeTitle: string;
  guestCount: number;
  selections: Selections;
  onToggle: (serviceId: string, sku: string) => void;
  onPersonalize: (sku: string, on: boolean) => void;
  onChangeTheme: () => void;
  whatsappUrl: string;
};

export function BuildStep({
  services,
  loading,
  error,
  themeTitle,
  guestCount,
  selections,
  onToggle,
  onPersonalize,
  onChangeTheme,
  whatsappUrl,
}: Props) {
  const [active, setActive] = useState<string>("all");

  // Before / During / After sections — set per product category in admin, same as the package Customize step.
  const categories = useMemo(
    () => groupByStage(services).map((g) => ({ key: g.stage ?? "OTHER", label: g.label, services: g.services })),
    [services],
  );

  const pickedIn = (svcs: CustomPlanService[]) => svcs.reduce((n, s) => n + (selections.choices[s.serviceId]?.length ?? 0), 0);
  const visible = active === "all" ? categories : categories.filter((c) => c.key === active);
  const activeKey = categories.some((c) => c.key === active) ? active : "all";

  return (
    <section className="animate-slide-up">
      <h1 className="font-display text-2xl md:text-3xl font-semibold text-charcoal mb-2">Build your celebration</h1>
      <p className="text-sm text-text-muted mb-1">
        Choose the details you love and build a celebration that fits your theme, guests and budget.
      </p>
      <p className="text-xs font-semibold text-mocha mb-6">
        {themeTitle} · {guestCount} children
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-text-muted py-16 justify-center">
          <Loader2 className="animate-spin" size={18} /> Loading items for this theme…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700 mb-4">{error}</p>
          <button type="button" onClick={onChangeTheme} className="btn-outline px-6 py-2.5 text-sm">
            Choose another theme
          </button>
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-2xl border border-border-light bg-surface p-8 text-center">
          <h3 className="font-display text-xl font-semibold text-charcoal mb-2">Nothing to pick for this theme yet</h3>
          <p className="text-sm text-text-muted mb-6 max-w-md mx-auto">
            We&apos;re still adding items for {themeTitle}. Try another theme, or chat with us and we&apos;ll put a plan together for you.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button type="button" onClick={onChangeTheme} className="btn-primary px-6 py-2.5 text-sm">
              Choose another theme
            </button>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-outline px-6 py-2.5 text-sm flex items-center justify-center gap-2">
              <MessageCircle size={16} /> Chat on WhatsApp
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* Stage tabs */}
          <div className="-mx-5 px-5 md:mx-0 md:px-0 mb-8 overflow-x-auto hide-scrollbar">
            <div className="flex gap-2 w-max md:w-auto md:flex-wrap" role="tablist" aria-label="Celebration stages">
              {[{ key: "all", label: "All", picked: pickedIn(services) }, ...categories.map((c) => ({ key: c.key, label: c.label, picked: pickedIn(c.services) }))].map(
                (tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={activeKey === tab.key}
                    onClick={() => setActive(tab.key)}
                    className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                      activeKey === tab.key
                        ? "bg-mocha border-mocha text-white shadow-sm"
                        : "bg-surface border-border text-charcoal hover:border-mocha/50"
                    }`}
                  >
                    {tab.label}
                    {tab.picked > 0 && (
                      <span
                        className={`ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] ${
                          activeKey === tab.key ? "bg-white/25 text-white" : "bg-mocha/10 text-mocha"
                        }`}
                      >
                        {tab.picked}
                      </span>
                    )}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="space-y-12">
            {visible.map((cat) => {
              return (
              <div key={cat.key}>
                <h2 className="font-display text-xl md:text-2xl font-semibold text-charcoal mb-5 pb-3 border-b border-border-light">
                  {cat.label}
                </h2>
                <div className="space-y-8">
                  {cat.services.map((svc) => {
                    const picked = selections.choices[svc.serviceId] ?? [];
                    return (
                      <div key={svc.serviceId}>
                        <div className="flex items-baseline justify-between gap-3 mb-1">
                          <h3 className="text-base font-semibold text-charcoal">{svc.label}</h3>
                          <span className={`text-xs font-semibold shrink-0 ${picked.length ? "text-emerald-700" : "text-text-light"}`}>
                            {picked.length ? `${picked.length} selected` : "Optional"}
                          </span>
                        </div>
                        {svc.description && <p className="text-sm text-text-muted mb-3">{svc.description}</p>}
                        {svc.packageTitles.length > 0 && (
                          <p className="text-[11px] text-text-light mb-3">Featured in {svc.packageTitles.join(" · ")}</p>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-3 md:gap-4">
                          {svc.products.map((p) => (
                            <ProductCard
                              key={p.sku}
                              product={p}
                              serviceId={svc.serviceId}
                              isGroup={p.pricingMode === "PER_GROUP"}
                              guestCount={guestCount}
                              selected={picked.includes(p.sku)}
                              personalize={Boolean(selections.personalization[p.sku])}
                              onToggle={onToggle}
                              onPersonalize={onPersonalize}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
