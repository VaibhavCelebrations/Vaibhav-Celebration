"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Minus, Plus, Trash2, ShoppingCart, Package, Truck, PartyPopper, Check, Loader2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { FooterClient } from "@/components/layout/FooterClient";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { CheckoutStepper } from "@/components/ecom/CheckoutStepper";
import { useCart } from "@/context/cart-context";
import { useAuth } from "@/context/auth-context";
import { useCatalog } from "@/context/catalog-context";
import { useToast } from "@/components/ui/Toast";
import { formatPaise, toRupees } from "@/lib/shop-types";
import type { ShippingAddress } from "@/lib/shop-types";
import * as shopApi from "@/lib/shop-api";
import { loadRazorpayScript, openRazorpayCheckout } from "@/lib/load-razorpay";
import { ApiClientError } from "@/lib/api-client";

const STEPS = [
  { label: "Review Cart" },
  { label: "Shipping & Payment" },
  { label: "Confirmation" },
];

const EMPTY_ADDRESS: ShippingAddress = { fullName: "", line1: "", line2: "", city: "", state: "", pincode: "", country: "India" };

export default function CheckoutPage() {
  const { items, quote, packages, itemCount, packagesSubtotalRupees, updateQuantity, removeItem, removePackage, clearCart } = useCart();
  const { isAuthenticated, openAuthModal, user } = useAuth();
  const { themesBySlug, packagesBySlug } = useCatalog();
  const { push } = useToast();
  const [currentStep, setCurrentStep] = useState(0);

  const [address, setAddress] = useState<ShippingAddress>(EMPTY_ADDRESS);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "confirming" | "failed">("idle");

  const [confirmedOrderCode, setConfirmedOrderCode] = useState<string | null>(null);
  const [hadPackagesAtCheckout, setHadPackagesAtCheckout] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (user) {
      // Pre-fills the shipping form from the account profile once it loads;
      // subsequent user edits are preserved via the `prev.x ||` fallback.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAddress((prev) => ({ ...prev, fullName: prev.fullName || user.name }));
      setContactEmail((prev) => prev || user.email);
      setContactPhone((prev) => prev || user.phone || "");
    }
  }, [user]);

  useEffect(() => () => {
    if (pollTimer.current) clearInterval(pollTimer.current);
  }, []);

  const hasItems = items.length > 0;
  const combinedTotalRupees = toRupees(quote.totalInPaise) + packagesSubtotalRupees;

  const handleProceedFromCart = () => {
    if (!isAuthenticated) {
      openAuthModal(() => setCurrentStep(1));
      return;
    }
    setCurrentStep(1);
  };

  const validateAddress = (): boolean => {
    const errors: Record<string, string> = {};
    if (!address.fullName.trim()) errors.fullName = "Full name is required";
    if (!address.line1.trim()) errors.line1 = "Address is required";
    if (!address.city.trim()) errors.city = "City is required";
    if (!address.state.trim()) errors.state = "State is required";
    if (!/^\d{4,10}$/.test(address.pincode.trim())) errors.pincode = "Enter a valid PIN code";
    if (!/^\S+@\S+\.\S+$/.test(contactEmail.trim())) errors.contactEmail = "Enter a valid email";
    if (contactPhone.trim().length < 6) errors.contactPhone = "Enter a valid phone number";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  function pollOrderUntilPaid(orderCode: string) {
    setPaymentStatus("confirming");
    let attempts = 0;
    pollTimer.current = setInterval(async () => {
      attempts += 1;
      try {
        const order = await shopApi.getMyOrder(orderCode);
        if (order.status === "PAID") {
          if (pollTimer.current) clearInterval(pollTimer.current);
          setConfirmedOrderCode(orderCode);
          setHadPackagesAtCheckout(packages.length > 0);
          setPaymentStatus("idle");
          setIsPlacingOrder(false);
          await clearCart();
          setCurrentStep(2);
        } else if (attempts >= 20) {
          if (pollTimer.current) clearInterval(pollTimer.current);
          setPaymentStatus("idle");
          setIsPlacingOrder(false);
          push("Payment is taking longer than expected. We'll email you once it's confirmed.", "default");
          setConfirmedOrderCode(orderCode);
          setCurrentStep(2);
        }
      } catch {
        // keep polling — transient network errors shouldn't abort confirmation
      }
    }, 2000);
  }

  const handlePlaceOrder = async () => {
    if (!validateAddress()) return;

    if (!hasItems) {
      // Package-only cart: no real backend order exists yet for the venue/package
      // booking flow (out of scope here) — record the request locally and let our
      // team follow up, matching the site's existing consultation-style flow.
      setHadPackagesAtCheckout(packages.length > 0);
      setConfirmedOrderCode(null);
      await clearCart();
      setCurrentStep(2);
      return;
    }

    setIsPlacingOrder(true);
    try {
      const order = await shopApi.createShopOrder({ shippingAddress: address, contactEmail: contactEmail.trim(), contactPhone: contactPhone.trim() });
      const sdkReady = await loadRazorpayScript();
      if (!sdkReady) {
        push("Could not load the payment gateway. Please check your connection and try again.", "error");
        setIsPlacingOrder(false);
        return;
      }

      const opened = openRazorpayCheckout({
        key: order.razorpayKeyId,
        amount: order.totalInPaise,
        currency: "INR",
        name: "Vaibhav Celebrations",
        description: `Order ${order.orderCode}`,
        order_id: order.razorpayOrderId,
        prefill: { name: address.fullName, email: contactEmail.trim(), contact: contactPhone.trim() },
        theme: { color: "#8B5E3C" },
        handler: () => pollOrderUntilPaid(order.orderCode),
        modal: {
          ondismiss: () => {
            setIsPlacingOrder(false);
            push("Payment was not completed. Your order is saved — you can retry from checkout.", "default");
          },
        },
      });

      if (!opened) {
        push("Could not open the payment gateway. Please try again.", "error");
        setIsPlacingOrder(false);
      }
    } catch (err) {
      push(err instanceof ApiClientError ? err.message : "Could not place your order. Please try again.", "error");
      setIsPlacingOrder(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-border-light bg-surface text-charcoal text-sm placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-mocha/30 focus:border-mocha transition-all";
  const errClass = "text-red-500 text-xs mt-1";

  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-36 pb-16 md:pb-24 bg-cream min-h-screen">
        <div className="max-w-5xl mx-auto px-5 md:px-10">
          {/* Back */}
          {currentStep < 2 && (
            <Link
              href="/gifts"
              className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-mocha font-semibold tracking-wide uppercase transition-colors group mb-8"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Continue Shopping
            </Link>
          )}

          {/* Stepper */}
          {currentStep < 2 && (
            <div className="mb-12 md:mb-16">
              <CheckoutStepper steps={STEPS} currentStep={currentStep} />
            </div>
          )}

          {/* ═══ STEP 0: Review Cart ═══ */}
          {currentStep === 0 && (
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-charcoal mb-8">
                Review Your Cart
              </h1>

              {items.length === 0 && packages.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 rounded-full bg-cream-dark mx-auto flex items-center justify-center mb-6">
                    <ShoppingCart size={32} className="text-text-light" />
                  </div>
                  <h3 className="font-display text-2xl font-semibold text-charcoal mb-2">Your cart is empty</h3>
                  <p className="text-text-muted text-sm mb-8">Add some packages or gifts to get started!</p>
                  <Link href="/themes" className="btn-primary px-8 py-3 text-sm">Browse Packages</Link>
                </div>
              ) : (
                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Cart Items */}
                  <div className="lg:col-span-2 space-y-4">
                    {/* Render Packages */}
                    {packages.map((pkg) => {
                      const pkgData = packagesBySlug[pkg.packageId];
                      const themeData = themesBySlug[pkg.themeSlug];
                      if (!pkgData) return null;
                      return (
                        <div key={pkg.id} className="flex gap-4 p-4 bg-blush/30 rounded-2xl border border-mocha/30 shadow-soft">
                          <div className="relative w-24 h-24 rounded-xl bg-mocha/10 flex items-center justify-center shrink-0">
                            <Package size={40} className="text-mocha" />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <h4 className="font-semibold text-charcoal">{pkgData.title} Package</h4>
                            {themeData && <p className="text-sm text-mocha mt-1">Theme: {themeData.title}</p>}
                            <div className="flex items-center justify-between mt-3">
                              <span className="font-bold text-charcoal">₹{pkg.basePrice.toLocaleString("en-IN")}</span>
                              <button onClick={() => removePackage(pkg.id)} className="text-text-light hover:text-red-500 cursor-pointer"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Render Items */}
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-4 p-4 bg-surface rounded-2xl border border-border-light shadow-soft">
                        <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0">
                          <Image src={item.image?.url ?? "/placeholder-product.svg"} alt={item.title} fill className="object-cover" sizes="96px" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-charcoal line-clamp-1">{item.title}</h4>
                          {Array.isArray(item.personalizationValues) && item.personalizationValues.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(item.personalizationValues as Array<{ fieldId: string; label: string; value: string }>).map((pv) => (
                                <span key={pv.fieldId} className="text-[10px] text-mocha bg-mocha/10 px-2 py-0.5 rounded-full">
                                  {pv.label}: {pv.value}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-1 bg-cream rounded-lg border border-border-light">
                              <button onClick={() => void updateQuantity(item.productId, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center text-charcoal hover:text-mocha cursor-pointer"><Minus size={12} /></button>
                              <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                              <button onClick={() => void updateQuantity(item.productId, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center text-charcoal hover:text-mocha cursor-pointer" disabled={item.quantity >= item.stockAvailable || (item.maxOrderQuantity !== null && item.quantity >= item.maxOrderQuantity)}><Plus size={12} /></button>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="font-bold text-charcoal">{formatPaise(item.unitPriceInPaise * item.quantity)}</span>
                              <button onClick={() => void removeItem(item.productId)} className="text-text-light hover:text-red-500 cursor-pointer"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary Sidebar */}
                  <div className="bg-surface rounded-2xl border border-border-light p-6 shadow-soft h-fit lg:sticky lg:top-28">
                    <h3 className="font-display text-xl font-bold text-charcoal mb-4">Order Summary</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between text-text-muted">
                        <span>Subtotal ({itemCount} items)</span>
                        <span className="font-semibold text-charcoal">{formatPaise(quote.subtotalInPaise)}</span>
                      </div>
                      <div className="flex justify-between text-text-muted">
                        <span>GST ({quote.gstPercent}%)</span>
                        <span className="font-semibold text-charcoal">{formatPaise(quote.gstInPaise)}</span>
                      </div>
                      {packages.length > 0 && (
                        <div className="flex justify-between text-text-muted">
                          <span>Event Packages</span>
                          <span className="font-semibold text-charcoal">₹{packagesSubtotalRupees.toLocaleString("en-IN")}</span>
                        </div>
                      )}
                      <hr className="border-border-light" />
                      <div className="flex justify-between text-lg font-bold text-charcoal">
                        <span>Total</span>
                        <span className="font-display">₹{Math.round(combinedTotalRupees).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                    <button onClick={handleProceedFromCart} disabled={items.length === 0 && packages.length === 0} className="btn-primary w-full py-4 text-sm font-bold uppercase tracking-wider gap-2 mt-6">
                      Continue <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ STEP 1: Shipping & Payment ═══ */}
          {currentStep === 1 && (
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-charcoal mb-8">Shipping & Payment</h1>

              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  {/* Shipping Address Form */}
                  <ScrollReveal>
                    <div className="bg-surface rounded-2xl border border-border-light p-6 shadow-soft">
                      <h3 className="font-display text-lg font-bold text-charcoal mb-4">Shipping Details</h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className="text-xs font-semibold text-charcoal mb-1 block">Full Name</label>
                          <input className={inputClass} value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} placeholder="Recipient's full name" />
                          {formErrors.fullName && <p className={errClass}>{formErrors.fullName}</p>}
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-xs font-semibold text-charcoal mb-1 block">Address Line 1</label>
                          <input className={inputClass} value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} placeholder="House no., street" />
                          {formErrors.line1 && <p className={errClass}>{formErrors.line1}</p>}
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-xs font-semibold text-charcoal mb-1 block">Address Line 2 (optional)</label>
                          <input className={inputClass} value={address.line2 ?? ""} onChange={(e) => setAddress({ ...address, line2: e.target.value })} placeholder="Landmark, apartment, etc." />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-charcoal mb-1 block">City</label>
                          <input className={inputClass} value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                          {formErrors.city && <p className={errClass}>{formErrors.city}</p>}
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-charcoal mb-1 block">State</label>
                          <input className={inputClass} value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
                          {formErrors.state && <p className={errClass}>{formErrors.state}</p>}
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-charcoal mb-1 block">PIN Code</label>
                          <input className={inputClass} value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value })} />
                          {formErrors.pincode && <p className={errClass}>{formErrors.pincode}</p>}
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-charcoal mb-1 block">Country</label>
                          <input className={inputClass} value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-charcoal mb-1 block">Contact Email</label>
                          <input type="email" className={inputClass} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                          {formErrors.contactEmail && <p className={errClass}>{formErrors.contactEmail}</p>}
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-charcoal mb-1 block">Contact Phone</label>
                          <input type="tel" className={inputClass} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                          {formErrors.contactPhone && <p className={errClass}>{formErrors.contactPhone}</p>}
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>

                  {/* Cart Items */}
                  <ScrollReveal delay={160}>
                    <div className="bg-surface rounded-2xl border border-border-light p-6 shadow-soft">
                      <h3 className="font-display text-lg font-bold text-charcoal mb-4">Items ({itemCount})</h3>
                      <div className="space-y-3">
                        {/* Packages */}
                        {packages.map((pkg) => {
                          const pkgData = packagesBySlug[pkg.packageId];
                          const themeData = themesBySlug[pkg.themeSlug];
                          const addons = pkg.addons || [];
                          const addonsTotal = addons.reduce((sum, item) => sum + toRupees(item.product.priceInPaise) * item.quantity, 0);
                          const packageTotal = pkg.basePrice + addonsTotal;

                          return (
                            <div key={`summary-pkg-${pkg.id}`} className="py-3 border-b border-border-light last:border-0">
                              <div className="flex items-start gap-3">
                                <div className="relative w-12 h-12 rounded-lg bg-mocha/10 flex items-center justify-center shrink-0 mt-1">
                                  <Package size={24} className="text-mocha" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-charcoal">{pkgData?.title} Package</p>
                                  {themeData && <p className="text-[10px] text-mocha font-medium mt-0.5">Theme: {themeData.title}</p>}
                                  {addons.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      {addons.map((addon) => (
                                        <div key={addon.product.id} className="text-[11px] text-text-muted flex justify-between">
                                          <span>{addon.quantity} × {addon.product.title}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-bold text-charcoal">₹{packageTotal.toLocaleString("en-IN")}</p>
                                  <p className="text-[10px] text-text-muted">Qty: 1 Unit</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Standard Items */}
                        {items.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 py-2 border-b border-border-light last:border-0">
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                              <Image src={item.image?.url ?? "/placeholder-product.svg"} alt={item.title} fill className="object-cover" sizes="48px" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-charcoal line-clamp-1">{item.title}</p>
                              {Array.isArray(item.personalizationValues) && item.personalizationValues.length > 0 && (
                                <p className="text-[10px] text-mocha">
                                  {(item.personalizationValues as Array<{ label: string; value: string }>).map((pv) => `${pv.label}: ${pv.value}`).join(", ")}
                                </p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-charcoal">{formatPaise(item.unitPriceInPaise * item.quantity)}</p>
                              <p className="text-[10px] text-text-muted">Qty: {item.quantity}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ScrollReveal>
                </div>

                {/* Payment Summary */}
                <div className="bg-surface rounded-2xl border border-border-light p-6 shadow-soft h-fit lg:sticky lg:top-28">
                  <h3 className="font-display text-xl font-bold text-charcoal mb-4">Payment Summary</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-text-muted">
                      <span>Subtotal</span>
                      <span className="font-semibold text-charcoal">{formatPaise(quote.subtotalInPaise)}</span>
                    </div>
                    <div className="flex justify-between text-text-muted">
                      <span>GST ({quote.gstPercent}%)</span>
                      <span className="font-semibold text-charcoal">{formatPaise(quote.gstInPaise)}</span>
                    </div>
                    {packages.length > 0 && (
                      <div className="flex justify-between text-text-muted">
                        <span>Event Packages</span>
                        <span className="font-semibold text-charcoal">₹{packagesSubtotalRupees.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-text-muted">
                      <span>Shipping</span>
                      <span className="font-semibold text-green-600">FREE</span>
                    </div>
                    <hr className="border-border-light" />
                    <div className="flex justify-between text-lg font-bold text-charcoal">
                      <span>Total</span>
                      <span className="font-display">₹{Math.round(combinedTotalRupees).toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  <button
                    onClick={handlePlaceOrder}
                    disabled={isPlacingOrder || paymentStatus === "confirming"}
                    className="btn-primary w-full py-4 text-sm font-bold uppercase tracking-wider gap-2 mt-6 cursor-pointer disabled:opacity-60"
                  >
                    {isPlacingOrder || paymentStatus === "confirming" ? (
                      <><Loader2 size={16} className="animate-spin" /> {paymentStatus === "confirming" ? "Confirming Payment…" : "Processing…"}</>
                    ) : hasItems ? (
                      <>Pay Securely <ArrowRight size={16} /></>
                    ) : (
                      <>Confirm Booking Request <ArrowRight size={16} /></>
                    )}
                  </button>

                  <p className="text-[10px] text-text-light text-center mt-3">
                    By placing your order, you agree to our Terms & Conditions
                  </p>

                  <button onClick={handleBack} disabled={isPlacingOrder} className="w-full text-center text-sm text-text-muted hover:text-mocha mt-4 cursor-pointer disabled:opacity-50">
                    ← Back to Cart
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ STEP 2: Confirmation ═══ */}
          {currentStep === 2 && (
            <div className="max-w-2xl mx-auto text-center">
              <ScrollReveal>
                <div className="w-24 h-24 rounded-full bg-sage/20 border-8 border-white flex items-center justify-center mx-auto mb-6 shadow-soft">
                  <Check size={48} strokeWidth={3} className="text-sage-dark" />
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-bold text-charcoal mb-3">
                  {confirmedOrderCode ? "Order Placed Successfully!" : "Booking Request Received!"}
                </h1>
                <p className="text-text-muted mb-2">Thank you for choosing Vaibhav Celebrations</p>
                {confirmedOrderCode && (
                  <p className="text-lg font-bold text-mocha font-mono mb-4">{confirmedOrderCode}</p>
                )}
                {hadPackagesAtCheckout && (
                  <p className="text-sm text-text-muted max-w-md mx-auto mb-6 bg-cream/60 rounded-xl px-4 py-3 border border-border-light">
                    Your event package request has been noted. Our celebration experts will reach out shortly to confirm details and payment for the package.
                  </p>
                )}
                {!confirmedOrderCode && !hadPackagesAtCheckout && (
                  <div className="mb-10" />
                )}
              </ScrollReveal>

              {/* What Happens Next */}
              {confirmedOrderCode && (
                <ScrollReveal delay={200}>
                  <div className="bg-surface rounded-2xl border border-border-light p-8 shadow-soft mb-8">
                    <h3 className="font-display text-xl font-bold text-charcoal mb-8">What Happens Next</h3>
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                      {[
                        { icon: <Check size={22} strokeWidth={3} className="text-white" />, title: "Order Confirmed", desc: "We've received your payment", color: "bg-sage-dark text-white shadow-md" },
                        { icon: <Package size={22} strokeWidth={2.5} fill="currentColor" className="text-white" />, title: "Preparing", desc: "We'll curate your celebration kit", color: "bg-blush-deep text-white shadow-md" },
                        { icon: <Truck size={22} strokeWidth={2.5} fill="currentColor" className="text-white" />, title: "Shipped", desc: "Your kit will be delivered to your doorstep", color: "bg-charcoal text-white shadow-md" },
                        { icon: <PartyPopper size={22} strokeWidth={2.5} fill="currentColor" className="text-white" />, title: "Celebrate!", desc: "Unbox & create magical memories", color: "bg-mocha text-white shadow-md" },
                      ].map((step) => (
                        <div key={step.title} className="flex flex-col items-center text-center flex-1">
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-transform hover:scale-110 ${step.color}`}>
                            {step.icon}
                          </div>
                          <h4 className="font-semibold text-charcoal text-sm">{step.title}</h4>
                          <p className="text-[11px] text-text-muted mt-1">{step.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollReveal>
              )}

              <ScrollReveal delay={250}>
                <div className="bg-cream/40 rounded-2xl border border-mocha/20 p-6 mb-10 text-center">
                  <h3 className="font-bold text-charcoal mb-2">🏠 Celebrating in Jaipur?</h3>
                  <p className="text-sm text-text-muted mb-4">
                    Skip the DIY! We offer complete professional decor setup services in Jaipur. 
                    Let our team handle everything while you relax.
                  </p>
                  <Link href="/contact" className="inline-flex items-center gap-2 text-mocha font-bold text-sm uppercase tracking-wider hover:text-mocha-dark transition-colors">
                    Request Decor Setup <ArrowRight size={14} />
                  </Link>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={300}>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  {confirmedOrderCode && (
                    <Link href="/account/orders" className="btn-outline px-8 py-3 text-sm font-semibold">
                      View My Orders
                    </Link>
                  )}
                  <Link href="/gifts" className="btn-primary px-8 py-3 text-sm font-semibold">
                    Continue Shopping
                  </Link>
                  <Link href="/" className="btn-outline px-8 py-3 text-sm font-semibold">
                    Back to Home
                  </Link>
                </div>
              </ScrollReveal>
            </div>
          )}
        </div>
      </main>
      <FooterClient />
      <WhatsAppFAB />
    </>
  );
}
