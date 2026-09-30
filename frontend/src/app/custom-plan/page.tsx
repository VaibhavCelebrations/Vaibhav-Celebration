"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Check, Loader2, MessageCircle, Palette, ShoppingCart, X } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { FooterClient } from "@/components/layout/FooterClient";
import { whatsappHref } from "@/lib/cms/map-media";
import { envWhatsAppNumber } from "@/lib/business";
import { useCatalog } from "@/context/catalog-context";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";
import { ApiClientError } from "@/lib/api-client";
import * as authApi from "@/lib/customer-auth-api";
import {
  CUSTOM_PLAN_SLUG,
  getBuilderQuote,
  getCustomPlanOptions,
  type BuilderQuote,
  type CustomPlanOptions,
} from "@/lib/builder-api";
import { formatPaise } from "@/lib/shop-types";
import { PlanStepper, STEPS } from "./_components/PlanStepper";
import { DetailsStep } from "./_components/DetailsStep";
import { BuildStep } from "./_components/BuildStep";
import { AddonsStep } from "./_components/AddonsStep";
import { ReviewStep } from "./_components/ReviewStep";
import { CartSummary } from "./_components/CartSummary";
import {
  EMPTY_ADDRESS,
  EMPTY_CONTACT,
  EMPTY_DETAILS,
  EMPTY_SELECTIONS,
  MIN_GUESTS,
  STORAGE_KEY,
  countPicked,
  locationFor,
  toBuilderSelections,
  validateDetails,
  type AddressForm,
  type Contact,
  type Details,
  type Selections,
} from "./_components/shared";

const LAST_STEP = STEPS.length - 1;

/** Keep only picks the theme currently offers (and the gift registry only if it is still available). */
function pruneSelections(sel: Selections, options: CustomPlanOptions): Selections {
  const offered = new Map(options.services.map((s) => [s.serviceId, new Set(s.products.map((p) => p.sku))]));
  const choices: Record<string, string[]> = {};
  for (const [serviceId, skus] of Object.entries(sel.choices)) {
    const valid = skus.filter((sku) => offered.get(serviceId)?.has(sku));
    if (valid.length) choices[serviceId] = valid;
  }
  const addonSkus = new Set((options.addons ?? []).map((p) => p.sku));
  const serviceIds = new Set((options.previewServices ?? []).map((s) => s.serviceId));
  return {
    ...sel,
    choices,
    addons: (sel.addons ?? []).filter((sku) => addonSkus.has(sku)),
    services: (sel.services ?? []).filter((id) => serviceIds.has(id)),
    giftRegistry: sel.giftRegistry && options.giftRegistry.available,
  };
}

function CustomPlanContent() {
  const router = useRouter();
  const { themes } = useCatalog();
  const { user, isAuthenticated } = useAuth();
  const { addPackage } = useCart();

  const [step, setStep] = useState(0);
  const [details, setDetails] = useState<Details>(EMPTY_DETAILS);
  const [contact, setContact] = useState<Contact>(EMPTY_CONTACT);
  const [address, setAddress] = useState<AddressForm>(EMPTY_ADDRESS);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [themeSlug, setThemeSlug] = useState<string | null>(null);
  const [rawSelections, setRawSelections] = useState<Selections>(EMPTY_SELECTIONS);
  const [showErrors, setShowErrors] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [proceeding, setProceeding] = useState(false);

  const [options, setOptions] = useState<CustomPlanOptions | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const optionsCache = useRef(new Map<string, CustomPlanOptions>());

  const [quote, setQuote] = useState<BuilderQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // State, not a ref: the draft must not be saved until the render that carries the restored values,
  // or the first save would overwrite the stored draft with the empty defaults.
  const [hydrated, setHydrated] = useState(false);
  const whatsappUrl = whatsappHref(envWhatsAppNumber(), process.env.NEXT_PUBLIC_WHATSAPP_PREFILL_MESSAGE);

  /* ── Draft persistence ─────────────────────────────────────────── */

  // Client-only hydration: localStorage is unavailable during SSR, so the draft is restored post-mount.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.details) setDetails({ ...EMPTY_DETAILS, ...d.details });
        if (d.contact) setContact({ ...EMPTY_CONTACT, ...d.contact });
        if (d.address) setAddress({ ...EMPTY_ADDRESS, ...d.address });
        if (d.themeSlug) setThemeSlug(d.themeSlug);
        if (d.selections) setRawSelections({ ...EMPTY_SELECTIONS, ...d.selections });
        if (typeof d.step === "number") {
          const valid = Object.keys(validateDetails({ ...EMPTY_DETAILS, ...d.details }, { ...EMPTY_CONTACT, ...d.contact }, { ...EMPTY_ADDRESS, ...d.address })).length === 0;
          // Never restore past a step whose prerequisites are missing
          setStep(!valid ? 0 : !d.themeSlug ? Math.min(d.step, 1) : Math.min(d.step, LAST_STEP));
        }
      }
    } catch {
      /* ignore corrupt draft */
    }
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, details, contact, address, themeSlug, selections: rawSelections }));
    } catch {
      /* storage unavailable */
    }
  }, [hydrated, step, details, contact, address, themeSlug, rawSelections]);

  // Prefill from the signed-in customer's profile without overwriting anything they typed.
  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContact((c) => ({ name: c.name || user.name || "", email: c.email || user.email || "", phone: c.phone || user.phone || "" }));
    const a = user.defaultAddress;
    if (a) {
      setAddress((prev) =>
        prev.line1
          ? prev
          : {
              line1: a.line1 || "",
              line2: a.line2 || "",
              city: a.city || "",
              state: a.state || prev.state,
              country: a.country || prev.country,
              pincode: a.pincode || "",
            },
      );
    }
  }, [user]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  useEffect(() => {
    if (!cartOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setCartOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cartOpen]);

  /* ── Theme options (all products across all packages) ──────────── */

  useEffect(() => {
    if (!themeSlug || step < 2) return;
    const hit = optionsCache.current.get(themeSlug);
    if (hit) {
      setOptions(hit);
      setOptionsError(null);
      return;
    }
    let cancelled = false;
    setOptionsLoading(true);
    setOptionsError(null);
    getCustomPlanOptions(themeSlug)
      .then((o) => {
        optionsCache.current.set(themeSlug, o);
        if (!cancelled) setOptions(o);
      })
      .catch(() => {
        if (!cancelled) setOptionsError("We couldn't load items for this theme. Please try again or pick another theme.");
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [themeSlug, step]);

  const optionsReady = options !== null && options.themeSlug === themeSlug;

  // What the customer picked, minus anything the theme no longer offers (admin edited products,
  // or a stale draft) — derived rather than synced, so the cart can never hold an unavailable item.
  const activeSelections = useMemo(
    () => (optionsReady && options ? pruneSelections(rawSelections, options) : rawSelections),
    [rawSelections, options, optionsReady],
  );
  const selections = activeSelections;

  /* ── Live quote (server-priced: per-child / per-group / MOQ / personalization / shipping / GST) ── */

  const pickedCount = countPicked(selections);
  const location = locationFor(address.city);
  const canQuote = step >= 2 && Boolean(themeSlug) && optionsReady && pickedCount > 0 && details.guestCount >= MIN_GUESTS;
  const builderSelections = useMemo(() => toBuilderSelections(selections), [selections]);

  useEffect(() => {
    if (!canQuote || !themeSlug) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const q = await getBuilderQuote({
          packageSlug: CUSTOM_PLAN_SLUG,
          themeSlug,
          guestCount: details.guestCount,
          location,
          selections: builderSelections,
        });
        if (!cancelled) setQuote(q);
      } catch (err) {
        if (!cancelled) {
          setQuote(null);
          setQuoteError(err instanceof ApiClientError ? err.message : "We couldn't calculate your total. Please try again.");
        }
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [canQuote, themeSlug, details.guestCount, location, builderSelections]);

  const shownQuote = canQuote ? quote : null;

  /* ── Handlers ──────────────────────────────────────────────────── */

  const errors = showErrors ? validateDetails(details, contact, address) : {};

  const goTo = useCallback((next: number) => {
    setStep(next);
    setCartOpen(false);
  }, []);

  const toggleChoice = useCallback((serviceId: string, sku: string) => {
    setRawSelections((prev) => {
      const current = prev.choices[serviceId] ?? [];
      const next = current.includes(sku) ? current.filter((s) => s !== sku) : [...current, sku];
      return { ...prev, choices: { ...prev.choices, [serviceId]: next } };
    });
  }, []);

  const togglePersonalize = useCallback((sku: string, on: boolean) => {
    setRawSelections((prev) => ({ ...prev, personalization: { ...prev.personalization, [sku]: on } }));
  }, []);

  const removeChoice = useCallback((serviceId: string, sku: string) => {
    setRawSelections((prev) => ({
      ...prev,
      choices: { ...prev.choices, [serviceId]: (prev.choices[serviceId] ?? []).filter((s) => s !== sku) },
    }));
  }, []);

  const toggleIn = (key: "addons" | "services") => (value: string) =>
    setRawSelections((prev) => {
      const current = prev[key] ?? [];
      return { ...prev, [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] };
    });
  const toggleAddon = toggleIn("addons");
  const toggleService = toggleIn("services");

  const selectTheme = (slug: string) => {
    if (slug === themeSlug) return;
    setThemeSlug(slug);
    // Everything picked belongs to the old theme.
    setRawSelections((prev) => ({ ...prev, choices: {}, personalization: {}, addons: [], services: [] }));
    setQuote(null);
  };

  const themeTitle = themes.find((t) => t.slug === themeSlug)?.title ?? themeSlug ?? "";

  const handleContinue = () => {
    if (step === 0) {
      if (Object.keys(validateDetails(details, contact, address)).length > 0) {
        setShowErrors(true);
        setTimeout(() => document.querySelector('[role="alert"]')?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
        return;
      }
    }
    goTo(Math.min(LAST_STEP, step + 1));
  };

  const handleCheckout = async () => {
    if (!quote || !themeSlug || proceeding) return;
    if (Object.keys(validateDetails(details, contact, address)).length > 0) {
      setShowErrors(true);
      goTo(0);
      return;
    }
    setProceeding(true);
    if (saveAsDefault && isAuthenticated) {
      try {
        await authApi.updateProfile({
          defaultAddress: { fullName: contact.name, ...address, line2: address.line2 },
        });
      } catch {
        // Saving the default address is a convenience — never block checkout on it.
      }
    }

    addPackage({
      packageId: CUSTOM_PLAN_SLUG,
      themeSlug,
      basePrice: quote.subtotalInPaise / 100,
      addons: [],
      builderInput: {
        packageSlug: CUSTOM_PLAN_SLUG,
        themeSlug,
        guestCount: details.guestCount,
        location,
        selections: builderSelections,
        eventDetails: {
          eventDate: details.eventDate,
          childName: details.childName.trim(),
          childAge: details.childAge,
          venue: address.line1,
          notes: `${details.eventType} celebration`,
        },
        contactEmail: contact.email.trim(),
        contactPhone: contact.phone.trim(),
        shippingAddress: {
          fullName: contact.name.trim(),
          line1: address.line1.trim(),
          line2: address.line2.trim(),
          city: address.city.trim(),
          state: address.state.trim(),
          pincode: address.pincode.trim(),
          country: address.country.trim(),
        },
        quoteSnapshot: quote,
      },
    });
    router.push("/checkout");
  };

  const canContinue =
    step === 0 ? true : step === 1 ? Boolean(themeSlug) : step === 2 ? pickedCount > 0 : step === 3 ? true : false;
  const onFinalStep = step === LAST_STEP;
  const showAside = step === 2 || step === 3;
  const showCartButton = showAside && pickedCount > 0;

  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-32 pb-40 min-h-screen bg-cream">
        <div className={`mx-auto px-5 md:px-8 ${showAside ? "max-w-6xl" : "max-w-4xl"}`}>
          <PlanStepper currentStep={step} onStepClick={goTo} />

          <div className={showAside ? "lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10 lg:items-start" : ""}>
            <div className="min-w-0">
              {step === 0 && (
                <DetailsStep
                  details={details}
                  contact={contact}
                  address={address}
                  errors={errors}
                  isAuthenticated={isAuthenticated}
                  saveAsDefault={saveAsDefault}
                  onDetails={(p) => setDetails((d) => ({ ...d, ...p }))}
                  onContact={(p) => setContact((c) => ({ ...c, ...p }))}
                  onAddress={(p) => setAddress((a) => ({ ...a, ...p }))}
                  onSaveAsDefault={setSaveAsDefault}
                />
              )}

              {step === 1 && (
                <section className="animate-slide-up">
                  <h1 className="font-display text-2xl md:text-3xl font-semibold text-charcoal mb-2">Choose a theme</h1>
                  <p className="text-sm text-text-muted mb-8">
                    Every item in your plan is coordinated with the theme you pick.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4" role="radiogroup" aria-label="Theme">
                    {themes.map((theme) => {
                      const selected = themeSlug === theme.slug;
                      return (
                        <button
                          key={theme.slug}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => selectTheme(theme.slug)}
                          className={`relative rounded-2xl border p-3 text-left transition-all bg-surface ${
                            selected ? "border-2 border-mocha shadow-md ring-2 ring-mocha/10" : "border-border hover:border-mocha/40"
                          }`}
                        >
                          {theme.heroImageUrl ? (
                            <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden mb-3 bg-cream-dark">
                              <Image src={theme.heroImageUrl} alt={theme.title} fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
                            </div>
                          ) : (
                            <div className="w-full aspect-[4/3] rounded-xl bg-cream-dark mb-3 flex items-center justify-center">
                              <Palette className="text-mocha/30" size={32} />
                            </div>
                          )}
                          {selected && (
                            <span className="absolute top-5 right-5 w-7 h-7 rounded-full bg-mocha text-white flex items-center justify-center shadow">
                              <Check size={16} strokeWidth={3} />
                            </span>
                          )}
                          <p className="text-sm font-semibold text-charcoal truncate">{theme.title}</p>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {step === 2 && (
                <BuildStep
                  services={optionsReady && options ? options.services : []}
                  previewServices={optionsReady && options ? (options.previewServices ?? []) : []}
                  onToggleService={toggleService}
                  loading={optionsLoading || (!optionsReady && !optionsError)}
                  error={optionsError}
                  themeTitle={themeTitle}
                  guestCount={details.guestCount}
                  selections={selections}
                  onToggle={toggleChoice}
                  onPersonalize={togglePersonalize}
                  onChangeTheme={() => goTo(1)}
                  whatsappUrl={whatsappUrl}
                />
              )}

              {step === 3 && (
                <AddonsStep
                  addons={optionsReady && options ? (options.addons ?? []) : []}
                  themeTitle={themeTitle}
                  guestCount={details.guestCount}
                  selectedAddons={selections.addons}
                  personalization={selections.personalization}
                  onToggleAddon={toggleAddon}
                  onPersonalize={togglePersonalize}
                  giftRegistry={optionsReady && options ? options.giftRegistry : null}
                  selected={selections.giftRegistry}
                  onToggle={(on) => setRawSelections((prev) => ({ ...prev, giftRegistry: on }))}
                />
              )}

              {step === 4 && (
                <ReviewStep
                  details={details}
                  contact={contact}
                  address={address}
                  themeTitle={themeTitle}
                  quote={shownQuote}
                  quoteLoading={quoteLoading}
                  quoteError={quoteError}
                  onEdit={goTo}
                  onRemoveChoice={removeChoice}
                  onRemoveAddon={toggleAddon}
                  onRemoveService={toggleService}
                  onRemoveGiftRegistry={() => setRawSelections((prev) => ({ ...prev, giftRegistry: false }))}
                />
              )}
            </div>

            {showAside && (
              <aside className="hidden lg:block sticky top-28" aria-label="Your cart">
                <div className="bg-surface rounded-3xl border border-border-light shadow-sm p-6">
                  <h2 className="font-display text-lg font-semibold text-charcoal mb-4 flex items-center gap-2">
                    <ShoppingCart size={18} className="text-mocha" /> Your cart
                    {pickedCount > 0 && <span className="text-xs font-semibold text-text-muted">({pickedCount})</span>}
                  </h2>
                  <CartSummary
                    quote={shownQuote}
                    loading={quoteLoading}
                    error={quoteError}
                    onRemoveChoice={removeChoice}
                    onRemoveAddon={toggleAddon}
                    onRemoveService={toggleService}
                    onRemoveGiftRegistry={() => setRawSelections((prev) => ({ ...prev, giftRegistry: false }))}
                  />
                </div>
              </aside>
            )}
          </div>
        </div>

        {/* Mobile cart sheet */}
        {cartOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Your cart">
            <button type="button" aria-label="Close cart" className="absolute inset-0 bg-charcoal/50 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
            <div className="absolute bottom-0 inset-x-0 bg-surface rounded-t-3xl max-h-[85vh] overflow-y-auto p-6 pb-28 shadow-2xl animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-semibold text-charcoal">Your cart ({pickedCount})</h2>
                <button type="button" onClick={() => setCartOpen(false)} aria-label="Close" className="text-text-muted hover:text-charcoal">
                  <X size={20} />
                </button>
              </div>
              <CartSummary
                quote={shownQuote}
                loading={quoteLoading}
                error={quoteError}
                onRemoveChoice={removeChoice}
                onRemoveAddon={toggleAddon}
                onRemoveService={toggleService}
                onRemoveGiftRegistry={() => setRawSelections((prev) => ({ ...prev, giftRegistry: false }))}
              />
            </div>
          </div>
        )}

        {/* Sticky action bar */}
        <div className="fixed bottom-0 inset-x-0 z-[60] bg-charcoal text-white shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
          <div className="max-w-6xl mx-auto px-5 md:px-8 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              {step >= 2 && pickedCount > 0 ? (
                <button
                  type="button"
                  onClick={() => showCartButton && setCartOpen(true)}
                  className={`text-left ${showCartButton ? "lg:pointer-events-none" : "pointer-events-none"}`}
                >
                  <div className="text-[11px] text-white/60">
                    {pickedCount} item{pickedCount === 1 ? "" : "s"} · total incl. GST
                    {showCartButton && <span className="lg:hidden underline underline-offset-2 ml-1.5">View cart</span>}
                  </div>
                  <div className="text-xl font-bold">{shownQuote ? formatPaise(shownQuote.totalInPaise) : "…"}</div>
                </button>
              ) : step === 2 ? (
                <div className="text-sm text-white/70">Pick at least one item to continue</div>
              ) : (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white">
                  <MessageCircle size={16} /> <span className="hidden sm:inline">Need help?</span>
                </a>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => goTo(step - 1)}
                  className="px-4 py-2.5 rounded-lg border border-white/20 text-sm text-white/80 hover:bg-white/10 flex items-center gap-1"
                >
                  <ArrowLeft size={14} /> Back
                </button>
              )}
              {onFinalStep ? (
                <button
                  type="button"
                  disabled={!shownQuote || quoteLoading || proceeding}
                  onClick={handleCheckout}
                  className="px-5 py-2.5 rounded-lg bg-mocha text-white text-sm font-semibold disabled:opacity-40 flex items-center gap-2"
                >
                  {proceeding ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
                  Proceed to Checkout
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!canContinue}
                  onClick={handleContinue}
                  className="px-5 py-2.5 rounded-lg bg-mocha text-white text-sm font-semibold disabled:opacity-40 flex items-center gap-1"
                >
                  Continue <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      <FooterClient />
    </>
  );
}

export default function CustomPlanPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-cream">
          <Loader2 className="animate-spin text-mocha" size={32} />
        </div>
      }
    >
      <CustomPlanContent />
    </Suspense>
  );
}
