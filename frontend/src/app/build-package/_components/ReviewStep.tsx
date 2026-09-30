"use client";

import { useState } from "react";
import { Check, Loader2, Pencil, Sparkles } from "lucide-react";
import { FreeDeliveryProgress } from "@/components/ecom/FreeDeliveryProgress";
import { MediaThumb } from "@/components/media/MediaThumb";
import { MediaViewer } from "@/components/media/MediaViewer";
import type { MediaItem } from "@/components/media/types";
import {
  buildStageSections,
  productMedia,
  type BuilderOptions,
  type BuilderQuote,
  type BuilderSelections,
} from "@/lib/builder-api";
import type { PackageCard, ThemeCard } from "@/lib/cms/types";
import { PERSONALIZATION_FOLLOW_UP_NOTE } from "@/lib/personalization";
import { formatPaise } from "@/lib/shop-types";
import { estimateLine, formatEventDate, type Basics } from "./shared";

const LINE_SECTIONS: Array<{ key: string; title: string }> = [
  { key: "package", title: "Package" },
  { key: "per-child", title: "Per-child items" },
  { key: "per-group", title: "Per-group items" },
  { key: "auto", title: "Matched to your theme" },
  { key: "fixed", title: "Add-ons" },
  { key: "decor", title: "Décor" },
];

type Props = {
  basics: Basics;
  theme: ThemeCard | undefined;
  pkg: PackageCard | undefined;
  options: BuilderOptions | null;
  selections: BuilderSelections;
  quote: BuilderQuote | null;
  quoteLoading: boolean;
  quoteError: string | null;
  onEdit: (step: number) => void;
};

function EditButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-mocha underline underline-offset-2 hover:text-mocha-dark cursor-pointer"
    >
      <Pencil size={13} aria-hidden="true" /> Edit
    </button>
  );
}

const cardClass = "rounded-3xl border border-border-light bg-surface p-4 md:p-6";

export function ReviewStep({ basics, theme, pkg, options, selections, quote, quoteLoading, quoteError, onEdit }: Props) {
  const [viewer, setViewer] = useState<{ title: string; items: MediaItem[]; description?: string | null } | null>(null);
  const sections = options ? buildStageSections(options, basics.location) : [];
  const decor = options ? (basics.location === "jaipur" ? options.decor.jaipur : options.decor.guide) : null;
  const decorChosen = basics.location === "outside" ? Boolean(decor) : Boolean(decor && selections.decor);
  // Inclusions already shown with their own preview are not repeated in the plain list.
  const shownLabels = new Set([...(options?.previews.map((p) => p.label) ?? []), decor?.label]);
  // The quote can name an inclusion twice (Gift Registry is added by two rules), so de-duplicate.
  const otherIncluded = [...new Set(quote?.includedLabels ?? [])].filter((label) => !shownLabels.has(label));

  return (
    <section className="space-y-6">
      <header>
        <h1 className="font-display text-2xl md:text-3xl font-semibold text-charcoal mb-2">Review your celebration</h1>
        <p className="text-sm text-text-muted">Check everything below. Contact and delivery details come next, at checkout.</p>
      </header>

      {/* Basics */}
      <div className={cardClass}>
        <div className="flex gap-4">
          <MediaThumb
            media={theme?.heroImageUrl ? { url: theme.heroImageUrl } : null}
            alt={theme?.title ?? "Theme"}
            sizes="160px"
            className="w-24 sm:w-36 shrink-0 self-start aspect-[4/3] rounded-2xl"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-mocha">{pkg?.title ?? "Package"}</p>
                <h2 className="font-display text-xl font-semibold text-charcoal">{theme?.title ?? "Theme"}</h2>
              </div>
              <EditButton onClick={() => onEdit(0)} label="Edit theme and details" />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-text-muted">Children</dt>
                <dd className="font-semibold text-charcoal">{basics.guestCount}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Location</dt>
                <dd className="font-semibold text-charcoal">{basics.location === "jaipur" ? "Jaipur" : "Outside Jaipur"}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Date</dt>
                <dd className="font-semibold text-charcoal">{basics.eventDate ? formatEventDate(basics.eventDate) : "Not set"}</dd>
              </div>
              {basics.childName.trim() && (
                <div>
                  <dt className="text-text-muted">Celebrating</dt>
                  <dd className="font-semibold text-charcoal">{basics.childName.trim()}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* What's in the package, by stage */}
      <div className={cardClass}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg md:text-xl font-semibold text-charcoal">What you&apos;re getting</h2>
          <EditButton onClick={() => onEdit(1)} label="Edit your choices" />
        </div>

        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.stage ?? "other"}>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-mocha">{section.label}</h3>
              <ul className="space-y-3">
                {section.previews.map((preview) => (
                  <li key={preview.serviceId} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setViewer({ title: preview.label, items: preview.media, description: preview.description })}
                      aria-label={`Preview ${preview.label}`}
                      className="shrink-0 rounded-xl overflow-hidden cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha"
                    >
                      <MediaThumb media={preview.media[0]} alt={preview.label} sizes="64px" className="h-14 w-16" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-charcoal">{preview.label}</p>
                      <p className="text-xs text-emerald-800 font-medium">Included</p>
                    </div>
                  </li>
                ))}
                {section.services.flatMap((svc) =>
                  (selections.choices?.[svc.serviceId] ?? []).map((sku) => {
                    const product = svc.products.find((p) => p.sku === sku);
                    if (!product) return null;
                    const personalized = Boolean(selections.personalization?.[sku]) && product.personalizationEnabled;
                    const line = estimateLine(product, basics.guestCount, product.pricingMode === "PER_GROUP", personalized);
                    const media = productMedia(product);
                    return (
                      <li key={`${svc.serviceId}-${sku}`} className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setViewer({ title: product.title, items: media, description: product.description })}
                          disabled={media.length === 0}
                          aria-label={`View ${product.title}`}
                          className="shrink-0 rounded-xl overflow-hidden cursor-zoom-in disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha"
                        >
                          <MediaThumb media={media[0]} alt={product.title} sizes="64px" className="h-14 w-16" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-text-muted">{svc.label}</p>
                          <p className="text-sm font-semibold text-charcoal">{product.title}</p>
                          {personalized && (
                            <p className="inline-flex items-center gap-1 text-xs font-semibold text-mocha">
                              <Sparkles size={11} aria-hidden="true" /> Personalized
                            </p>
                          )}
                        </div>
                        <p className="shrink-0 text-sm font-bold text-charcoal">{formatPaise(line.total)}</p>
                      </li>
                    );
                  }),
                )}
              </ul>
            </div>
          ))}

          {decorChosen && decor && (
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-mocha">Décor</h3>
              <div className="flex items-center gap-3">
                {decor.media.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setViewer({ title: decor.label, items: decor.media, description: decor.description })}
                    aria-label={`Preview ${decor.label}`}
                    className="shrink-0 rounded-xl overflow-hidden cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha"
                  >
                    <MediaThumb media={decor.media[0]} alt={decor.label} sizes="64px" className="h-14 w-16" />
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-charcoal">{decor.label}</p>
                  {basics.location === "outside" && <p className="text-xs text-emerald-800 font-medium">Included</p>}
                </div>
                {basics.location === "jaipur" && <p className="shrink-0 text-sm font-bold text-charcoal">{formatPaise(decor.priceInPaise)}</p>}
              </div>
            </div>
          )}

          {otherIncluded.length > 0 && (
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-mocha">Also included</h3>
              <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {otherIncluded.map((label) => (
                  <li key={label} className="flex items-start gap-2 text-sm text-charcoal">
                    <Check size={15} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" /> {label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Price */}
      <div className={cardClass} aria-busy={quoteLoading}>
        <h2 className="mb-4 font-display text-lg md:text-xl font-semibold text-charcoal">Price breakdown</h2>
        {quoteError && (
          <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {quoteError}
          </p>
        )}
        {!quote ? (
          !quoteError && (
            <p className="flex items-center gap-2 text-sm text-text-muted" role="status">
              <Loader2 className="animate-spin" size={16} aria-hidden="true" /> Calculating your total…
            </p>
          )
        ) : (
          <div className={quoteLoading ? "opacity-60 transition-opacity" : "transition-opacity"}>
            {LINE_SECTIONS.map(({ key, title }) => {
              const items = quote.lineItems.filter((l) => l.section === key);
              if (!items.length) return null;
              return (
                <div key={key} className="mb-5">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-mocha">{title}</p>
                  <ul className="space-y-2.5">
                    {items.map((item) => (
                      <li key={item.key} className="flex items-start justify-between gap-4 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium text-charcoal">{item.label}</p>
                          {item.sublabel && <p className="mt-0.5 text-xs text-text-muted">{item.sublabel}</p>}
                        </div>
                        <p className="shrink-0 font-bold text-charcoal whitespace-nowrap">{formatPaise(item.lineTotalInPaise)}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}

            {quote.hasPersonalization && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
                <Sparkles size={16} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
                <p className="text-sm leading-relaxed text-amber-900">
                  <strong>Personalized items in your package.</strong> {PERSONALIZATION_FOLLOW_UP_NOTE}
                </p>
              </div>
            )}

            <div className="space-y-2.5 border-t border-border-light pt-4">
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
              <div className="flex items-end justify-between border-t border-border-light pt-3">
                <span className="text-base font-bold text-charcoal">Total</span>
                <span className="font-display text-2xl font-bold text-mocha">{formatPaise(quote.totalInPaise)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {viewer && (
        <MediaViewer items={viewer.items} title={viewer.title} description={viewer.description} onClose={() => setViewer(null)} />
      )}
    </section>
  );
}
