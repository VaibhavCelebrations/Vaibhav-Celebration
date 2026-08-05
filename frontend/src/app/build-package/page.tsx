"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Check, Plus, Minus, ShoppingCart, Package, CheckCircle2, LogIn, Palette, Gift, Loader2, X, Eye } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { useAuth } from "@/context/auth-context";
import { useCatalog } from "@/context/catalog-context";
import * as shopApi from "@/lib/shop-api";
import { formatPaise, getMaxPurchasable, productImageUrl } from "@/lib/shop-types";
import type { Product } from "@/lib/shop-types";
import { Navbar } from "@/components/layout/Navbar";
import { FooterClient } from "@/components/layout/FooterClient";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";

type LocalAddon = {
  product: Product;
  quantity: number;
};

const JOURNEY_STEPS = [
  { label: "Login", icon: LogIn },
  { label: "Theme", icon: Palette },
  { label: "Gifts & Extras", icon: Gift },
  { label: "Review", icon: CheckCircle2 },
];

function JourneyStepper({ currentStep, onStepClick }: { currentStep: number; onStepClick: (step: number) => void }) {
  return (
    <div className="flex items-center justify-center w-full max-w-4xl mx-auto mb-12">
      {JOURNEY_STEPS.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        const Icon = step.icon;
        const canClick = index < currentStep;

        return (
          <div key={step.label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center relative">
              <button
                onClick={() => canClick && onStepClick(index)}
                disabled={!canClick}
                className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 shrink-0 ${
                  isCompleted
                    ? "bg-mocha text-white shadow-md shadow-mocha/30 cursor-pointer hover:scale-105"
                    : isActive
                    ? "bg-mocha text-white shadow-lg shadow-mocha/30 scale-110"
                    : "bg-cream-dark text-text-light border border-border-light cursor-default"
                }`}
              >
                {isCompleted ? <Check size={18} /> : <Icon size={18} />}
              </button>
              <span
                className={`hidden md:block absolute top-14 text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  isCompleted || isActive ? "text-charcoal" : "text-text-light"
                }`}
              >
                {step.label}
              </span>
            </div>

            {index < JOURNEY_STEPS.length - 1 && (
              <div className="flex-1 h-[2px] mx-2 md:mx-3 relative">
                <div className="absolute inset-0 bg-border-light rounded-full" />
                <div
                  className="absolute inset-y-0 left-0 bg-mocha rounded-full transition-all duration-700 ease-out"
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

function BuildPackageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addPackage, openCart } = useCart();
  const { isAuthenticated, openAuthModal } = useAuth();
  const { themes, packagesBySlug, themesBySlug } = useCatalog();

  const pkgSlug = searchParams.get("package");
  const initialThemeSlug = searchParams.get("theme");
  const initialStep = searchParams.get("step");

  const getInitialStep = () => {
    if (initialStep) return parseInt(initialStep);
    if (!isAuthenticated) return 0;
    if (initialThemeSlug) return 2;
    return 1;
  };

  const [currentStep, setCurrentStep] = useState(getInitialStep);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(initialThemeSlug || null);
  const [selectedAddons, setSelectedAddons] = useState<LocalAddon[]>([]);
  const [themeProducts, setThemeProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  const packageData = pkgSlug ? packagesBySlug[pkgSlug] : undefined;
  const themeData = selectedTheme ? themesBySlug[selectedTheme] : undefined;

  useEffect(() => {
    if (isAuthenticated && currentStep === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentStep(1);
    }
  }, [isAuthenticated, currentStep]);

  useEffect(() => {
    if (!packageData) {
      router.push("/packages");
    }
  }, [packageData, router]);

  useEffect(() => {
    if (!selectedTheme) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThemeProducts([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setIsLoadingProducts(true);
      try {
        const result = await shopApi.listProducts({ theme: selectedTheme, pageSize: 60 });
        if (!cancelled) setThemeProducts(result.items);
      } catch {
        if (!cancelled) setThemeProducts([]);
      } finally {
        if (!cancelled) setIsLoadingProducts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedTheme]);

  if (!packageData) return null;

  const handleToggleAddon = (product: Product) => {
    setSelectedAddons((prev) => {
      const exists = prev.find((a) => a.product.id === product.id);
      if (exists) return prev.filter((a) => a.product.id !== product.id);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setSelectedAddons((prev) =>
      prev.map((a) => {
        if (a.product.id === productId) {
          const maxQ = getMaxPurchasable(a.product);
          const newQ = Math.max(1, Math.min(maxQ, a.quantity + delta));
          return { ...a, quantity: newQ };
        }
        return a;
      })
    );
  };

  const goNext = () => {
    if (currentStep === 0 && !isAuthenticated) {
      openAuthModal();
      return;
    }
    if (currentStep === 1 && !selectedTheme) return;
    setCurrentStep((s) => Math.min(s + 1, JOURNEY_STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    if (currentStep <= 1) {
      router.push(selectedTheme ? `/themes/${selectedTheme}` : "/packages");
      return;
    }
    setCurrentStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAddToCart = () => {
    if (!selectedTheme) return;
    addPackage({
      packageId: packageData.slug,
      themeSlug: selectedTheme,
      basePrice: packageData.basePrice,
      addons: selectedAddons.map((a) => ({
        product: a.product,
        quantity: a.quantity,
        personalizationValues: [],
      })),
    });
    openCart();
  };

  const addonsTotalRupees = selectedAddons.reduce((acc, curr) => acc + (curr.product.priceInPaise / 100) * curr.quantity, 0);
  const grandTotal = packageData.basePrice + addonsTotalRupees;

  const renderProductGrid = () => {
    if (isLoadingProducts) {
      return (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-mocha" />
        </div>
      );
    }
    if (themeProducts.length === 0) {
      return (
        <div className="text-center py-16 bg-cream/50 rounded-2xl border border-dashed border-border-light">
          <p className="text-text-muted">No matching gifts or extras found for this theme yet.</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {themeProducts.map((product) => {
          const isSelected = selectedAddons.some((a) => a.product.id === product.id);
          return (
            <div
              key={product.id}
              className={`bg-white rounded-2xl border-2 overflow-hidden flex flex-col transition-all ${
                isSelected ? "border-mocha shadow-md scale-[1.02]" : "border-border-light hover:border-mocha/30"
              }`}
            >
              <div className="relative aspect-square w-full group overflow-hidden">
                <Image src={productImageUrl(product)} alt={product.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" sizes="(max-width: 640px) 100vw, 33vw" />
                <div className="absolute inset-0 bg-charcoal/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setPreviewProduct(product)}
                    className="w-10 h-10 rounded-full bg-white text-charcoal flex items-center justify-center hover:bg-mocha hover:text-white transition-colors cursor-pointer shadow-lg"
                    title="Quick View"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => handleToggleAddon(product)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer shadow-lg ${
                      isSelected ? "bg-mocha text-white" : "bg-white text-charcoal hover:bg-mocha hover:text-white"
                    }`}
                    title={isSelected ? "Remove" : "Add"}
                  >
                    {isSelected ? <Check size={18} /> : <Plus size={18} />}
                  </button>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h4 className="font-bold text-charcoal line-clamp-1">{product.title}</h4>
                <p className="text-xs text-text-muted mb-3 flex-1 line-clamp-2">{product.description}</p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="font-bold text-charcoal">{formatPaise(product.priceInPaise)}</span>
                  {isSelected && (
                    <div className="flex items-center gap-1 bg-cream rounded-lg border border-border-light p-0.5">
                      <button onClick={() => handleUpdateQuantity(product.id, -1)} className="w-7 h-7 flex items-center justify-center text-charcoal hover:text-mocha cursor-pointer">
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center text-xs font-bold">{selectedAddons.find((a) => a.product.id === product.id)?.quantity || 1}</span>
                      <button onClick={() => handleUpdateQuantity(product.id, 1)} className="w-7 h-7 flex items-center justify-center text-charcoal hover:text-mocha cursor-pointer">
                        <Plus size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-cream pt-28 md:pt-36 pb-32">
        <div className="container-custom max-w-5xl mx-auto px-5 md:px-10">
          {/* Back Button */}
          <button
            onClick={goBack}
            className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-mocha font-semibold tracking-wide uppercase transition-colors group mb-8 cursor-pointer"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            {currentStep <= 1 ? "Back" : "Previous Step"}
          </button>

          {/* Journey Stepper */}
          <JourneyStepper currentStep={currentStep} onStepClick={(s) => { setCurrentStep(s); window.scrollTo({ top: 0, behavior: "smooth" }); }} />

          {/* Package Badge */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-mocha/10 text-mocha font-bold text-sm px-5 py-2 rounded-full">
              <Package size={16} /> {packageData.title} Package — ₹{packageData.basePrice.toLocaleString("en-IN")}
            </div>
          </div>

          {/* ═══ STEP 0: Login ═══ */}
          {currentStep === 0 && (
            <div className="text-center py-16 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-mocha/10 flex items-center justify-center mx-auto mb-6">
                <LogIn size={36} className="text-mocha" />
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-charcoal mb-4">
                Let&apos;s Get Started
              </h2>
              <p className="text-text-muted max-w-md mx-auto mb-8">
                Sign in or create an account to build your personalized celebration package.
              </p>
              <button
                onClick={() => openAuthModal()}
                className="btn-primary px-10 py-4 text-sm font-bold uppercase tracking-wider gap-2 cursor-pointer"
              >
                Login / Sign Up <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* ═══ STEP 1: Select Theme ═══ */}
          {currentStep === 1 && (
            <div className="animate-fade-in">
              <div className="text-center mb-10">
                <h2 className="font-display text-3xl md:text-4xl font-bold text-charcoal mb-3">
                  Choose Your Theme
                </h2>
                <p className="text-text-muted">Select the celebration theme that matches your vision.</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {themes.map((theme) => {
                  const isSelected = selectedTheme === theme.slug;
                  return (
                    <button
                      key={theme.slug}
                      onClick={() => setSelectedTheme(theme.slug)}
                      className={`relative p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                        isSelected ? "border-mocha bg-blush/20 shadow-md" : "border-border-light bg-white hover:border-mocha/50 hover:shadow-sm"
                      }`}
                    >
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-3">
                        <Image src={theme.cardImageUrl} alt={theme.title} fill className="object-cover" sizes="(max-width: 640px) 50vw, 25vw" />
                      </div>
                      <h4 className="font-bold text-sm text-charcoal leading-tight line-clamp-1">{theme.title}</h4>
                      <p className="text-[11px] text-text-muted mt-1 line-clamp-1">{theme.themeVibe}</p>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-mocha text-white rounded-full flex items-center justify-center shadow-sm">
                          <Check size={14} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ STEP 2: Add Gifts & Extras ═══ */}
          {currentStep === 2 && (
            <div className="animate-fade-in">
              <div className="text-center mb-10">
                <h2 className="font-display text-3xl md:text-4xl font-bold text-charcoal mb-3">
                  Add Gifts & Extras
                </h2>
                <p className="text-text-muted">
                  Select return gifts and activity kits for <span className="text-mocha font-semibold">{themeData?.title}</span>. This step is optional.
                </p>
              </div>
              {renderProductGrid()}
            </div>
          )}

          {/* ═══ STEP 3: Review ═══ */}
          {currentStep === 3 && (
            <div className="animate-fade-in">
              <div className="text-center mb-10">
                <h2 className="font-display text-3xl md:text-4xl font-bold text-charcoal mb-3">
                  Review Your Package
                </h2>
                <p className="text-text-muted">Review your selections before adding to cart.</p>
              </div>

              <div className="space-y-6 max-w-3xl mx-auto">
                {/* Package & Theme */}
                <div className="bg-white border border-border-light rounded-2xl overflow-hidden shadow-soft">
                  <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-10">
                    <div className="flex-1">
                      <div className="inline-flex items-center gap-2 bg-cream px-3 py-1 rounded-full text-xs font-semibold text-mocha mb-4">
                        <Package size={14} /> Base Package
                      </div>
                      <h3 className="font-display text-2xl font-bold text-charcoal mb-2">{packageData.title}</h3>
                      <p className="text-text-muted text-sm">{packageData.description}</p>
                      <p className="mt-4 font-bold text-charcoal">₹{packageData.basePrice.toLocaleString("en-IN")}</p>
                    </div>
                    <div className="hidden md:block w-px bg-border-light" />
                    <hr className="md:hidden border-border-light" />
                    <div className="flex-1">
                      <div className="inline-flex items-center gap-2 bg-cream px-3 py-1 rounded-full text-xs font-semibold text-mocha mb-4">
                        <CheckCircle2 size={14} /> Selected Theme
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
                          <Image src={themeData?.cardImageUrl || ""} alt={themeData?.title || ""} fill className="object-cover" sizes="64px" />
                        </div>
                        <div>
                          <h3 className="font-bold text-charcoal text-lg">{themeData?.title}</h3>
                          <p className="text-text-muted text-xs">{themeData?.themeVibe}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Selected Add-ons */}
                {selectedAddons.length > 0 && (
                  <div className="bg-white border border-border-light rounded-2xl p-6 shadow-soft">
                    <h3 className="font-display text-xl font-bold text-charcoal mb-4">Selected Add-ons</h3>
                    <div className="space-y-3">
                      {selectedAddons.map((addon) => (
                        <div key={addon.product.id} className="flex gap-4 p-3 bg-cream/50 rounded-xl items-center">
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0">
                            <Image src={productImageUrl(addon.product)} alt={addon.product.title} fill className="object-cover" sizes="56px" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-charcoal text-sm line-clamp-1">{addon.product.title}</h4>
                            <p className="text-xs text-text-muted">Qty: {addon.quantity}</p>
                          </div>
                          <div className="font-bold text-charcoal text-sm shrink-0">
                            {formatPaise(addon.product.priceInPaise * addon.quantity)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price Summary */}
                <div className="bg-white border border-border-light rounded-2xl p-6 shadow-soft">
                  <h3 className="font-display text-xl font-bold text-charcoal mb-4">Price Summary</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-text-muted">
                      <span>Base Package</span>
                      <span className="font-semibold text-charcoal">₹{packageData.basePrice.toLocaleString("en-IN")}</span>
                    </div>
                    {addonsTotalRupees > 0 && (
                      <div className="flex justify-between text-text-muted">
                        <span>Gifts & Extras ({selectedAddons.length})</span>
                        <span className="font-semibold text-charcoal">₹{addonsTotalRupees.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    <hr className="border-border-light" />
                    <div className="flex justify-between text-lg font-bold text-charcoal">
                      <span>Grand Total</span>
                      <span className="font-display">₹{grandTotal.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Floating Bottom Bar */}
        {currentStep > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border-light p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40">
            <div className="container-custom max-w-5xl mx-auto flex items-center justify-between">
              <div>
                <p className="text-sm text-text-muted mb-0.5">
                  {currentStep === 3 ? "Grand Total" : "Package Base"}
                </p>
                <p className="font-display text-xl md:text-2xl font-bold text-charcoal leading-none">
                  ₹{(currentStep === 3 ? grandTotal : packageData.basePrice).toLocaleString("en-IN")}
                  {currentStep < 3 && <span className="text-xs font-normal text-text-light ml-2">+ Add-ons</span>}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {currentStep === 2 && (
                  <button
                    onClick={() => goNext()}
                    className="text-sm text-text-muted hover:text-mocha font-semibold cursor-pointer hidden sm:block"
                  >
                    Skip this step →
                  </button>
                )}
                {currentStep === 3 ? (
                  <button
                    onClick={handleAddToCart}
                    className="btn-primary py-3 px-6 md:px-10 gap-2 shadow-lg shadow-mocha/20 cursor-pointer"
                  >
                    <ShoppingCart size={16} /> Confirm & Add to Cart
                  </button>
                ) : (
                  <button
                    onClick={goNext}
                    disabled={currentStep === 1 && !selectedTheme}
                    className="btn-primary py-3 px-6 md:px-10 gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {currentStep === 1 ? "Select Theme" : "Next Step"} <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <FooterClient />
      <WhatsAppFAB />
      
      {/* Quick View Modal */}
      {previewProduct && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-charcoal/80 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={() => setPreviewProduct(null)}>
          <div 
            className="bg-surface rounded-3xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row max-h-[90vh] shadow-2xl relative animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setPreviewProduct(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-charcoal flex items-center justify-center z-10 shadow-sm cursor-pointer transition-colors"
            >
              <X size={16} />
            </button>
            <div className="md:w-1/2 relative aspect-square md:aspect-auto md:h-auto shrink-0 bg-cream">
              <Image src={productImageUrl(previewProduct)} alt={previewProduct.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
            </div>
            <div className="md:w-1/2 p-8 md:p-10 overflow-y-auto flex flex-col hide-scrollbar">
              <h2 className="font-display text-3xl font-bold text-charcoal mb-2">{previewProduct.title}</h2>
              <p className="text-xl font-bold text-mocha mb-6">{formatPaise(previewProduct.priceInPaise)}</p>
              
              <div className="prose prose-sm text-text-muted mb-8">
                <p>{previewProduct.description}</p>
                {previewProduct.categories?.some((c) => c.id === "gift") && (
                  <p className="mt-4 text-xs bg-blush/30 px-3 py-2 rounded-lg text-charcoal border border-border-light inline-block">
                    🎁 Perfect for gifting! Add a personalized message during checkout.
                  </p>
                )}
              </div>
              
              <div className="mt-auto pt-6 border-t border-border-light">
                {selectedAddons.some((a) => a.product.id === previewProduct.id) ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 bg-cream rounded-xl border border-border-light p-1">
                      <button onClick={() => handleUpdateQuantity(previewProduct.id, -1)} className="w-10 h-10 flex items-center justify-center text-charcoal hover:text-mocha hover:bg-white rounded-lg transition-colors cursor-pointer">
                        <Minus size={16} />
                      </button>
                      <span className="w-8 text-center font-bold">{selectedAddons.find((a) => a.product.id === previewProduct.id)?.quantity || 1}</span>
                      <button onClick={() => handleUpdateQuantity(previewProduct.id, 1)} className="w-10 h-10 flex items-center justify-center text-charcoal hover:text-mocha hover:bg-white rounded-lg transition-colors cursor-pointer">
                        <Plus size={16} />
                      </button>
                    </div>
                    <button onClick={() => handleToggleAddon(previewProduct)} className="btn-outline px-6 py-3 text-sm">
                      Remove
                    </button>
                  </div>
                ) : (
                  <button onClick={() => handleToggleAddon(previewProduct)} className="btn-primary w-full py-4 text-sm gap-2">
                    <Plus size={18} /> Add to Package
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function BuildPackagePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream flex items-center justify-center">Loading...</div>}>
      <BuildPackageContent />
    </Suspense>
  );
}
