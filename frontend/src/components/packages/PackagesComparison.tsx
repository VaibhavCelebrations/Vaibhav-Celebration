"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Loader2, Plus, X } from "lucide-react";
import {
  fetchPublicPackages,
  fetchQuote,
  formatINR,
  type PublicPackage,
} from "@/lib/packages-api";

type Props = {
  initialPackages: PublicPackage[];
};

export function PackagesComparison({ initialPackages }: Props) {
  const [packages, setPackages] = useState(initialPackages);
  const [customizeSlug, setCustomizeSlug] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, boolean>>({});
  const [quoteTotal, setQuoteTotal] = useState<number | null>(null);
  const [quoting, setQuoting] = useState(false);

  const activePkg = useMemo(
    () => packages.find((p) => p.slug === customizeSlug) ?? null,
    [packages, customizeSlug],
  );

  const allServiceLabels = useMemo(() => {
    const labels = new Map<string, { label: string; description: string | null; requirements: string | null }>();
    for (const pkg of packages) {
      for (const item of pkg.serviceItems) {
        if (!labels.has(item.extraServiceId)) {
          labels.set(item.extraServiceId, {
            label: item.extraService.label,
            description: item.extraService.description,
            requirements: item.extraService.requirements,
          });
        }
      }
    }
    return [...labels.entries()].map(([id, meta]) => ({ id, ...meta }));
  }, [packages]);

  useEffect(() => {
    if (!activePkg) {
      setQuoteTotal(null);
      return;
    }
    const customizable = activePkg.serviceItems.filter(
      (i) => !i.isIncluded && i.extraService.customizationPriceInPaise > 0,
    );
    const selected = customizable
      .filter((i) => selectedOptions[i.id])
      .map((i) => ({ optionId: i.id, quantity: 1 }));

    if (selected.length === 0) {
      setQuoteTotal(activePkg.priceInPaise);
      return;
    }

    setQuoting(true);
    fetchQuote({ packageId: activePkg.id, selectedOptions: selected })
      .then((q) => setQuoteTotal(q.totalInPaise))
      .catch(() => setQuoteTotal(activePkg.priceInPaise))
      .finally(() => setQuoting(false));
  }, [activePkg, selectedOptions]);

  function openCustomize(slug: string) {
    setCustomizeSlug(slug);
    setSelectedOptions({});
  }

  function isIncluded(pkg: PublicPackage, extraServiceId: string) {
    return pkg.serviceItems.find((i) => i.extraServiceId === extraServiceId)?.isIncluded ?? false;
  }

  if (packages.length === 0) {
    return (
      <p className="text-center text-sm text-text-muted py-16">
        Packages are being updated. Please check back shortly or{" "}
        <Link href="/consultation" className="text-mocha underline">
          book a consultation
        </Link>
        .
      </p>
    );
  }

  return (
    <>
      <div className="mt-16 overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse">
          <thead>
            <tr>
              <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-text-muted" />
              {packages.map((pkg) => (
                <th key={pkg.id} className="p-4 text-left align-top">
                  <div
                    className={`rounded-2xl p-6 h-full ${
                      pkg.isRecommended
                        ? "bg-cream-dark border-2 border-mocha shadow-card relative"
                        : "bg-cream border border-border"
                    }`}
                  >
                    {pkg.isRecommended && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-mocha text-white text-[10px] font-bold tracking-widest uppercase px-4 py-1.5 rounded-full whitespace-nowrap">
                        Most Chosen
                      </span>
                    )}
                    <h3 className="font-display text-2xl font-semibold text-charcoal">{pkg.title}</h3>
                    <p className="text-sm text-text-muted mt-2 min-h-[40px]">{pkg.description}</p>
                    <p className="mt-4 font-display text-3xl text-charcoal font-semibold">
                      {formatINR(pkg.priceInPaise)}
                    </p>
                    <p className="text-xs text-text-light mt-1">Onwards</p>
                    <div className="mt-4 flex flex-col gap-2">
                      {pkg.isCustomizable ? (
                        <button
                          type="button"
                          onClick={() => openCustomize(pkg.slug)}
                          className={`text-sm font-semibold px-6 py-3 rounded-lg text-center cursor-pointer ${
                            pkg.isRecommended ? "btn-primary" : "btn-outline"
                          }`}
                        >
                          Customize &amp; book
                        </button>
                      ) : (
                        <Link
                          href="/consultation"
                          className={`text-sm font-semibold px-6 py-3 rounded-lg text-center ${
                            pkg.isRecommended ? "btn-primary" : "btn-outline"
                          }`}
                        >
                          Choose {pkg.title}
                        </Link>
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allServiceLabels.map((svc) => (
              <tr key={svc.id} className="border-t border-border">
                <td className="p-4 text-sm font-medium text-charcoal align-top">
                  {svc.label}
                  {svc.requirements && (
                    <p className="mt-0.5 text-[11px] font-normal text-text-light">{svc.requirements}</p>
                  )}
                </td>
                {packages.map((pkg) => {
                  const included = isIncluded(pkg, svc.id);
                  return (
                    <td key={`${pkg.id}-${svc.id}`} className="p-4 text-center">
                      {included ? (
                        <Check size={18} className="mx-auto text-mocha" strokeWidth={2.5} />
                      ) : (
                        <X size={18} className="mx-auto text-text-light/40" strokeWidth={2} />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activePkg && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={(e) => e.target === e.currentTarget && setCustomizeSlug(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Customize ${activePkg.title}`}
            className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between border-b border-border p-5">
              <div>
                <h2 className="font-display text-xl font-semibold text-charcoal">
                  Customize {activePkg.title}
                </h2>
                <p className="text-sm text-text-muted mt-1">
                  Base price {formatINR(activePkg.priceInPaise)} — add optional services below.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                className="cursor-pointer rounded-lg p-1 hover:bg-cream"
                onClick={() => setCustomizeSlug(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {activePkg.serviceItems
                .filter((i) => i.isIncluded)
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg bg-cream/60 px-3 py-2 text-sm"
                  >
                    <Check size={16} className="text-mocha shrink-0" />
                    <span>{item.extraService.label} — included</span>
                  </div>
                ))}

              {activePkg.serviceItems
                .filter((i) => !i.isIncluded && i.extraService.customizationPriceInPaise > 0)
                .map((item) => (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:border-mocha/40 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={!!selectedOptions[item.id]}
                      onChange={(e) =>
                        setSelectedOptions((prev) => ({ ...prev, [item.id]: e.target.checked }))
                      }
                      className="mt-1 h-4 w-4 accent-mocha"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-charcoal">{item.extraService.label}</span>
                        <span className="text-sm font-semibold text-mocha shrink-0">
                          +{formatINR(item.extraService.customizationPriceInPaise)}
                        </span>
                      </div>
                      {item.extraService.description && (
                        <p className="text-xs text-text-muted mt-1">{item.extraService.description}</p>
                      )}
                      {item.extraService.requirements && (
                        <p className="text-[11px] text-text-light mt-1">
                          Requires: {item.extraService.requirements}
                        </p>
                      )}
                    </div>
                  </label>
                ))}

              {activePkg.serviceItems.filter(
                (i) => !i.isIncluded && i.extraService.customizationPriceInPaise > 0,
              ).length === 0 && (
                <p className="text-sm text-text-muted">All services are included in this package.</p>
              )}
            </div>

            <div className="border-t border-border p-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider">Estimated total</p>
                <p className="font-display text-2xl font-semibold text-charcoal flex items-center gap-2">
                  {quoting && <Loader2 size={18} className="animate-spin text-mocha" />}
                  {quoteTotal != null ? formatINR(quoteTotal) : formatINR(activePkg.priceInPaise)}
                </p>
              </div>
              <Link
                href="/consultation"
                className="btn-primary inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold"
              >
                <Plus size={16} /> Continue to book
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
