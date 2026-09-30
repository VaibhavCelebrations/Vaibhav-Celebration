"use client";

import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { MediaThumb } from "@/components/media/MediaThumb";
import type { PackageCard, ThemeCard } from "@/lib/cms/types";
import { MAX_GUESTS, MIN_GUESTS, getTodayDateString, type Basics, type BasicsErrors } from "./shared";

type Props = {
  basics: Basics;
  onChange: (patch: Partial<Basics>) => void;
  packages: PackageCard[];
  themes: ThemeCard[];
  /** Only the errors that should be visible right now (empty until the customer tries to continue). */
  errors: BasicsErrors;
};

const sectionClass = "bg-surface rounded-3xl border border-border-light p-5 md:p-8 shadow-sm";
const labelClass = "block text-sm font-bold text-charcoal mb-2";
const inputClass =
  "w-full bg-cream-dark/50 border border-border-light rounded-xl px-4 py-3.5 text-charcoal outline-none focus:ring-2 focus:ring-mocha/30 focus:border-mocha focus:bg-surface transition-all placeholder:text-text-light aria-[invalid=true]:border-red-400";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-2 text-sm font-medium text-red-600">
      {message}
    </p>
  );
}

export function BasicsStep({ basics, onChange, packages, themes, errors }: Props) {
  const selectedPkg = packages.find((p) => p.slug === basics.pkgSlug) ?? null;
  // Arriving from a package page, the tier is already chosen: show it compactly, with a way to change it.
  const [pickingPackage, setPickingPackage] = useState(!selectedPkg);
  const showPackagePicker = pickingPackage || !selectedPkg;

  const setGuests = (n: number) => onChange({ guestCount: Math.min(MAX_GUESTS, Math.max(0, n)) });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl md:text-3xl font-semibold text-charcoal mb-2">Plan your celebration</h1>
        <p className="text-sm text-text-muted">
          Pick a theme and tell us the basics. You&apos;ll see everything in the package next, and enter delivery details only at
          checkout.
        </p>
      </header>

      {/* Package */}
      <section className={sectionClass} aria-labelledby="pkg-heading">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 id="pkg-heading" className="font-display text-lg md:text-xl font-semibold text-charcoal">
            Package
          </h2>
          {selectedPkg && !showPackagePicker && (
            <button
              type="button"
              onClick={() => setPickingPackage(true)}
              className="text-sm font-semibold text-mocha underline underline-offset-2 hover:text-mocha-dark cursor-pointer"
            >
              Change
            </button>
          )}
        </div>

        {selectedPkg && !showPackagePicker ? (
          <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl border-2 border-mocha bg-mocha/5 px-4 py-3">
            <div>
              <p className="font-semibold text-charcoal">{selectedPkg.title}</p>
              {selectedPkg.description && <p className="text-sm text-text-muted mt-0.5">{selectedPkg.description}</p>}
            </div>
            <p className="font-display text-lg font-bold text-mocha">{selectedPkg.priceLabel}</p>
          </div>
        ) : packages.length === 0 ? (
          <p className="text-sm text-text-muted">Packages are unavailable right now. Please try again in a moment.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3" role="radiogroup" aria-labelledby="pkg-heading" aria-describedby={errors.pkgSlug ? "pkg-error" : undefined}>
            {packages.map((pkg) => {
              const selected = pkg.slug === basics.pkgSlug;
              return (
                <button
                  key={pkg.slug}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    onChange({ pkgSlug: pkg.slug });
                    setPickingPackage(false);
                  }}
                  className={`relative rounded-2xl border p-4 text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha focus-visible:ring-offset-2 ${
                    selected ? "border-2 border-mocha bg-mocha/5" : "border-border hover:border-mocha/50"
                  }`}
                >
                  {pkg.isRecommended && (
                    <span className="absolute -top-2.5 left-4 rounded-full bg-mocha px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                      Most loved
                    </span>
                  )}
                  <span className="block font-semibold text-charcoal">{pkg.title}</span>
                  <span className="block font-display text-xl font-bold text-mocha mt-1">{pkg.priceLabel}</span>
                  {pkg.description && <span className="block text-sm text-text-muted mt-2 line-clamp-3">{pkg.description}</span>}
                </button>
              );
            })}
          </div>
        )}
        <FieldError id="pkg-error" message={errors.pkgSlug} />
      </section>

      {/* Theme */}
      <section className={sectionClass} aria-labelledby="theme-heading">
        <h2 id="theme-heading" className="font-display text-lg md:text-xl font-semibold text-charcoal">
          Theme
        </h2>
        <p className="text-sm text-text-muted mt-1 mb-5">Each theme has matching activities, gifts and décor, all coordinated.</p>
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
          role="radiogroup"
          aria-labelledby="theme-heading"
          aria-describedby={errors.themeSlug ? "theme-error" : undefined}
        >
          {themes.map((theme) => {
            const selected = theme.slug === basics.themeSlug;
            return (
              <button
                key={theme.slug}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange({ themeSlug: theme.slug })}
                className={`relative rounded-2xl border p-3 text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha focus-visible:ring-offset-2 ${
                  selected ? "border-2 border-mocha bg-mocha/5" : "border-border hover:border-mocha/50"
                }`}
              >
                <MediaThumb
                  media={theme.heroImageUrl ? { url: theme.heroImageUrl } : null}
                  alt={theme.title}
                  sizes="(max-width: 768px) 50vw, 220px"
                  className="aspect-[4/3] rounded-xl mb-3"
                />
                {selected && (
                  <span className="absolute top-5 right-5 flex h-7 w-7 items-center justify-center rounded-full bg-mocha text-white shadow" aria-hidden="true">
                    <Check size={16} strokeWidth={3} />
                  </span>
                )}
                <span className="block font-semibold text-charcoal text-sm md:text-base">{theme.title}</span>
                <span className="block text-xs text-text-muted mt-1 line-clamp-2">{theme.shortDescription}</span>
              </button>
            );
          })}
        </div>
        <FieldError id="theme-error" message={errors.themeSlug} />
      </section>

      {/* Details */}
      <section className={sectionClass} aria-labelledby="details-heading">
        <h2 id="details-heading" className="font-display text-lg md:text-xl font-semibold text-charcoal mb-5">
          Celebration details
        </h2>
        <div className="grid md:grid-cols-2 gap-x-10 gap-y-6">
          <div>
            <label htmlFor="bp-guests" className={labelClass}>
              Number of children attending
            </label>
            <div className="flex items-center bg-cream-dark/50 rounded-xl border border-border-light overflow-hidden h-14 w-44">
              <button
                type="button"
                onClick={() => setGuests(Math.max(MIN_GUESTS, basics.guestCount - 1))}
                disabled={basics.guestCount <= MIN_GUESTS}
                aria-label="One child fewer"
                className="w-12 h-full flex items-center justify-center text-charcoal hover:bg-mocha/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Minus size={18} aria-hidden="true" />
              </button>
              <input
                id="bp-guests"
                type="number"
                inputMode="numeric"
                min={MIN_GUESTS}
                max={MAX_GUESTS}
                value={basics.guestCount || ""}
                onChange={(e) => setGuests(parseInt(e.target.value, 10) || 0)}
                onBlur={() => basics.guestCount < MIN_GUESTS && setGuests(MIN_GUESTS)}
                aria-invalid={Boolean(errors.guestCount)}
                aria-describedby="guests-hint guests-error"
                className="flex-1 min-w-0 text-center font-display text-xl font-bold text-charcoal bg-transparent border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => setGuests(basics.guestCount + 1)}
                disabled={basics.guestCount >= MAX_GUESTS}
                aria-label="One more child"
                className="w-12 h-full flex items-center justify-center text-charcoal hover:bg-mocha/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={18} aria-hidden="true" />
              </button>
            </div>
            <p id="guests-hint" className="text-xs text-text-muted mt-2">
              Minimum {MIN_GUESTS} children per booking. Per-child items are priced for this number.
            </p>
            <FieldError id="guests-error" message={errors.guestCount} />
          </div>

          <div>
            <p id="loc-label" className={labelClass}>
              Is the celebration in Jaipur?
            </p>
            <div className="flex gap-3" role="radiogroup" aria-labelledby="loc-label">
              {(
                [
                  { value: "jaipur", label: "Yes, in Jaipur" },
                  { value: "outside", label: "No, another city" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={basics.location === opt.value}
                  onClick={() => onChange({ location: opt.value })}
                  className={`flex-1 h-14 px-3 rounded-xl border font-bold text-sm transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha focus-visible:ring-offset-2 ${
                    basics.location === opt.value
                      ? "border-2 border-mocha bg-mocha/5 text-mocha"
                      : "border-border-light text-charcoal hover:border-mocha/50 bg-surface"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-muted mt-2">On-site décor is available in Jaipur. Elsewhere you get a décor guide.</p>
          </div>

          <div>
            <label htmlFor="bp-date" className={labelClass}>
              Celebration date
            </label>
            <input
              id="bp-date"
              type="date"
              value={basics.eventDate}
              min={getTodayDateString()}
              onChange={(e) => onChange({ eventDate: e.target.value })}
              aria-invalid={Boolean(errors.eventDate)}
              aria-describedby="date-hint date-error"
              className={inputClass}
            />
            <p id="date-hint" className="text-xs text-text-muted mt-2">
              Orders need at least 7 days before the celebration.
            </p>
            <FieldError id="date-error" message={errors.eventDate} />
          </div>

          <div>
            <label htmlFor="bp-child" className={labelClass}>
              Child&apos;s name <span className="font-medium text-text-muted">(optional)</span>
            </label>
            <input
              id="bp-child"
              type="text"
              value={basics.childName}
              onChange={(e) => onChange({ childName: e.target.value })}
              maxLength={80}
              autoComplete="off"
              placeholder="Who are we celebrating?"
              className={inputClass}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
