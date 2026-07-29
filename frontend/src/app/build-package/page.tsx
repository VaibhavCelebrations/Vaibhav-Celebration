"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Check, Plus, Minus, ShoppingCart, Info, Package, ArrowRight, Trash2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { placeholderProducts } from "@/lib/ecom-placeholder-data";
import { useCart } from "@/context/cart-context";
import { useCatalog } from "@/context/catalog-context";
import type { Product } from "@/lib/ecom-types";

// Helper component for local add-on state
type LocalAddon = {
  product: Product;
  quantity: number;
};

function BuildPackageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addPackage, addItem, openCart } = useCart();
  const { themes, packagesBySlug, themesBySlug } = useCatalog();

  const pkgSlug = searchParams.get("package");
  const initialThemeSlug = searchParams.get("theme");

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(initialThemeSlug || null);
  const [selectedAddons, setSelectedAddons] = useState<LocalAddon[]>([]);
  
  const packageData = pkgSlug ? packagesBySlug[pkgSlug] : undefined;
  const themeData = selectedTheme ? themesBySlug[selectedTheme] : undefined;

  // Redirect if invalid package
  useEffect(() => {
    if (!packageData) {
      router.push("/packages");
    }
  }, [packageData, router]);

  if (!packageData) return null;

  // Filter gifts by selected theme (if any)
  const themeGifts = selectedTheme 
    ? placeholderProducts.filter((p) => p.themeTags.includes(selectedTheme))
    : [];

  const handleToggleAddon = (product: Product) => {
    setSelectedAddons(prev => {
      const exists = prev.find(a => a.product.id === product.id);
      if (exists) {
        return prev.filter(a => a.product.id !== product.id);
      } else {
        return [...prev, { product, quantity: 1 }];
      }
    });
  };

  const handleUpdateAddonQuantity = (productId: string, delta: number) => {
    setSelectedAddons(prev => prev.map(a => {
      if (a.product.id === productId) {
        const newQ = Math.max(1, Math.min(a.product.stock, a.product.maxOrderQuantity, a.quantity + delta));
        return { ...a, quantity: newQ };
      }
      return a;
    }));
  };

  const handleProceedToReview = () => {
    if (!selectedTheme) {
      alert("Please select a theme first.");
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAddToCart = () => {
    if (!selectedTheme) return;
    
    // 1. Add the package with its selected addons
    addPackage({
      packageId: packageData.slug,
      themeSlug: selectedTheme,
      basePrice: packageData.basePrice,
      addons: selectedAddons.map(a => ({
        product: a.product,
        quantity: a.quantity,
        personalizationValues: []
      }))
    });

    // 2. Open cart drawer
    openCart();
    
    // Note: User can either stay on this page or go to home. Let's keep them here, opening the cart is enough feedback.
  };

  // Compute total
  const addonsTotal = selectedAddons.reduce((acc, curr) => acc + (curr.product.price * curr.quantity), 0);
  const grandTotal = packageData.basePrice + addonsTotal;

  return (
    <main className="min-h-screen bg-surface pt-24 pb-32">
      <div className="container-custom max-w-4xl mx-auto">
        <button
          onClick={() => step === 2 ? setStep(1) : router.push(selectedTheme ? `/themes/${selectedTheme}` : "/packages")}
          className="inline-flex items-center gap-2 text-text-light hover:text-mocha transition-colors mb-8 cursor-pointer"
        >
          <ArrowLeft size={16} /> {step === 2 ? "Back to Add-ons" : "Back"}
        </button>

        <div className="mb-10 text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-charcoal mb-4">
            {step === 1 ? "Build Your Package" : "Review Your Package"}
          </h1>
          <p className="text-text-muted">
            {step === 1 
              ? `Customize your ${packageData.title} package with themes and add-ons.` 
              : "Review your selected items and quantities before adding to cart."}
          </p>
        </div>

        {/* ═══ STEP 1: Selection ═══ */}
        {step === 1 && (
          <div className="space-y-8 animate-fade-in">
            {/* Package Summary Card */}
            <section className="bg-cream p-6 rounded-2xl border border-mocha/20 flex flex-col md:flex-row gap-6 items-center justify-between shadow-sm">
              <div>
                <h2 className="text-xl font-bold text-charcoal mb-1">
                  {packageData.title} Package
                </h2>
                <p className="text-text-muted text-sm">{packageData.description}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-2xl font-bold text-mocha">
                  ₹{packageData.basePrice.toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-text-light uppercase tracking-wider">Base Price</p>
              </div>
            </section>

            {/* Step 1.1: Select Theme */}
            <section>
              <h3 className="font-display text-2xl font-bold text-charcoal mb-4 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-mocha text-white text-sm">1</span>
                Choose Your Theme
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {themes.map((theme) => {
                  const isSelected = selectedTheme === theme.slug;
                  return (
                    <button
                      key={theme.slug}
                      onClick={() => setSelectedTheme(theme.slug)}
                      className={`relative p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                        isSelected ? "border-mocha bg-blush/20" : "border-border-light bg-white hover:border-mocha/50"
                      }`}
                    >
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-3">
                        <Image src={theme.cardImageUrl} alt={theme.title} fill className="object-cover" />
                      </div>
                      <h4 className="font-bold text-sm text-charcoal leading-tight">{theme.title}</h4>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-mocha text-white rounded-full flex items-center justify-center">
                          <Check size={14} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Step 1.2: Add-ons */}
            <section className={`transition-opacity duration-300 ${!selectedTheme ? 'opacity-50 pointer-events-none' : ''}`}>
              <h3 className="font-display text-2xl font-bold text-charcoal mb-2 flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-mocha text-white text-sm">2</span>
                Add Return Gifts & Kits
              </h3>
              <p className="text-text-muted mb-6 pl-11">
                {!selectedTheme 
                  ? "Select a theme above to see matching return gifts." 
                  : `Select matching gifts for ${themeData?.title}. You can choose quantities on the next step.`}
              </p>

              {themeGifts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pl-11">
                  {themeGifts.map((product) => {
                    const isSelected = selectedAddons.some(a => a.product.id === product.id);
                    return (
                      <div 
                        key={product.id} 
                        className={`bg-white rounded-2xl border-2 overflow-hidden flex flex-col transition-all ${
                          isSelected ? "border-mocha shadow-md scale-[1.02]" : "border-border-light hover:border-mocha/30"
                        }`}
                      >
                        <div className="relative aspect-square w-full">
                          <Image src={product.images[0]} alt={product.title} fill className="object-cover" />
                          <button
                            onClick={() => handleToggleAddon(product)}
                            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm cursor-pointer ${
                              isSelected ? "bg-mocha text-white" : "bg-white text-text-muted hover:text-mocha"
                            }`}
                          >
                            {isSelected ? <Check size={16} /> : <Plus size={16} />}
                          </button>
                        </div>
                        <div className="p-4 flex-1 flex flex-col">
                          <h4 className="font-bold text-charcoal line-clamp-1">{product.title}</h4>
                          <p className="text-xs text-text-muted mb-3 flex-1 line-clamp-2">{product.description}</p>
                          <div className="flex items-center justify-between mt-auto">
                            <span className="font-bold text-charcoal">₹{product.price.toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : selectedTheme ? (
                <div className="pl-11 text-text-muted py-8 bg-surface rounded-xl border border-dashed border-border-light text-center">
                  No matching gifts found for this theme right now.
                </div>
              ) : null}
            </section>
          </div>
        )}

        {/* ═══ STEP 2: Review ═══ */}
        {step === 2 && (
          <div className="space-y-8 animate-fade-in">
            {/* Package & Theme summary block */}
            <div className="bg-surface border border-border-light rounded-2xl overflow-hidden shadow-soft">
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
                      <Image src={themeData?.cardImageUrl || ""} alt={themeData?.title || ""} fill className="object-cover" />
                    </div>
                    <div>
                      <h3 className="font-bold text-charcoal text-lg">{themeData?.title}</h3>
                      <p className="text-text-muted text-xs">{themeData?.themeVibe}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Addons List with quantities */}
            <div>
              <h3 className="font-display text-xl font-bold text-charcoal mb-4">Selected Add-ons</h3>
              {selectedAddons.length === 0 ? (
                <div className="text-center py-12 bg-cream rounded-2xl border border-dashed border-mocha/30">
                  <p className="text-text-muted mb-4">You haven't selected any add-ons.</p>
                  <button onClick={() => setStep(1)} className="btn-outline px-6 py-2 text-sm cursor-pointer">
                    Go Back & Add Gifts
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedAddons.map((addon) => (
                    <div key={addon.product.id} className="flex gap-4 p-4 bg-surface rounded-2xl border border-border-light shadow-sm items-center">
                      <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden shrink-0">
                        <Image src={addon.product.images[0]} alt={addon.product.title} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-charcoal line-clamp-1">{addon.product.title}</h4>
                        <p className="text-sm text-text-muted line-clamp-1 hidden md:block">{addon.product.description}</p>
                        <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                          <div className="flex items-center gap-1 bg-cream rounded-lg border border-border-light p-0.5">
                            <button 
                              onClick={() => handleUpdateAddonQuantity(addon.product.id, -1)} 
                              className="w-8 h-8 flex items-center justify-center text-charcoal hover:text-mocha cursor-pointer"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center text-sm font-bold">{addon.quantity}</span>
                            <button 
                              onClick={() => handleUpdateAddonQuantity(addon.product.id, 1)} 
                              className="w-8 h-8 flex items-center justify-center text-charcoal hover:text-mocha cursor-pointer"
                              disabled={addon.quantity >= Math.min(addon.product.maxOrderQuantity, addon.product.stock)}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <div className="font-bold text-charcoal">
                            ₹{(addon.product.price * addon.quantity).toLocaleString("en-IN")}
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleToggleAddon(addon.product)} 
                        className="text-text-light hover:text-red-500 shrink-0 self-start p-2 cursor-pointer"
                      >
                        <Trash2 size={16} />
                        <span className="sr-only">Remove</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border-light p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40 transition-transform duration-300">
        <div className="container-custom max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-sm text-text-muted mb-0.5">
              {step === 1 ? "Package Base" : "Grand Total"}
            </p>
            <p className="font-display text-xl md:text-2xl font-bold text-charcoal leading-none">
              ₹{(step === 1 ? packageData.basePrice : grandTotal).toLocaleString("en-IN")}
              {step === 1 && <span className="text-xs font-normal text-text-light ml-2">+ Add-ons later</span>}
            </p>
          </div>
          
          {step === 1 ? (
            <button
              onClick={handleProceedToReview}
              disabled={!selectedTheme}
              className="btn-primary py-3 px-6 md:px-10 gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Review Package <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleAddToCart}
              className="btn-primary py-3 px-6 md:px-10 gap-2 shadow-lg shadow-mocha/20 cursor-pointer"
            >
              Confirm & Add to Cart
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

export default function BuildPackagePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface flex items-center justify-center">Loading...</div>}>
      <BuildPackageContent />
    </Suspense>
  );
}
