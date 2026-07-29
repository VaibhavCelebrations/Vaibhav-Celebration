"use client";

import Image from "next/image";
import Link from "next/link";
import { X, Plus, Minus, Trash2, ShoppingCart, ArrowRight, Package } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { useAuth } from "@/context/auth-context";
import { useCatalog } from "@/context/catalog-context";
import { useRouter } from "next/navigation";

export function CartDrawer() {
  const { items, packages, summary, isCartOpen, closeCart, updateQuantity, removeItem, removePackage } = useCart();
  const { isAuthenticated, openAuthModal } = useAuth();
  const { themesBySlug, packagesBySlug } = useCatalog();
  const router = useRouter();

  const handleCheckout = () => {
    closeCart();
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    router.push("/checkout");
  };

  if (!isCartOpen) return null;

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
              {summary.itemCount}
            </span>
          </div>
          <button
            onClick={closeCart}
            className="w-8 h-8 rounded-full bg-cream hover:bg-blush flex items-center justify-center text-charcoal transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Cart Items */}
        {items.length === 0 && packages.length === 0 ? (
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
                const addonsTotal = addons.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
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
                              <Image src={addon.product.images[0]} alt={addon.product.title} fill className="object-cover" sizes="40px" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-semibold text-charcoal line-clamp-1">{addon.product.title}</h5>
                              <p className="text-[10px] text-text-muted">{addon.quantity} × ₹{addon.product.price.toLocaleString("en-IN")}</p>
                            </div>
                            <div className="text-xs font-bold text-charcoal">
                              ₹{(addon.quantity * addon.product.price).toLocaleString("en-IN")}
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
                  key={item.product.id}
                  className="flex gap-4 p-3 bg-cream/50 rounded-xl border border-border-light"
                >
                  {/* Thumbnail */}
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0">
                    <Image
                      src={item.product.images[0]}
                      alt={item.product.title}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-charcoal line-clamp-1">
                      {item.product.title}
                    </h4>

                    {/* Personalization values */}
                    {item.personalizationValues.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.personalizationValues.map((pv) => (
                          <span key={pv.fieldId} className="text-[10px] text-mocha bg-mocha/10 px-2 py-0.5 rounded-full">
                            {pv.label}: {pv.value}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-sm font-bold text-charcoal mt-1.5">
                      ₹{item.product.price * item.quantity}
                      {item.quantity > 1 && (
                        <span className="text-text-light font-normal text-xs ml-1">
                          (₹{item.product.price} × {item.quantity})
                        </span>
                      )}
                    </p>

                    {/* Quantity + Remove */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 bg-surface border border-border-light rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center text-charcoal hover:text-mocha transition-colors cursor-pointer"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-charcoal">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center text-charcoal hover:text-mocha transition-colors cursor-pointer"
                          disabled={item.quantity >= Math.min(item.product.maxOrderQuantity, item.product.stock)}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.product.id)}
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
              <div className="flex justify-between text-sm text-text-muted">
                <span>Subtotal</span>
                <span className="font-semibold text-charcoal">₹{summary.subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-sm text-text-muted">
                <span>GST (18%)</span>
                <span className="font-semibold text-charcoal">₹{summary.gst.toLocaleString("en-IN")}</span>
              </div>
              <hr className="border-border-light" />
              <div className="flex justify-between text-base font-bold text-charcoal">
                <span>Total</span>
                <span className="font-display text-lg">₹{summary.total.toLocaleString("en-IN")}</span>
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
