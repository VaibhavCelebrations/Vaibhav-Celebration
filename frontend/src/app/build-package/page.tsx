"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, ShoppingCart } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { FooterClient } from "@/components/layout/FooterClient";
import { useCatalog } from "@/context/catalog-context";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";
import { ApiClientError } from "@/lib/api-client";
import { getBuilderOptions, getBuilderQuote, type BuilderOptions, type BuilderQuote, type BuilderSelections } from "@/lib/builder-api";
import { formatPaise } from "@/lib/shop-types";
import { BasicsStep } from "./_components/BasicsStep";
import { BuilderStepper } from "./_components/BuilderStepper";
import { CustomizeStep } from "./_components/CustomizeStep";
import { ReviewStep } from "./_components/ReviewStep";
import {
  DRAFT_KEY,
  MIN_GUESTS,
  STEP_BASICS,
  STEP_CUSTOMIZE,
  STEP_REVIEW,
  estimateSubtotalInPaise,
  incompleteServices,
  normalizePackageSlug,
  pruneSelections,
  validateBasics,
  type Basics,
  type Draft,
} from "./_components/shared";

const QUOTE_DEBOUNCE_MS = 300;

function BuildPackageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { themes, packages, themesBySlug, packagesBySlug } = useCatalog();
  const { user } = useAuth();
  const { addPackage, closeCart } = useCart();

  /* ── State: the URL seeds it, then mirrors it, so a link or a refresh restores the same place ── */

  const [basics, setBasics] = useState<Basics>(() => ({
    pkgSlug: normalizePackageSlug(searchParams.get("pkg") ?? searchParams.get("package")),
    themeSlug: searchParams.get("theme"),
    guestCount: Math.max(MIN_GUESTS, parseInt(searchParams.get("guests") || "10", 10) || 10),
    location: searchParams.get("loc") === "jaipur" ? "jaipur" : "outside",
    eventDate: "",
    childName: "",
  }));
  const [selections, setSelections] = useState<BuilderSelections>(() => ({
    choices: Object.fromEntries(
      [...searchParams.entries()]
        .filter(([k, v]) => k.startsWith("pick.") && v)
        .map(([k, v]) => [k.slice(5), v.split(",").filter(Boolean)]),
    ),
    decor: searchParams.get("decor") === "1",
    giftRegistryCustomize: searchParams.get("grc") === "1",
    personalization: {},
  }));
  const [hydrated, setHydrated] = useState(false);
  const [showBasicsErrors, setShowBasicsErrors] = useState(false);
  const [flaggedServiceIds, setFlaggedServiceIds] = useState<string[]>([]);

  const [options, setOptions] = useState<BuilderOptions | null>(null);
  const [optionsKey, setOptionsKey] = useState<string | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [optionsAttempt, setOptionsAttempt] = useState(0);
  const optionsCache = useRef(new Map<string, BuilderOptions>());

  const [quote, setQuote] = useState<BuilderQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const patchBasics = useCallback((patch: Partial<Basics>) => setBasics((prev) => ({ ...prev, ...patch })), []);

  /* ── Draft: the date, name and personalization opt-ins are not in the URL ── */

  // Client-only: sessionStorage is unavailable during SSR, so the draft is restored after mount.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as Draft;
        setBasics((prev) => ({
          ...prev,
          eventDate: typeof draft.eventDate === "string" ? draft.eventDate : prev.eventDate,
          childName: typeof draft.childName === "string" ? draft.childName : prev.childName,
        }));
        // URL picks win (a shared link is explicit); the draft fills in what the URL can't carry.
        const saved = draft.selections;
        if (saved) {
          setSelections((prev) => ({
            ...prev,
            choices: Object.keys(prev.choices ?? {}).length ? prev.choices : (saved.choices ?? {}),
            personalization: saved.personalization ?? {},
          }));
        }
      }
    } catch {
      /* ignore a corrupt draft */
    }
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) return;
    try {
      const draft: Draft = { eventDate: basics.eventDate, childName: basics.childName, selections };
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* storage unavailable */
    }
  }, [hydrated, basics.eventDate, basics.childName, selections]);

  // A signed-in customer whose saved address is in Jaipur almost certainly celebrates there.
  const locationFromProfile = useRef(false);
  useEffect(() => {
    if (locationFromProfile.current || searchParams.has("loc")) return;
    const city = (user?.defaultAddress as { city?: string } | null | undefined)?.city;
    if (city?.trim().toLowerCase() === "jaipur") {
      locationFromProfile.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      patchBasics({ location: "jaipur" });
    }
  }, [user, searchParams, patchBasics]);

  /* ── Options for the chosen package + theme (prefetched as soon as both are known) ── */

  const selectedPkg = basics.pkgSlug ? packagesBySlug[basics.pkgSlug] : undefined;
  const selectedTheme = basics.themeSlug ? themesBySlug[basics.themeSlug] : undefined;
  const currentOptionsKey = selectedPkg && selectedTheme ? `${selectedPkg.slug}:${selectedTheme.slug}` : null;
  const optionsReady = options !== null && optionsKey === currentOptionsKey;

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!currentOptionsKey || !selectedPkg || !selectedTheme) return;
    let cancelled = false;

    const apply = (next: BuilderOptions) => {
      setOptions(next);
      setOptionsKey(currentOptionsKey);
      setOptionsError(null);
      setSelections((prev) => pruneSelections(prev, next));
    };

    const hit = optionsCache.current.get(currentOptionsKey);
    if (hit) {
      apply(hit);
      return;
    }
    setOptionsLoading(true);
    setOptionsError(null);
    getBuilderOptions({ theme: selectedTheme.slug, package: selectedPkg.slug })
      .then((next) => {
        optionsCache.current.set(currentOptionsKey, next);
        if (!cancelled) apply(next);
      })
      .catch((err) => {
        if (!cancelled) {
          setOptionsError(err instanceof ApiClientError ? err.message : "Could not load this package. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // selectedPkg/selectedTheme are derived from currentOptionsKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOptionsKey, optionsAttempt]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* ── Step: read from the URL so the browser's Back and Forward buttons move between steps ── */

  const basicsErrors = useMemo(() => validateBasics(basics, packagesBySlug, themesBySlug), [basics, packagesBySlug, themesBySlug]);
  const basicsValid = Object.keys(basicsErrors).length === 0;
  const missing = optionsReady && options ? incompleteServices(options.services, selections) : [];
  const choicesComplete = optionsReady && missing.length === 0;

  const requestedStep = Math.min(STEP_REVIEW, Math.max(STEP_BASICS, parseInt(searchParams.get("step") || "0", 10) || 0));
  // Never show a step whose prerequisites are missing (old links, edited URLs, a changed theme).
  // Until the draft is restored the date is unknown, so the requested step is trusted for that moment.
  const step = hydrated && !basicsValid ? STEP_BASICS : requestedStep === STEP_REVIEW && optionsReady && !choicesComplete ? STEP_CUSTOMIZE : requestedStep;

  const buildUrl = useCallback(
    (targetStep: number) => {
      const params = new URLSearchParams();
      params.set("step", String(targetStep));
      if (basics.themeSlug) params.set("theme", basics.themeSlug);
      if (basics.pkgSlug) params.set("pkg", basics.pkgSlug);
      params.set("guests", String(basics.guestCount));
      params.set("loc", basics.location);
      for (const [serviceId, skus] of Object.entries(selections.choices ?? {})) {
        if (skus.length) params.set(`pick.${serviceId}`, skus.join(","));
      }
      if (selections.decor) params.set("decor", "1");
      if (selections.giftRegistryCustomize) params.set("grc", "1");
      return `/build-package?${params.toString()}`;
    },
    [basics.themeSlug, basics.pkgSlug, basics.guestCount, basics.location, selections],
  );

  // Keep the address bar in step with the state without adding history entries.
  useEffect(() => {
    if (!hydrated) return;
    const url = buildUrl(step);
    if (url !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, "", url);
  }, [hydrated, buildUrl, step]);

  const goTo = useCallback(
    (target: number) => {
      // A new history entry per step: Back returns to the previous step instead of leaving the flow.
      window.history.pushState(null, "", buildUrl(target));
    },
    [buildUrl],
  );

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  /* ── Pricing: an estimate while choices are incomplete, the server's quote once they are ── */

  const canQuote = basicsErrors.pkgSlug === undefined && basicsErrors.themeSlug === undefined && basicsErrors.guestCount === undefined && choicesComplete;

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!canQuote || !selectedPkg || !selectedTheme) {
      setQuote(null);
      setQuoteError(null);
      setQuoteLoading(false);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    const timer = setTimeout(async () => {
      try {
        const next = await getBuilderQuote({
          packageSlug: selectedPkg.slug,
          themeSlug: selectedTheme.slug,
          guestCount: basics.guestCount,
          location: basics.location,
          selections,
        });
        if (!cancelled) {
          setQuote(next);
          setQuoteError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setQuote(null);
          setQuoteError(err instanceof ApiClientError ? err.message : "Could not calculate your total. Please try again.");
        }
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    }, QUOTE_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // selectedPkg/selectedTheme change only with the slugs already covered by canQuote + options
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canQuote, currentOptionsKey, basics.guestCount, basics.location, selections]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const estimate = estimateSubtotalInPaise(selectedPkg, optionsReady ? options : null, selections, basics.guestCount, basics.location);

  /* ── Navigation ── */

  const focusFirstError = (selector: string) => {
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(selector);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  };

  const onContinue = () => {
    if (step === STEP_BASICS) {
      if (!basicsValid) {
        setShowBasicsErrors(true);
        focusFirstError('main [role="alert"]');
        return;
      }
      goTo(STEP_CUSTOMIZE);
      return;
    }
    if (step === STEP_CUSTOMIZE) {
      if (!optionsReady) return;
      if (missing.length) {
        setFlaggedServiceIds(missing.map((s) => s.serviceId));
        focusFirstError(`#svc-${missing[0].serviceId}`);
        return;
      }
      goTo(STEP_REVIEW);
    }
  };

  const onCheckout = () => {
    if (!quote || !selectedPkg || !selectedTheme) return;
    addPackage({
      packageId: selectedPkg.slug,
      themeSlug: selectedTheme.slug,
      basePrice: quote.totalInPaise / 100,
      addons: [],
      builderInput: {
        packageSlug: selectedPkg.slug,
        themeSlug: selectedTheme.slug,
        guestCount: basics.guestCount,
        location: basics.location,
        selections,
        // Contact and delivery details are entered once, at checkout.
        eventDetails: { eventDate: basics.eventDate, childName: basics.childName.trim() || undefined },
        quoteSnapshot: quote,
      },
    });
    // addPackage opens the cart drawer; going straight to checkout, it would only cover the form.
    closeCart();
    router.push("/checkout");
  };

  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-32 min-h-screen bg-cream pb-32">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <BuilderStepper currentStep={step} onStepClick={goTo} />

          {step === STEP_BASICS && (
            <BasicsStep
              basics={basics}
              onChange={patchBasics}
              packages={packages}
              themes={themes}
              errors={showBasicsErrors ? basicsErrors : {}}
            />
          )}

          {step === STEP_CUSTOMIZE && (
            <CustomizeStep
              options={optionsReady ? options : null}
              loading={optionsLoading || !optionsReady}
              error={optionsError}
              onRetry={() => setOptionsAttempt((n) => n + 1)}
              themeTitle={selectedTheme?.title ?? ""}
              packageTitle={selectedPkg?.title ?? ""}
              guestCount={basics.guestCount}
              location={basics.location}
              selections={selections}
              onSelectionsChange={setSelections}
              flaggedServiceIds={flaggedServiceIds}
              onEditBasics={() => goTo(STEP_BASICS)}
            />
          )}

          {step === STEP_REVIEW && (
            <ReviewStep
              basics={basics}
              theme={selectedTheme}
              pkg={selectedPkg}
              options={optionsReady ? options : null}
              selections={selections}
              quote={quote}
              quoteLoading={quoteLoading}
              quoteError={quoteError}
              onEdit={goTo}
            />
          )}
        </div>

        {/* Sticky total + actions */}
        <div className="fixed bottom-0 inset-x-0 z-40 bg-charcoal text-white shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
          <div className="max-w-4xl mx-auto px-5 md:px-8 py-3 flex items-center justify-between gap-4">
            <div className="min-w-0" aria-live="polite">
              <p className="text-xs text-white/70">
                {quote ? "Total incl. GST" : estimate !== null ? "So far, before GST" : "Choose a package"}
              </p>
              <p className="text-xl font-bold flex items-center gap-2">
                {quote ? formatPaise(quote.totalInPaise) : estimate !== null ? formatPaise(estimate) : "—"}
                {quoteLoading && <Loader2 size={16} className="animate-spin text-white/70" aria-label="Updating total" />}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {step > STEP_BASICS && (
                <button
                  type="button"
                  onClick={() => goTo(step - 1)}
                  className="h-11 px-4 rounded-lg border border-white/25 text-sm text-white/90 hover:bg-white/10 flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <ArrowLeft size={14} aria-hidden="true" /> Back
                </button>
              )}
              {step < STEP_REVIEW ? (
                <button
                  type="button"
                  onClick={onContinue}
                  disabled={step === STEP_CUSTOMIZE && !optionsReady}
                  className="h-11 px-5 rounded-lg bg-mocha text-white text-sm font-semibold hover:bg-mocha-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  Continue <ArrowRight size={14} aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!quote || quoteLoading}
                  onClick={onCheckout}
                  className="h-11 px-5 rounded-lg bg-mocha text-white text-sm font-semibold hover:bg-mocha-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <ShoppingCart size={14} aria-hidden="true" /> <span className="hidden sm:inline">Continue to</span> Checkout
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

export default function BuildPackagePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-text-muted">
          <Loader2 className="animate-spin mr-2" /> Loading builder…
        </div>
      }
    >
      <BuildPackageContent />
    </Suspense>
  );
}
