"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Minus,
  Plus,
  Palette,
  Package,
  Users,
  Gift,
  ClipboardCheck,
  ShoppingCart,
  Info,
  X,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { FooterClient } from "@/components/layout/FooterClient";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { useCatalog } from "@/context/catalog-context";
import { useAuth } from "@/context/auth-context";
import { useCart } from "@/context/cart-context";
import {
  getBuilderQuote,
  listBuilderProducts,
  type BuilderProduct,
  type BuilderQuote,
  type BuilderSelections,
} from "@/lib/builder-api";
import { formatPaise } from "@/lib/shop-types";
import { FreeDeliveryProgress } from "@/components/ecom/FreeDeliveryProgress";
import { ApiClientError } from "@/lib/api-client";

type Tier = "standard" | "premium" | "luxe";
type Location = "jaipur" | "outside";

const STEPS = [
  { label: "Theme", icon: Palette },
  { label: "Package", icon: Package },
  { label: "Details", icon: Users },
  { label: "Customize", icon: Gift },
  { label: "Decor", icon: Sparkles },
  { label: "Review", icon: ClipboardCheck },
] as const;

const TIER_META: Record<
  Tier,
  { eyebrow: string; blurb: string }
> = {
  standard: { eyebrow: "STANDARD", blurb: "Thoughtful essentials" },
  premium: { eyebrow: "PREMIUM", blurb: "Complete experience" },
  luxe: { eyebrow: "LUXE", blurb: "Signature celebration" },
};

function parseTier(v: string | null): Tier | null {
  if (v === "standard" || v === "premium" || v === "luxe") return v;
  if (v === "lux") return "luxe";
  return null;
}

function BuilderStepper({
  currentStep,
  onStepClick,
}: {
  currentStep: number;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="flex items-center justify-center w-full max-w-4xl mx-auto mb-10">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        const Icon = step.icon;
        const canClick = index < currentStep;
        return (
          <div key={step.label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center relative">
              <button
                type="button"
                onClick={() => canClick && onStepClick(index)}
                disabled={!canClick}
                className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 shrink-0 ${
                  isCompleted
                    ? "bg-mocha text-white shadow-md cursor-pointer hover:scale-105"
                    : isActive
                      ? "bg-mocha text-white shadow-lg scale-110"
                      : "bg-cream-dark text-text-light border border-border-light cursor-default"
                }`}
              >
                {isCompleted ? <Check size={18} /> : <Icon size={18} />}
              </button>
              <span
                className={`hidden md:block absolute top-14 text-[11px] font-semibold whitespace-nowrap ${
                  isCompleted || isActive ? "text-charcoal" : "text-text-light"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className="flex-1 h-[2px] mx-2 md:mx-3 relative">
                <div className="absolute inset-0 bg-border-light rounded-full" />
                <div
                  className="absolute inset-y-0 left-0 bg-mocha rounded-full transition-all duration-700"
                  style={{ width: isCompleted ? "100%" : "0%" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProductPicker({
  title,
  products,
  selectedSku,
  guestCount,
  multi,
  selectedSkus,
  personalization,
  onPersonalizationChange,
  onSelect,
  onToggle,
}: {
  title: string;
  products: BuilderProduct[];
  selectedSku?: string | null;
  guestCount: number;
  multi?: boolean;
  selectedSkus?: string[];
  personalization?: Record<string, boolean>;
  onPersonalizationChange?: (sku: string, enabled: boolean) => void;
  onSelect?: (sku: string) => void;
  onToggle?: (sku: string) => void;
}) {
  return (
    <div className="mb-8">
      <h3 className="text-base font-semibold text-charcoal mb-3">{title}</h3>
      {products.length === 0 ? (
        <p className="text-sm text-text-muted">No products available for this theme yet.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {products.map((p) => {
            const selected = multi
              ? (selectedSkus ?? []).includes(p.sku)
              : selectedSku === p.sku;
            const qty = Math.max(guestCount, p.minOrderQuantity);
            const moqNote = guestCount < p.minOrderQuantity;
            const personalizeOn = Boolean(personalization?.[p.sku]);
            const unitWithPersonalization = p.priceInPaise + (personalizeOn ? p.personalizationCostInPaise : 0);
            const line =
              p.pricingMode === "PER_GROUP"
                ? guestCount < p.minOrderQuantity
                  ? unitWithPersonalization * p.minOrderQuantity
                  : unitWithPersonalization
                : unitWithPersonalization * qty;
            return (
              <div
                key={p.sku}
                className={`text-left rounded-xl p-3 border transition-all flex flex-col ${
                  selected
                    ? "border-2 border-mocha bg-mocha/5"
                    : "border-border hover:border-mocha/50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => (multi ? onToggle?.(p.sku) : onSelect?.(p.sku))}
                  className="text-left flex flex-col flex-1 cursor-pointer"
                >
                <div className="relative w-full aspect-[4/3] mb-3 rounded-lg overflow-hidden bg-cream-dark">
                  <Image src={p.imageUrl ?? "/placeholder-product.svg"} alt={p.title} fill className="object-cover" sizes="(max-width: 768px) 50vw, 33vw" />
                </div>
                <div className="text-sm font-bold text-mocha">{formatPaise(p.priceInPaise)}</div>
                <div className="text-sm text-charcoal mt-1 font-medium">{p.title}</div>
                {p.personalizationEnabled && (
                  <span className="inline-block mt-2 text-[10px] font-semibold text-mocha bg-mocha/10 px-2 py-0.5 rounded uppercase tracking-wider">
                    Personalizable · +{formatPaise(p.personalizationCostInPaise)}
                  </span>
                )}
                {p.pricingMode === "PER_GROUP" ? (
                  <span className="inline-block mt-2 text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded">
                    per group
                  </span>
                ) : selected ? (
                  <span className="inline-block mt-2 text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded">
                    × {qty} = {formatPaise(line)}
                  </span>
                ) : null}
                {moqNote && selected && (
                  <p className="text-[10px] text-amber-700 mt-1">
                    Minimum {p.minOrderQuantity} units — charged for {qty}
                  </p>
                )}
                </button>
                {selected && p.personalizationEnabled && (
                  <div className="mt-3 space-y-2 border-t border-border-light pt-3">
                    <p className="text-[11px] font-semibold text-charcoal">Add personalization?</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onPersonalizationChange?.(p.sku, true)}
                        className={`rounded-lg border px-2 py-2 text-[11px] font-medium cursor-pointer ${personalizeOn ? "border-mocha bg-mocha/10" : "border-border-light"}`}
                      >
                        Yes (+{formatPaise(p.personalizationCostInPaise)}/unit)
                      </button>
                      <button
                        type="button"
                        onClick={() => onPersonalizationChange?.(p.sku, false)}
                        className={`rounded-lg border px-2 py-2 text-[11px] font-medium cursor-pointer ${!personalizeOn ? "border-mocha bg-mocha/10" : "border-border-light"}`}
                      >
                        No
                      </button>
                    </div>
                    {personalizeOn && (
                      <p className="text-[10px] text-amber-800 bg-amber-50 rounded-lg p-2">
                        Our team will contact you to collect personalization details.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BuildPackageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { themes, packagesBySlug } = useCatalog();
  const { isAuthenticated, user, openAuthModal } = useAuth();
  const { addPackage } = useCart();

  const initialPkg =
    parseTier(searchParams.get("pkg")) ?? parseTier(searchParams.get("package"));
  const initialTheme = searchParams.get("theme");
  const initialGuests = Math.max(5, parseInt(searchParams.get("guests") || "10", 10) || 10);
  const initialLoc = (searchParams.get("loc") === "outside" ? "outside" : "jaipur") as Location;
  const initialStep = Math.min(5, Math.max(0, parseInt(searchParams.get("step") || "0", 10) || 0));

  const [step, setStep] = useState(initialTheme ? (initialPkg ? Math.max(initialStep, 2) : 1) : initialStep);
  const [themeSlug, setThemeSlug] = useState<string | null>(initialTheme);
  const [pkgSlug, setPkgSlug] = useState<Tier | null>(initialPkg);
  const [guestCount, setGuestCount] = useState(initialGuests);
  const [location, setLocation] = useState<Location>(initialLoc);
  const [selections, setSelections] = useState<BuilderSelections>({
    welcomeItem: searchParams.get("welcome"),
    activity1: searchParams.get("act1"),
    activity2: searchParams.get("act2"),
    returnGift: searchParams.get("gift"),
    familyActivity: searchParams.get("family"),
    decor: searchParams.get("decor") === "1",
    giftRegistryCustomize: searchParams.get("grc") === "1",
    personalization: {},
  });

  const [welcomeProducts, setWelcomeProducts] = useState<BuilderProduct[]>([]);
  const [activityProducts, setActivityProducts] = useState<BuilderProduct[]>([]);
  const [giftProducts, setGiftProducts] = useState<BuilderProduct[]>([]);
  const [familyProducts, setFamilyProducts] = useState<BuilderProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [quote, setQuote] = useState<BuilderQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [guestName, setGuestName] = useState(user?.name ?? "");
  const [guestEmail, setGuestEmail] = useState(user?.email ?? "");
  const [guestPhone, setGuestPhone] = useState(user?.phone ?? "");
  const [guestAddress, setGuestAddress] = useState("");
  const [guestCity, setGuestCity] = useState("");
  const [guestPincode, setGuestPincode] = useState("");
  const [showBreakdown, setShowBreakdown] = useState(false);

  const activeThemes = themes;
  const packages = useMemo(
    () =>
      (["standard", "premium", "luxe"] as Tier[])
        .map((s) => packagesBySlug[s])
        .filter(Boolean),
    [packagesBySlug],
  );

  const selectedPkg = pkgSlug ? packagesBySlug[pkgSlug] : null;

  const syncUrl = useCallback(
    (next: {
      step?: number;
      theme?: string | null;
      pkg?: Tier | null;
      guests?: number;
      loc?: Location;
      selections?: BuilderSelections;
    }) => {
      const params = new URLSearchParams();
      const s = next.step ?? step;
      const th = next.theme !== undefined ? next.theme : themeSlug;
      const pk = next.pkg !== undefined ? next.pkg : pkgSlug;
      const g = next.guests ?? guestCount;
      const loc = next.loc ?? location;
      const sel = next.selections ?? selections;
      params.set("step", String(s));
      if (th) params.set("theme", th);
      if (pk) params.set("pkg", pk);
      if (g) params.set("guests", String(g));
      params.set("loc", loc);
      if (sel.welcomeItem) params.set("welcome", sel.welcomeItem);
      if (sel.activity1) params.set("act1", sel.activity1);
      if (sel.activity2) params.set("act2", sel.activity2);
      if (sel.returnGift) params.set("gift", sel.returnGift);
      if (sel.familyActivity) params.set("family", sel.familyActivity);
      if (sel.decor) params.set("decor", "1");
      if (sel.giftRegistryCustomize) params.set("grc", "1");
      router.replace(`/build-package?${params.toString()}`, { scroll: false });
    },
    [step, themeSlug, pkgSlug, guestCount, location, selections, router],
  );

  const goTo = (nextStep: number) => {
    setStep(nextStep);
    syncUrl({ step: nextStep });
  };

  // Load products when entering customize
  useEffect(() => {
    if (step !== 3 || !themeSlug || !pkgSlug) return;
    let cancelled = false;
    (async () => {
      setLoadingProducts(true);
      try {
        const [welcome, activities, gifts, family] = await Promise.all([
          listBuilderProducts({ theme: themeSlug, category: "welcome-items", tier: pkgSlug }),
          listBuilderProducts({ theme: themeSlug, category: "children-activities", tier: pkgSlug }),
          listBuilderProducts({ theme: themeSlug, category: "return-gifts", tier: pkgSlug }),
          pkgSlug === "luxe"
            ? listBuilderProducts({ theme: themeSlug, category: "family-activities", tier: pkgSlug })
            : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setWelcomeProducts(welcome);
        setActivityProducts(activities);
        setGiftProducts(gifts);
        setFamilyProducts(family);
      } catch {
        if (!cancelled) setQuoteError("Could not load products for this theme.");
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, themeSlug, pkgSlug]);

  // Refresh quote on review + sticky total when enough state
  const canQuote =
    !!themeSlug &&
    !!pkgSlug &&
    guestCount >= 5 &&
    !!selections.activity1 &&
    !!selections.returnGift &&
    (pkgSlug === "standard" || !!selections.welcomeItem) &&
    (pkgSlug === "standard" || !!selections.activity2) &&
    (pkgSlug !== "luxe" || !!selections.familyActivity);

  useEffect(() => {
    if (!canQuote || step < 3) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const q = await getBuilderQuote({
          packageSlug: pkgSlug!,
          themeSlug: themeSlug!,
          guestCount,
          location,
          selections,
        });
        if (!cancelled) setQuote(q);
      } catch (err) {
        if (!cancelled) {
          setQuote(null);
          setQuoteError(err instanceof ApiClientError ? err.message : "Quote failed");
        }
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [canQuote, themeSlug, pkgSlug, guestCount, location, selections, step]);

  useEffect(() => {
    if (user) {
      setGuestName((n) => n || user.name || "");
      setGuestEmail((e) => e || user.email || "");
      setGuestPhone((p) => p || user.phone || "");
    }
  }, [user]);

  const needsWelcome = pkgSlug === "premium" || pkgSlug === "luxe";
  const needsTwoActivities = pkgSlug === "premium" || pkgSlug === "luxe";
  const needsFamily = pkgSlug === "luxe";

  const canContinue = () => {
    if (step === 0) return !!themeSlug;
    if (step === 1) return !!pkgSlug;
    if (step === 2) return guestCount >= 5;
    if (step === 3) {
      if (!selections.activity1 || !selections.returnGift) return false;
      if (needsWelcome && !selections.welcomeItem) return false;
      if (needsTwoActivities && !selections.activity2) return false;
      if (needsFamily && !selections.familyActivity) return false;
      return true;
    }
    if (step === 4) return true;
    return false;
  };

  const onContinue = () => {
    if (!canContinue()) return;
    goTo(Math.min(5, step + 1));
  };

  const toggleActivity = (sku: string) => {
    const current = [selections.activity1, selections.activity2].filter(Boolean) as string[];
    let next: string[];
    if (current.includes(sku)) {
      next = current.filter((s) => s !== sku);
    } else if (needsTwoActivities) {
      if (current.length >= 2) next = [current[1]!, sku];
      else next = [...current, sku];
    } else {
      next = [sku];
    }
    const updated = {
      ...selections,
      activity1: next[0] ?? null,
      activity2: next[1] ?? null,
    };
    setSelections(updated);
    syncUrl({ selections: updated });
  };

  const togglePersonalization = (sku: string, enabled: boolean) => {
    const updated = {
      ...selections,
      personalization: { ...(selections.personalization ?? {}), [sku]: enabled },
    };
    setSelections(updated);
    syncUrl({ selections: updated });
  };

  const handleAddToCart = () => {
    if (!canQuote || !pkgSlug || !themeSlug || !quote) return;
    if (!eventDate || !guestName || !guestEmail || !guestPhone || !guestAddress || !guestCity || !guestPincode) {
      setQuoteError("Please fill celebration date, contact, and address details.");
      return;
    }
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    addPackage({
      packageId: pkgSlug,
      themeSlug,
      basePrice: quote.totalInPaise / 100, // store in rupees — includes all customizations
      addons: [], // line items are already reflected in basePrice (the full quote total)
      builderInput: {
        packageSlug: pkgSlug,
        themeSlug,
        guestCount,
        location,
        selections,
        eventDetails: {
          eventDate,
          childName: guestName, // Assuming the guest name is used as child name or booking name
          venue: guestAddress,
        },
        contactEmail: guestEmail,
        contactPhone: guestPhone,
        shippingAddress: {
          fullName: guestName,
          line1: guestAddress,
          city: guestCity,
          state: "Rajasthan",
          pincode: guestPincode,
          country: "India",
        },
        quoteSnapshot: quote,
      },
    });

    // Redirect to checkout
    router.push("/checkout");
  };

  const decorPriceLabel =
    pkgSlug === "standard" ? "₹5,000" : pkgSlug === "premium" ? "₹10,000" : "₹20,000";

  const includedForTier = selectedPkg?.features?.filter((f) => f.included).map((f) => f.label) ?? [];

  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-32 pb-36 min-h-screen bg-cream">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <BuilderStepper currentStep={step} onStepClick={goTo} />

          {/* Step 0 Theme */}
          {step === 0 && (
            <section>
              <h1 className="font-display text-2xl md:text-3xl font-semibold text-charcoal mb-2">
                Choose a theme for the celebration
              </h1>
              <p className="text-sm text-text-muted mb-8">
                Each theme has matching activities, gifts, and décor — all coordinated.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {activeThemes.map((theme) => (
                  <button
                    key={theme.slug}
                    type="button"
                    onClick={() => {
                      setThemeSlug(theme.slug);
                      syncUrl({ theme: theme.slug, step: 0 });
                    }}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      themeSlug === theme.slug
                        ? "border-2 border-mocha bg-mocha/5"
                        : "border-border hover:border-mocha/40"
                    }`}
                  >
                    {theme.heroImageUrl ? (
                      <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden mb-3 bg-cream-dark">
                        <Image src={theme.heroImageUrl} alt={theme.title} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-full aspect-[4/3] rounded-xl bg-cream-dark mb-3" />
                    )}
                    <div className="font-semibold text-charcoal">{theme.title}</div>
                    <div className="text-xs text-text-muted mt-1 line-clamp-2">{theme.shortDescription}</div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Step 1 Package */}
          {step === 1 && (
            <section>
              <h1 className="font-display text-2xl md:text-3xl font-semibold text-charcoal mb-2">
                Choose your package
              </h1>
              <p className="text-sm text-text-muted mb-8">
                All packages include theme-coordinated activities, gifts, and digital items.
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                {packages.map((pkg) => {
                  const tier = pkg.slug as Tier;
                  const meta = TIER_META[tier];
                  const selected = pkgSlug === tier;
                  return (
                    <button
                      key={pkg.slug}
                      type="button"
                      onClick={() => {
                        setPkgSlug(tier);
                        syncUrl({ pkg: tier, step: 1 });
                      }}
                      className={`relative rounded-2xl p-5 text-left border transition-all ${
                        selected ? "border-2 border-mocha bg-mocha/5" : "border-border"
                      }`}
                    >
                      {pkg.isRecommended && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-mocha text-white text-[10px] font-bold px-3 py-1 rounded-full">
                          Most popular
                        </span>
                      )}
                      <div className="text-xs font-bold tracking-wide text-mocha">{meta?.eyebrow}</div>
                      <div className="font-display text-xl font-semibold mt-1">{pkg.priceLabel}</div>
                      <div className="text-xs text-text-muted mt-1 mb-3">{pkg.title}</div>
                      <ul className="space-y-1.5 text-xs text-charcoal">
                        {pkg.features.slice(0, 6).map((f) => (
                          <li key={f.label}>✓ {f.label}</li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
              
              {/* Custom Plan CTA */}
              <div className="mt-8 bg-mocha/5 border border-mocha/20 rounded-2xl p-8 text-center">
                <h3 className="font-display text-xl font-semibold text-charcoal mb-2">
                  Want to build your own from scratch?
                </h3>
                <p className="text-text-muted text-sm max-w-lg mx-auto mb-5">
                  Mix and match items from any package tier. Choose exactly what fits your celebration, budget, and number of guests.
                </p>
                <Link
                  href="/custom-plan"
                  className="btn-outline px-6 py-2.5 text-sm inline-flex font-semibold"
                >
                  Plan Your Custom Celebration
                </Link>
              </div>
            </section>
          )}

          {/* Step 2 Details */}
          {step === 2 && (
            <section>
              <h1 className="font-display text-2xl md:text-3xl font-semibold text-charcoal mb-2">
                Your celebration details
              </h1>
              <p className="text-sm text-text-muted mb-8">
                This sets per-child pricing and shows the right décor options.
              </p>
              
              <div className="bg-surface rounded-3xl border border-border-light p-6 md:p-8 shadow-sm">
                <div className="grid md:grid-cols-2 gap-8 md:gap-12">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-charcoal uppercase tracking-wider mb-3">
                        Number of children attending
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center bg-cream-dark rounded-xl border border-border-light overflow-hidden h-14 w-40">
                          <button
                            type="button"
                            onClick={() => {
                              const g = Math.max(5, guestCount - 1);
                              setGuestCount(g);
                              syncUrl({ guests: g });
                            }}
                            className="w-12 h-full flex items-center justify-center text-charcoal hover:bg-mocha/10 transition-colors"
                          >
                            <Minus size={18} />
                          </button>
                          <span className="flex-1 text-center font-display text-xl font-bold text-charcoal">
                            {guestCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const g = guestCount + 1;
                              setGuestCount(g);
                              syncUrl({ guests: g });
                            }}
                            className="w-12 h-full flex items-center justify-center text-charcoal hover:bg-mocha/10 transition-colors"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-text-muted mt-3 font-medium uppercase tracking-wider">
                        Minimum 5 children per booking
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-charcoal uppercase tracking-wider mb-3">
                        Are you in Jaipur?
                      </label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setLocation("jaipur");
                            syncUrl({ loc: "jaipur" });
                          }}
                          className={`flex-1 py-4 px-4 rounded-xl border font-bold text-sm transition-all ${
                            location === "jaipur"
                              ? "border-mocha bg-mocha/5 text-mocha shadow-sm"
                              : "border-border-light text-charcoal hover:border-mocha/40 bg-surface"
                          }`}
                        >
                          Yes — Jaipur
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLocation("outside");
                            syncUrl({ loc: "outside" });
                          }}
                          className={`flex-1 py-4 px-4 rounded-xl border font-bold text-sm transition-all ${
                            location === "outside"
                              ? "border-mocha bg-mocha/5 text-mocha shadow-sm"
                              : "border-border-light text-charcoal hover:border-mocha/40 bg-surface"
                          }`}
                        >
                          No — Other city
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-border-light grid md:grid-cols-2 gap-8 md:gap-12">
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-charcoal mb-4">Contact Information</h3>
                    <label className="block text-sm">
                      <span className="font-bold text-charcoal uppercase tracking-wider block mb-2 text-xs">Your Name</span>
                      <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="w-full bg-cream-dark border border-border-light rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-mocha/20 focus:border-mocha transition-all placeholder:text-text-light/50"
                        placeholder="Jane Doe"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="font-bold text-charcoal uppercase tracking-wider block mb-2 text-xs">Email Address</span>
                      <input
                        type="email"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        className="w-full bg-cream-dark border border-border-light rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-mocha/20 focus:border-mocha transition-all placeholder:text-text-light/50"
                        placeholder="jane@example.com"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="font-bold text-charcoal uppercase tracking-wider block mb-2 text-xs">Phone Number</span>
                      <input
                        type="tel"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        className="w-full bg-cream-dark border border-border-light rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-mocha/20 focus:border-mocha transition-all placeholder:text-text-light/50"
                        placeholder="+91 98765 43210"
                      />
                    </label>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-charcoal mb-4">Event & Location Details</h3>
                    <label className="block text-sm">
                      <span className="font-bold text-charcoal uppercase tracking-wider block mb-2 text-xs">Celebration Date</span>
                      <input
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full bg-cream-dark border border-border-light rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-mocha/20 focus:border-mocha transition-all"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="font-bold text-charcoal uppercase tracking-wider block mb-2 text-xs">Address Line 1</span>
                      <input
                        type="text"
                        value={guestAddress}
                        onChange={(e) => setGuestAddress(e.target.value)}
                        className="w-full bg-cream-dark border border-border-light rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-mocha/20 focus:border-mocha transition-all placeholder:text-text-light/50"
                        placeholder="Flat / House No. / Building"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <label className="block text-sm">
                        <span className="font-bold text-charcoal uppercase tracking-wider block mb-2 text-xs">City</span>
                        <input
                          type="text"
                          value={guestCity}
                          onChange={(e) => setGuestCity(e.target.value)}
                          className="w-full bg-cream-dark border border-border-light rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-mocha/20 focus:border-mocha transition-all placeholder:text-text-light/50"
                          placeholder={location === "jaipur" ? "Jaipur" : "City"}
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="font-bold text-charcoal uppercase tracking-wider block mb-2 text-xs">Pincode</span>
                        <input
                          type="text"
                          value={guestPincode}
                          onChange={(e) => setGuestPincode(e.target.value)}
                          className="w-full bg-cream-dark border border-border-light rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-mocha/20 focus:border-mocha transition-all placeholder:text-text-light/50"
                          placeholder="302001"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Step 3 Customize */}
          {step === 3 && (
            <section>
              <h1 className="font-display text-2xl md:text-3xl font-semibold text-charcoal mb-2">
                Customize your celebration
              </h1>
              <p className="text-sm text-text-muted mb-4">
                {selectedPkg?.title} · {activeThemes.find((t) => t.slug === themeSlug)?.title} ·{" "}
                {guestCount} children · {location === "jaipur" ? "Jaipur" : "Outside Jaipur"}
              </p>
              {includedForTier.length > 0 && (
                <div className="bg-cream-dark border border-border rounded-xl p-4 text-sm mb-8">
                  <strong>Included:</strong> {includedForTier.join(" · ")}
                </div>
              )}
              {loadingProducts ? (
                <div className="flex items-center gap-2 text-text-muted py-12 justify-center">
                  <Loader2 className="animate-spin" size={18} /> Loading options…
                </div>
              ) : (
                <>
                  {needsWelcome && (
                    <ProductPicker
                      title="Welcome item — choose 1 per child"
                      products={welcomeProducts}
                      selectedSku={selections.welcomeItem}
                      guestCount={guestCount}
                      personalization={selections.personalization}
                      onPersonalizationChange={togglePersonalization}
                      onSelect={(sku) => {
                        const updated = { ...selections, welcomeItem: sku };
                        setSelections(updated);
                        syncUrl({ selections: updated });
                      }}
                    />
                  )}
                  <ProductPicker
                    title={needsTwoActivities ? "Activities — choose 2" : "Activity — choose 1"}
                    products={activityProducts}
                    guestCount={guestCount}
                    multi={needsTwoActivities}
                    selectedSku={selections.activity1}
                    selectedSkus={[selections.activity1, selections.activity2].filter(Boolean) as string[]}
                    personalization={selections.personalization}
                    onPersonalizationChange={togglePersonalization}
                    onSelect={(sku) => {
                      const updated = { ...selections, activity1: sku, activity2: null };
                      setSelections(updated);
                      syncUrl({ selections: updated });
                    }}
                    onToggle={toggleActivity}
                  />
                  {needsFamily && (
                    <ProductPicker
                      title="Family activity — choose 1 (per group)"
                      products={familyProducts}
                      selectedSku={selections.familyActivity}
                      guestCount={guestCount}
                      personalization={selections.personalization}
                      onPersonalizationChange={togglePersonalization}
                      onSelect={(sku) => {
                        const updated = { ...selections, familyActivity: sku };
                        setSelections(updated);
                        syncUrl({ selections: updated });
                      }}
                    />
                  )}
                  <ProductPicker
                    title="Return gift — choose 1"
                    products={giftProducts}
                    selectedSku={selections.returnGift}
                    guestCount={guestCount}
                    personalization={selections.personalization}
                    onPersonalizationChange={togglePersonalization}
                    onSelect={(sku) => {
                      const updated = { ...selections, returnGift: sku };
                      setSelections(updated);
                      syncUrl({ selections: updated });
                    }}
                  />
                  <div className="bg-cream-dark border border-border rounded-xl p-4 text-sm text-text-muted">
                    Packaging and thank-you tags (where included) are auto-assigned for your package — shown on the review step.
                  </div>
                  {(quote ? quote.giftRegistryIncluded : pkgSlug === "premium" || pkgSlug === "luxe") && (
                    <div
                      className={`mt-8 rounded-2xl border p-6 ${
                        selections.giftRegistryCustomize ? "border-2 border-mocha" : "border-border"
                      }`}
                    >
                      <div className="flex justify-between gap-4 items-start">
                        <div>
                          <div className="font-semibold text-charcoal mb-1">Gift Registry</div>
                          <p className="text-sm text-text-muted">
                            Included with Signature and Grand. After you book, you&apos;ll set up and share the list from this order — not as a later add-on.
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold uppercase tracking-wider text-mocha">Included</div>
                        </div>
                      </div>
                      <label className="mt-4 flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!selections.giftRegistryCustomize}
                          onChange={(e) => {
                            const updated = { ...selections, giftRegistryCustomize: e.target.checked };
                            setSelections(updated);
                            syncUrl({ selections: updated });
                          }}
                          className="w-4 h-4"
                        />
                        Customize Gift Registry (+
                        {formatPaise(quote?.giftRegistryCustomizePriceInPaise || 50_000)})
                      </label>
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {/* Step 4 Decor */}
          {step === 4 && (
            <section>
              <h1 className="font-display text-2xl md:text-3xl font-semibold text-charcoal mb-2">
                Décor for your celebration
              </h1>
              <p className="text-sm text-text-muted mb-8">
                {selectedPkg?.title} · {location === "jaipur" ? "Jaipur" : "Outside Jaipur"}
              </p>
              {location === "jaipur" ? (
                <div
                  className={`rounded-2xl border p-6 ${
                    selections.decor ? "border-2 border-mocha" : "border-border"
                  }`}
                >
                  <div className="flex justify-between gap-4 items-start">
                    <div>
                      <div className="font-semibold text-charcoal mb-1">
                        {selectedPkg?.title} theme décor — Jaipur
                      </div>
                      <p className="text-sm text-text-muted">
                        Theme décor through our Jaipur vendor. Final quote may vary slightly on site.
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-bold">{decorPriceLabel}</div>
                      <div className="text-[11px] text-text-light">flat rate</div>
                    </div>
                  </div>
                  <label className="mt-4 flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!selections.decor}
                      onChange={(e) => {
                        const updated = { ...selections, decor: e.target.checked };
                        setSelections(updated);
                        syncUrl({ selections: updated });
                      }}
                      className="w-4 h-4"
                    />
                    Add décor to my order
                  </label>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-cream-dark p-6">
                  <div className="font-semibold text-charcoal mb-1">Decor Guide Included — free</div>
                  <p className="text-sm text-text-muted">
                    Outside Jaipur, your package includes a décor guide so you can recreate the look with local vendors.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Step 5 Review */}
          {step === 5 && (
            <section>
              <h1 className="font-display text-2xl md:text-3xl font-semibold text-charcoal mb-2">
                Review your order
              </h1>
              <p className="text-sm text-text-muted mb-6">
                {quote
                  ? `${quote.packageTitle} · ${quote.themeTitle} · ${quote.guestCount} children · ${
                      quote.location === "jaipur" ? "Jaipur" : "Outside Jaipur"
                    }`
                  : "Loading quote…"}
              </p>

              {quoteLoading && (
                <div className="flex items-center gap-2 text-text-muted mb-4">
                  <Loader2 className="animate-spin" size={16} /> Calculating…
                </div>
              )}
              {quoteError && <p className="text-sm text-red-600 mb-4">{quoteError}</p>}

              {quote && (
                <div className="max-w-2xl mx-auto items-start mb-12">
                  <div className="bg-surface rounded-3xl border border-border-light p-6 md:p-8 shadow-sm text-center">
                    <h3 className="font-display text-2xl font-bold text-charcoal mb-2">
                      Ready to Celebrate!
                    </h3>
                    <p className="text-sm text-text-muted mb-6">
                      All your details have been securely saved. You can proceed to add this package to your cart.
                    </p>
                    <div className="bg-cream-dark p-6 rounded-2xl mb-6 flex flex-col items-center justify-center">
                      <div className="text-sm text-text-muted mb-1 font-bold uppercase tracking-widest">Grand Total</div>
                      <div className="font-display text-4xl font-bold text-mocha mb-3">{formatPaise(quote.totalInPaise)}</div>
                      <button 
                        onClick={() => setShowBreakdown(true)}
                        className="text-xs font-semibold text-charcoal flex items-center gap-1 hover:text-mocha transition-colors"
                      >
                        <Info size={14} /> View Price Breakdown
                      </button>
                    </div>
                  </div>
                  
                  {/* Breakdown Modal */}
                  {showBreakdown && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-sm">
                      <div className="bg-surface rounded-3xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-5 border-b border-border-light bg-cream">
                          <h3 className="font-display text-xl font-bold text-charcoal">Quote Breakdown</h3>
                          <button onClick={() => setShowBreakdown(false)} className="text-text-muted hover:text-charcoal transition-colors">
                            <X size={20} />
                          </button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto hide-scrollbar">
                          {(["package", "per-child", "per-group", "auto", "fixed", "decor"] as const).map((section) => {
                            const items = quote.lineItems.filter((l) => l.section === section);
                            if (!items.length) return null;
                            const titles: Record<string, string> = {
                              package: "Package",
                              "per-child": "Per-child items",
                              "per-group": "Per-group items",
                              auto: "Included physical items",
                              fixed: "Fixed digital add-ons",
                              decor: "Decor",
                            };
                            return (
                              <div key={section} className="mb-5">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-mocha mb-3">
                                  {titles[section]}
                                </div>
                                <div className="space-y-3">
                                  {items.map((item) => (
                                    <div
                                      key={item.key}
                                      className="flex justify-between gap-4 text-sm items-start"
                                    >
                                      <div>
                                        <div className="text-charcoal font-medium">{item.label}</div>
                                        {item.sublabel && (
                                          <div className="text-[11px] text-text-light font-medium mt-0.5">{item.sublabel}</div>
                                        )}
                                      </div>
                                      <div className="font-bold text-charcoal whitespace-nowrap">
                                        {formatPaise(item.lineTotalInPaise)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                          <div className="mt-6 pt-4 border-t border-border-light space-y-3">
                            <FreeDeliveryProgress
                              subtotalInPaise={quote.subtotalInPaise}
                              freeShippingThresholdInPaise={quote.freeShippingThresholdInPaise}
                              shippingFeeInPaise={quote.shippingInPaise || 19_900}
                              shippingWaived={quote.shippingWaived}
                            />
                            <div className="flex justify-between text-sm text-text-muted">
                              <span className="font-medium">Subtotal</span>
                              <span className="font-bold text-charcoal">{formatPaise(quote.subtotalInPaise)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-text-muted">
                              <span className="font-medium">Shipping</span>
                              <span className="font-bold text-charcoal">
                                {quote.shippingWaived ? "FREE" : formatPaise(quote.shippingInPaise)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm text-text-muted">
                              <span className="font-medium">GST ({quote.gstPercent}%)</span>
                              <span className="font-bold text-charcoal">{formatPaise(quote.gstInPaise)}</span>
                            </div>
                            <div className="flex justify-between items-end mt-4 pt-4 border-t border-border-light">
                              <span className="text-base font-bold text-charcoal">Grand total</span>
                              <span className="font-display text-xl font-bold text-mocha">{formatPaise(quote.totalInPaise)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 border-t border-border-light bg-cream-dark text-center">
                          <button 
                            onClick={() => setShowBreakdown(false)}
                            className="btn-primary w-full py-3 text-sm font-semibold"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {!isAuthenticated && (
                <p className="text-sm text-text-muted mb-2">
                  You&apos;ll be asked to log in when you add to cart — browsing stays free until then.
                </p>
              )}
            </section>
          )}
        </div>

        {/* Sticky total bar */}
        <div className="fixed bottom-0 inset-x-0 z-40 bg-charcoal text-white">
          <div className="max-w-4xl mx-auto px-5 md:px-8 py-3 flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] text-white/60">Running total (incl. GST)</div>
              <div className="text-xl font-bold">
                {quoteLoading ? "…" : quote ? formatPaise(quote.totalInPaise) : "—"}
              </div>
            </div>
            <div className="flex gap-2">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => goTo(step - 1)}
                  className="px-4 py-2.5 rounded-lg border border-white/20 text-sm text-white/80 hover:bg-white/10 flex items-center gap-1"
                >
                  <ArrowLeft size={14} /> Back
                </button>
              )}
              {step < 5 ? (
                <button
                  type="button"
                  disabled={!canContinue()}
                  onClick={onContinue}
                  className="px-5 py-2.5 rounded-lg bg-mocha text-white text-sm font-semibold disabled:opacity-40 flex items-center gap-1"
                >
                  Continue <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!quote}
                  onClick={handleAddToCart}
                  className="px-5 py-2.5 rounded-lg bg-mocha text-white text-sm font-semibold disabled:opacity-40 flex items-center gap-2"
                >
                  <ShoppingCart size={14} />
                  {isAuthenticated ? "Add to Cart" : "Log in & Add to Cart"}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
      <FooterClient />
      <WhatsAppFAB />
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
