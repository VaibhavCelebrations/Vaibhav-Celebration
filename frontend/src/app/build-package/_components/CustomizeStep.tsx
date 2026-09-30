"use client";

import { useState } from "react";
import { Check, Eye, Gift, Images, Loader2, Sparkles } from "lucide-react";
import { MediaThumb } from "@/components/media/MediaThumb";
import { MediaViewer } from "@/components/media/MediaViewer";
import { isVideo, type MediaItem } from "@/components/media/types";
import {
  buildStageSections,
  productMedia,
  type BuilderChoiceService,
  type BuilderDecorOption,
  type BuilderOptions,
  type BuilderPreviewService,
  type BuilderProduct,
  type BuilderSelections,
  type CelebrationStage,
} from "@/lib/builder-api";
import { PERSONALIZATION_FOLLOW_UP_NOTE } from "@/lib/personalization";
import { formatPaise } from "@/lib/shop-types";
import { estimateLine, type BuilderLocation } from "./shared";

const STAGE_HINTS: Record<CelebrationStage, string> = {
  BEFORE: "Everything that sets the mood in the days leading up to the party.",
  DURING: "Welcome items and activities your guests enjoy at the celebration.",
  AFTER: "Return gifts, packaging and thank-you touches guests take home.",
};

/** "3 photos", "1 video", "2 photos · 1 video" */
function mediaSummary(items: MediaItem[]): string {
  const videos = items.filter(isVideo).length;
  const photos = items.length - videos;
  const parts: string[] = [];
  if (photos) parts.push(`${photos} photo${photos === 1 ? "" : "s"}`);
  if (videos) parts.push(`${videos} video${videos === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

type ViewerState =
  | { kind: "media"; title: string; description: string | null; items: MediaItem[]; index: number }
  | { kind: "product"; service: BuilderChoiceService; product: BuilderProduct };

/* ─── Preview service: included, nothing to choose, just look ────────── */

function PreviewCard({ preview, onView }: { preview: BuilderPreviewService; onView: (index: number) => void }) {
  const items: MediaItem[] = preview.media;
  return (
    <article className="rounded-2xl border border-border-light bg-cream/40 p-3 sm:p-4">
      <div className="flex gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => onView(0)}
          aria-label={`Preview ${preview.label}: ${mediaSummary(items)}`}
          className="relative w-28 sm:w-40 shrink-0 self-start rounded-xl overflow-hidden cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha focus-visible:ring-offset-2"
        >
          <MediaThumb media={items[0]} alt={preview.label} sizes="(max-width: 640px) 112px, 160px" className="aspect-[4/3]" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-charcoal">{preview.label}</h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              <Check size={12} strokeWidth={3} aria-hidden="true" /> Included
            </span>
          </div>
          {preview.description && <p className="mt-1 text-sm text-text-muted line-clamp-3">{preview.description}</p>}
          <button
            type="button"
            onClick={() => onView(0)}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-mocha hover:text-mocha-dark underline underline-offset-2 cursor-pointer"
          >
            <Eye size={15} aria-hidden="true" /> View preview ({mediaSummary(items)})
          </button>
        </div>
      </div>
      {items.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto hide-scrollbar p-0.5">
          {items.slice(1, 7).map((item, i) => (
            <button
              key={`${item.url}-${i}`}
              type="button"
              onClick={() => onView(i + 1)}
              aria-label={`View ${isVideo(item) ? "video" : "photo"} ${i + 2} of ${items.length}`}
              className="shrink-0 rounded-lg overflow-hidden cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha"
            >
              <MediaThumb media={item} alt="" sizes="80px" className="h-14 w-20" />
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

/* ─── Product choice ─────────────────────────────────────────────────── */

type ProductCardProps = {
  product: BuilderProduct;
  selected: boolean;
  guestCount: number;
  personalize: boolean;
  onToggle: () => void;
  onPersonalize: (on: boolean) => void;
  onView: () => void;
};

function ProductChoiceCard({ product: p, selected, guestCount, personalize, onToggle, onPersonalize, onView }: ProductCardProps) {
  const isGroup = p.pricingMode === "PER_GROUP";
  const line = estimateLine(p, guestCount, isGroup, personalize);
  const media = productMedia(p);

  return (
    <div
      className={`flex flex-col rounded-2xl border bg-surface transition-all duration-200 ${
        selected ? "border-2 border-mocha shadow-md" : "border-border hover:border-mocha/50"
      }`}
    >
      <button
        type="button"
        onClick={onView}
        // Nothing to enlarge without a photo; the card still shows the title and price.
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
        <h4 className="text-sm font-semibold text-charcoal leading-snug line-clamp-2">{p.title}</h4>
        <p className="mt-1 text-sm font-bold text-mocha">
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
          <p className="mt-2 self-start rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">
            {isGroup && !line.moqApplied ? "1 group" : `× ${line.qty}`} = {formatPaise(line.total)}
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
            {selected ? "Selected" : "Select"}
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
    </div>
  );
}

/* ─── Decor ──────────────────────────────────────────────────────────── */

function DecorMedia({ option, onView }: { option: BuilderDecorOption; onView: (index: number) => void }) {
  if (option.media.length === 0) return null;
  return (
    <div className="mt-4 flex gap-2 overflow-x-auto hide-scrollbar p-0.5">
      {option.media.slice(0, 6).map((item, i) => (
        <button
          key={`${item.url}-${i}`}
          type="button"
          onClick={() => onView(i)}
          aria-label={`View décor ${isVideo(item) ? "video" : "photo"} ${i + 1} of ${option.media.length}`}
          className="shrink-0 rounded-xl overflow-hidden cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha"
        >
          <MediaThumb media={item} alt={option.label} sizes="160px" className="h-24 w-32 sm:h-28 sm:w-40" />
        </button>
      ))}
    </div>
  );
}

/* ─── Step ───────────────────────────────────────────────────────────── */

type Props = {
  options: BuilderOptions | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  themeTitle: string;
  packageTitle: string;
  guestCount: number;
  location: BuilderLocation;
  selections: BuilderSelections;
  onSelectionsChange: (next: BuilderSelections) => void;
  /** Service ids to flag as unfinished (set after the customer tries to continue). */
  flaggedServiceIds: string[];
  onEditBasics: () => void;
};

export function CustomizeStep({
  options,
  loading,
  error,
  onRetry,
  themeTitle,
  packageTitle,
  guestCount,
  location,
  selections,
  onSelectionsChange,
  flaggedServiceIds,
  onEditBasics,
}: Props) {
  const [viewer, setViewer] = useState<ViewerState | null>(null);

  const pickedFor = (serviceId: string) => selections.choices?.[serviceId] ?? [];

  const toggleChoice = (svc: BuilderChoiceService, sku: string) => {
    const current = pickedFor(svc.serviceId);
    let next: string[];
    if (current.includes(sku)) next = current.filter((s) => s !== sku);
    else if (svc.selectionCount === 1) next = [sku];
    // Full already: the new pick replaces the oldest one instead of being refused.
    else if (current.length >= svc.selectionCount) next = [...current.slice(1), sku];
    else next = [...current, sku];
    onSelectionsChange({ ...selections, choices: { ...(selections.choices ?? {}), [svc.serviceId]: next } });
  };

  const setPersonalization = (sku: string, on: boolean) =>
    onSelectionsChange({ ...selections, personalization: { ...(selections.personalization ?? {}), [sku]: on } });

  const header = (
    <header className="mb-6">
      <h1 className="font-display text-2xl md:text-3xl font-semibold text-charcoal mb-2">Customize your celebration</h1>
      <p className="text-sm text-text-muted">
        {packageTitle} · {themeTitle} · {guestCount} children · {location === "jaipur" ? "Jaipur" : "Outside Jaipur"}{" "}
        <button type="button" onClick={onEditBasics} className="font-semibold text-mocha underline underline-offset-2 hover:text-mocha-dark cursor-pointer">
          Edit
        </button>
      </p>
    </header>
  );

  if (error) {
    return (
      <section>
        {header}
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700 mb-4">{error}</p>
          <button type="button" onClick={onRetry} className="btn-outline px-6 py-2.5 text-sm">
            Try again
          </button>
        </div>
      </section>
    );
  }

  if (loading || !options) {
    return (
      <section>
        {header}
        <div className="flex items-center justify-center gap-2 py-16 text-text-muted" role="status">
          <Loader2 className="animate-spin" size={18} aria-hidden="true" /> Loading what&apos;s in your package…
        </div>
      </section>
    );
  }

  const sections = buildStageSections(options, location);
  const decor = location === "jaipur" ? options.decor.jaipur : options.decor.guide;
  const registry = options.giftRegistry;

  return (
    <section>
      {header}

      {sections.length === 0 && (
        <div className="mb-6 rounded-2xl border border-border-light bg-surface p-6 text-sm text-text-muted">
          There is nothing to choose for this theme. Everything in the package is arranged for you.
        </div>
      )}

      {sections.map((section, index) => {
        const done = section.services.filter((svc) => pickedFor(svc.serviceId).length === svc.selectionCount).length;
        return (
          <div key={section.stage ?? "other"} className="mb-6 rounded-3xl border border-border-light bg-surface p-4 md:p-6">
            <div className="mb-5 flex items-start justify-between gap-3 border-b border-border-light pb-4">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mocha text-sm font-bold text-white" aria-hidden="true">
                  {index + 1}
                </span>
                <div>
                  <h2 className="font-display text-lg md:text-xl font-semibold text-charcoal">{section.label}</h2>
                  <p className="mt-0.5 text-sm text-text-muted">
                    {section.stage ? STAGE_HINTS[section.stage] : "Other items included with this package."}
                  </p>
                </div>
              </div>
              {section.services.length > 0 && (
                <span className={`mt-1 shrink-0 text-xs font-semibold ${done === section.services.length ? "text-emerald-700" : "text-text-muted"}`}>
                  {done}/{section.services.length} chosen
                </span>
              )}
            </div>

            {section.previews.length > 0 && (
              <div className="mb-6 grid gap-3 lg:grid-cols-2">
                {section.previews.map((preview) => (
                  <PreviewCard
                    key={preview.serviceId}
                    preview={preview}
                    onView={(i) =>
                      setViewer({ kind: "media", title: preview.label, description: preview.description, items: preview.media, index: i })
                    }
                  />
                ))}
              </div>
            )}

            {section.services.map((svc) => {
              const picked = pickedFor(svc.serviceId);
              const complete = picked.length === svc.selectionCount;
              const flagged = flaggedServiceIds.includes(svc.serviceId) && !complete;
              return (
                <div key={svc.serviceId} id={`svc-${svc.serviceId}`} className="mb-8 last:mb-0 scroll-mt-36">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-charcoal">{svc.label}</h3>
                      <span className="rounded-full bg-mocha/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-mocha">
                        Choose {svc.selectionCount}
                        {svc.isPerGroup ? " · per group" : ""}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-semibold ${complete ? "text-emerald-700" : flagged ? "text-red-600" : "text-text-muted"}`}
                      role={flagged ? "alert" : undefined}
                    >
                      {complete && <Check size={12} className="inline -mt-0.5 mr-1" aria-hidden="true" />}
                      {picked.length} of {svc.selectionCount} selected
                      {flagged && " — please choose"}
                    </span>
                  </div>
                  {svc.description && <p className="-mt-1 mb-3 text-sm text-text-muted">{svc.description}</p>}
                  <div className={`grid grid-cols-2 md:grid-cols-3 gap-3 rounded-2xl ${flagged ? "outline-2 outline-offset-4 outline-red-300" : ""}`}>
                    {svc.products.map((p) => (
                      <ProductChoiceCard
                        key={p.sku}
                        product={p}
                        selected={picked.includes(p.sku)}
                        guestCount={guestCount}
                        personalize={Boolean(selections.personalization?.[p.sku])}
                        onToggle={() => toggleChoice(svc, p.sku)}
                        onPersonalize={(on) => setPersonalization(p.sku, on)}
                        onView={() => setViewer({ kind: "product", service: svc, product: p })}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Décor */}
      {decor && (
        <div className={`mb-6 rounded-3xl border bg-surface p-4 md:p-6 ${location === "jaipur" && selections.decor ? "border-2 border-mocha" : "border-border-light"}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-lg md:text-xl font-semibold text-charcoal">Décor</h2>
              <p className="mt-1 font-semibold text-charcoal">{decor.label}</p>
              <p className="mt-1 text-sm text-text-muted">
                {decor.description ||
                  (location === "jaipur"
                    ? "Theme décor set up through our Jaipur team. The final quote may vary slightly on site."
                    : "Your package includes a décor guide so you can recreate the look with local vendors.")}
              </p>
            </div>
            <div className="shrink-0 text-right">
              {location === "jaipur" ? (
                <>
                  <p className="font-display text-xl font-bold text-charcoal">{formatPaise(decor.priceInPaise)}</p>
                  <p className="text-xs text-text-muted">flat rate, optional</p>
                </>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  <Check size={12} strokeWidth={3} aria-hidden="true" /> Included
                </span>
              )}
            </div>
          </div>
          <DecorMedia
            option={decor}
            onView={(i) => setViewer({ kind: "media", title: decor.label, description: decor.description, items: decor.media, index: i })}
          />
          {location === "jaipur" && (
            <label className="mt-4 flex items-center gap-2 text-sm font-medium text-charcoal cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(selections.decor)}
                onChange={(e) => onSelectionsChange({ ...selections, decor: e.target.checked })}
                className="h-4 w-4 cursor-pointer accent-mocha"
              />
              Add décor to my order
            </label>
          )}
        </div>
      )}

      {/* Gift registry */}
      {registry && (
        <div className={`mb-6 rounded-3xl border bg-surface p-4 md:p-6 ${registry.included || selections.giftRegistryCustomize ? "border-2 border-mocha/40" : "border-border-light"}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mocha/10" aria-hidden="true">
                <Gift size={18} className="text-mocha" />
              </span>
              <div>
                <h2 className="font-semibold text-charcoal">Gift Registry</h2>
                <p className="mt-1 text-sm text-text-muted">
                  {registry.description ||
                    "Share a guided gift list with your guests. You set it up from your order after checkout."}
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              {registry.included ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  <Check size={12} strokeWidth={3} aria-hidden="true" /> Included
                </span>
              ) : (
                <>
                  <p className="font-display text-lg font-bold text-charcoal">{formatPaise(registry.priceInPaise)}</p>
                  <p className="text-xs text-text-muted">one-time, optional</p>
                </>
              )}
            </div>
          </div>
          {!registry.included && registry.priceInPaise > 0 && (
            <label className="mt-4 flex items-center gap-2 text-sm font-medium text-charcoal cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(selections.giftRegistryCustomize)}
                onChange={(e) => onSelectionsChange({ ...selections, giftRegistryCustomize: e.target.checked })}
                className="h-4 w-4 cursor-pointer accent-mocha"
              />
              Add Gift Registry to my order
            </label>
          )}
        </div>
      )}

      <p className="rounded-xl border border-border bg-cream-dark/60 p-4 text-sm text-text-muted">
        Packaging and thank-you tags (where your package includes them) are matched to your theme automatically. You&apos;ll see them on the
        review step.
      </p>

      {viewer?.kind === "media" && (
        <MediaViewer
          items={viewer.items}
          initialIndex={viewer.index}
          title={viewer.title}
          description={viewer.description}
          onClose={() => setViewer(null)}
        />
      )}
      {viewer?.kind === "product" && (
        <MediaViewer
          items={productMedia(viewer.product)}
          title={viewer.product.title}
          description={viewer.product.description}
          onClose={() => setViewer(null)}
          action={
            <button
              type="button"
              onClick={() => {
                toggleChoice(viewer.service, viewer.product.sku);
                setViewer(null);
              }}
              className="btn-primary h-11 px-6 text-sm font-bold cursor-pointer"
            >
              {pickedFor(viewer.service.serviceId).includes(viewer.product.sku) ? "Remove from my package" : "Select this"}
            </button>
          }
        />
      )}
    </section>
  );
}
