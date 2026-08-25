"use client";

import Image from "next/image";
import Link from "next/link";
import { X, Plus, Minus, Trash2, ShoppingCart, ArrowRight, Package, Loader2 } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { useAuth } from "@/context/auth-context";
import { useCatalog } from "@/context/catalog-context";
import { formatPaise, toRupees } from "@/lib/shop-types";
import { FreeDeliveryProgress } from "@/components/ecom/FreeDeliveryProgress";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { ServerCartItem } from "@/lib/shop-types";

function QuantityInput({ item, updateQuantity }: { item: ServerCartItem; updateQuantity: (id: string, qty: number) => void }) {
  const [val, setVal] = useState(item.quantity.toString());

  useEffect(() => {
    setVal(item.quantity.toString());
  }, [item.quantity]);

  const handleBlur = () => {
    let parsed = parseInt(val, 10);
    const maxQty = item.maxOrderQuantity !== null ? Math.min(item.maxOrderQuantity, item.stockAvailable) : item.stockAvailable;
    
    if (isNaN(parsed) || parsed < 1) {
      parsed = 1;
    } else if (parsed > maxQty) {
      parsed = maxQty;
    }

    if (parsed !== item.quantity) {
      updateQuantity(item.id, parsed);
    } else {
      setVal(item.quantity.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="number"
      min={1}
      max={item.maxOrderQuantity ?? item.stockAvailable}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="w-10 text-center text-xs font-bold text-charcoal bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-mocha rounded-sm"
      style={{ MozAppearance: "textfield" }}
    />
  );
}

export function CartDrawer() {
  const { items, quote, packages, itemCount, packagesSubtotalRupees, isCartOpen, closeCart, updateQuantity, removeItem, removePackage, isLoading } = useCart();
  const { isAuthenticated, openAuthModal } = useAuth();
  const { themesBySlug, packagesBySlug } = useCatalog();
  const router = useRouter();

  const handleCheckout = () => {
    closeCart();
    if (!isAuthenticated) {
      openAuthModal(() => router.push("/checkout"));
      return;
    }
    router.push("/checkout");
  };

  if (!isCartOpen) return null;

  const combinedTotalRupees = toRupees(quote.totalInPaise) + packagesSubtotalRupees;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[150] bg-charcoal/40 backdrop-blur-sm animate-fade-in"
        onClick={closeCart}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 z-[151] w-full max-w-md bg-surface shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-light shrink-0">
          <div className="flex items-center gap-3">
            <ShoppingCart size={20} className="text-mocha" />
            <h2 className="font-display text-xl font-bold text-charcoal">
              Your Cart
            </h2>
            <span className="bg-mocha text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {itemCount}
            </span>
          </div>
          <button
            onClick={closeCart}
            className="w-8 h-8 rounded-full bg-cream hover:bg-blush flex items-center justify-center text-charcoal transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {isLoading && items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-mocha" />
          </div>
        ) : items.length === 0 && packages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-20 h-20 rounded-full bg-cream flex items-center justify-center mb-6">
              <ShoppingCart size={32} className="text-text-light" />
            </div>
            <h3 className="font-display text-xl font-semibold text-charcoal mb-2">
              Your cart is empty
            </h3>
            <p className="text-text-muted text-sm mb-8">
              Browse our collection of gifts and party essentials
            </p>
            <Link
              href="/gifts"
              onClick={closeCart}
              className="btn-primary px-8 py-3 text-sm font-semibold"
            >
              Browse Gifts
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 hide-scrollbar">
              {/* Render Packages */}
              {packages.map((pkg) => {
                const pkgData = packagesBySlug[pkg.packageId];
                const themeData = themesBySlug[pkg.themeSlug];
                if (!pkgData) return null;

                const addons = pkg.addons || [];
                const addonsTotal = addons.reduce((sum, item) => sum + toRupees(item.product.priceInPaise) * item.quantity, 0);
                const packageTotal = pkg.basePrice + addonsTotal;

                return (
                  <div
                    key={`pkg-${pkg.id}`}
                    className="flex flex-col p-4 bg-blush/20 rounded-2xl border border-mocha/30"
                  >
                    <div className="flex gap-4">
                      <div className="relative w-16 h-16 rounded-xl bg-mocha/10 flex items-center justify-center shrink-0">
                        <Package size={28} className="text-mocha" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-charcoal line-clamp-1">
                          {pkgData.title} Package
                        </h4>
                        {themeData && (
                          <p className="text-xs font-medium text-mocha mt-0.5">
                            Theme: {themeData.title}
                          </p>
                        )}
                        <p className="text-sm font-bold text-charcoal mt-1.5">
                          ₹{packageTotal.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <button
                        onClick={() => removePackage(pkg.id)}
                        className="text-text-light hover:text-red-500 transition-colors cursor-pointer self-start p-1"
                        title="Remove Entire Package"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Nested Addons */}
                    {addons.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-mocha/10 space-y-3">
                        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                          Included Add-ons
                        </p>
                        {addons.map((addon) => (
                          <div key={addon.product.id} className="flex items-center gap-3 bg-white/50 p-2 rounded-lg">
                            <div className="relative w-10 h-10 rounded-md overflow-hidden shrink-0">
                              <Image src={addon.product.images[0]?.media?.url ?? "/placeholder-product.svg"} alt={addon.product.title} fill className="object-cover" sizes="40px" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-semibold text-charcoal line-clamp-1">{addon.product.title}</h5>
                              <p className="text-[10px] text-text-muted">{addon.quantity} × {formatPaise(addon.product.priceInPaise)}</p>
                            </div>
                            <div className="text-xs font-bold text-charcoal">
                              ₹{(addon.quantity * toRupees(addon.product.priceInPaise)).toLocaleString("en-IN")}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Render Items */}
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-3 bg-cream/50 rounded-xl border border-border-light"
                >
                  {/* Thumbnail */}
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0">
                    <Image
                      src={item.image?.url ?? "/placeholder-product.svg"}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-charcoal line-clamp-1">
                      {item.title}
                    </h4>
                    {item.registry && (
                      <p className="text-[10px] font-bold uppercase tracking-wider text-mocha mt-0.5">
                        Registry gift · {item.registry.registryCode}
                      </p>
                    )}

                    {!item.isActive && (
                      <p className="text-[10px] text-red-500 font-semibold mt-1">No longer available</p>
                    )}

                    {/* Personalization values */}
                    {Array.isArray(item.personalizationValues) && item.personalizationValues.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(item.personalizationValues as Array<{ fieldId?: string; label: string; value: string }>).map((pv, idx) => (
                          <span key={pv.fieldId ?? `${pv.label}-${idx}`} className="text-[10px] text-mocha bg-mocha/10 px-2 py-0.5 rounded-full">
                            {typeof pv.label === "string" ? pv.label : "Personalization"}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-sm font-bold text-charcoal mt-1.5">
                      {formatPaise((item.unitPriceInPaise + item.personalizationCostInPaise) * item.quantity)}
                      {item.quantity > 1 && (
                        <span className="text-text-light font-normal text-xs ml-1">
                          ({formatPaise(item.unitPriceInPaise + item.personalizationCostInPaise)} × {item.quantity})
                        </span>
                      )}
                    </p>
                    {item.personalizationCostInPaise > 0 && (
                      <p className="mt-0.5 text-[10px] font-semibold text-mocha">
                        Includes {formatPaise(item.personalizationCostInPaise)} personalization per item
                      </p>
                    )}

                    {/* Quantity + Remove */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 bg-surface border border-border-light rounded-lg">
                        <button
                          onClick={() => void updateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center text-charcoal hover:text-mocha transition-colors cursor-pointer"
                        >
                          <Minus size={12} />
                        </button>
                        <QuantityInput item={item} updateQuantity={updateQuantity} />
                        <button
                          onClick={() => void updateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center text-charcoal hover:text-mocha transition-colors cursor-pointer"
                          disabled={item.quantity >= item.stockAvailable || (item.maxOrderQuantity !== null && item.quantity >= item.maxOrderQuantity)}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <button
                        onClick={() => void removeItem(item.id)}
                        className="text-text-light hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Summary */}
            <div className="border-t border-border-light px-6 py-5 space-y-3 bg-cream/30 shrink-0">
              {items.length > 0 && (
                <FreeDeliveryProgress
                  subtotalInPaise={quote.subtotalInPaise}
                  freeShippingThresholdInPaise={quote.freeShippingThresholdInPaise}
                  shippingFeeInPaise={quote.shippingInPaise || 19_900}
                  shippingWaived={quote.shippingWaived}
                />
              )}
              <div className="flex justify-between text-sm text-text-muted">
                <span>Subtotal</span>
                <span className="font-semibold text-charcoal">{formatPaise(quote.subtotalInPaise)}</span>
              </div>
              {items.length > 0 && (
                <div className="flex justify-between text-sm text-text-muted">
                  <span>Shipping</span>
                  {quote.shippingWaived ? (
                    <span className="font-semibold text-green-700">FREE</span>
                  ) : (
                    <span className="font-semibold text-charcoal">{formatPaise(quote.shippingInPaise)}</span>
                  )}
                </div>
              )}
              <div className="flex justify-between text-sm text-text-muted">
                <span>GST ({quote.gstPercent}%)</span>
                <span className="font-semibold text-charcoal">{formatPaise(quote.gstInPaise)}</span>
              </div>
              {packages.length > 0 && (
                <div className="flex justify-between text-sm text-text-muted">
                  <span>Event Packages ({packages.length})</span>
                  <span className="font-semibold text-charcoal">₹{packagesSubtotalRupees.toLocaleString("en-IN")}</span>
                </div>
              )}
              <hr className="border-border-light" />
              <div className="flex justify-between text-base font-bold text-charcoal">
                <span>Total</span>
                <span className="font-display text-lg">₹{Math.round(combinedTotalRupees).toLocaleString("en-IN")}</span>
              </div>
              <button
                onClick={handleCheckout}
                className="btn-primary w-full py-4 text-sm font-bold uppercase tracking-wider gap-2 mt-2"
              >
                Proceed to Checkout <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
