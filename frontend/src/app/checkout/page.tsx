"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Minus, Plus, Trash2, ShoppingCart, Package, Truck, PartyPopper, Check } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { FooterClient } from "@/components/layout/FooterClient";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { CheckoutStepper } from "@/components/ecom/CheckoutStepper";
import { useCart } from "@/context/cart-context";
import { useAuth } from "@/context/auth-context";
import { useCatalog } from "@/context/catalog-context";

const STEPS = [
  { label: "Review Cart" },
  { label: "Summary" },
  { label: "Confirmation" },
];

export default function CheckoutPage() {
  const { items, packages, summary, updateQuantity, removeItem, removePackage, clearCart } = useCart();
  const { isAuthenticated, openAuthModal, user } = useAuth();
  const { themesBySlug, packagesBySlug } = useCatalog();
  const [currentStep, setCurrentStep] = useState(0);

  const handleProceedFromCart = () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    setCurrentStep(1);
  };

  const orderTotal = summary.total;
  const [orderId] = useState(() => `VBC-OR-2026-${String(Math.floor(Math.random() * 999999)).padStart(6, "0")}`);

  const handleNext = () => {
    if (currentStep === 0) {
      handleProceedFromCart();
    } else if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handlePlaceOrder = () => {
    setCurrentStep(2); // Jump to confirmation
    clearCart();
  };

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
                    {packages.map((pkg, index) => {
                      const pkgData = packagesBySlug[pkg.packageId];
                      const themeData = themesBySlug[pkg.themeSlug];
                      if (!pkgData) return null;
                      return (
                        <div key={`pkg-${index}`} className="flex gap-4 p-4 bg-blush/30 rounded-2xl border border-mocha/30 shadow-soft">
                          <div className="relative w-24 h-24 rounded-xl bg-mocha/10 flex items-center justify-center shrink-0">
                            <Package size={40} className="text-mocha" />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <h4 className="font-semibold text-charcoal">{pkgData.title} Package</h4>
                            {themeData && <p className="text-sm text-mocha mt-1">Theme: {themeData.title}</p>}
                            <div className="flex items-center justify-between mt-3">
                              <span className="font-bold text-charcoal">₹{pkg.basePrice.toLocaleString("en-IN")}</span>
                              <button onClick={() => removePackage(pkg.packageId)} className="text-text-light hover:text-red-500 cursor-pointer"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Render Items */}
                    {items.map((item) => (
                      <div key={item.product.id} className="flex gap-4 p-4 bg-surface rounded-2xl border border-border-light shadow-soft">
                        <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0">
                          <Image src={item.product.images[0]} alt={item.product.title} fill className="object-cover" sizes="96px" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-charcoal line-clamp-1">{item.product.title}</h4>
                          {item.personalizationValues.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.personalizationValues.map((pv) => (
                                <span key={pv.fieldId} className="text-[10px] text-mocha bg-mocha/10 px-2 py-0.5 rounded-full">
                                  {pv.label}: {pv.value}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-1 bg-cream rounded-lg border border-border-light">
                              <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center text-charcoal hover:text-mocha cursor-pointer"><Minus size={12} /></button>
                              <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center text-charcoal hover:text-mocha cursor-pointer" disabled={item.quantity >= Math.min(item.product.maxOrderQuantity, item.product.stock)}><Plus size={12} /></button>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="font-bold text-charcoal">₹{(item.product.price * item.quantity).toLocaleString("en-IN")}</span>
                              <button onClick={() => removeItem(item.product.id)} className="text-text-light hover:text-red-500 cursor-pointer"><Trash2 size={14} /></button>
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
                        <span>Subtotal ({summary.itemCount} items)</span>
                        <span className="font-semibold text-charcoal">₹{summary.subtotal.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between text-text-muted">
                        <span>GST (18%)</span>
                        <span className="font-semibold text-charcoal">₹{summary.gst.toLocaleString("en-IN")}</span>
                      </div>
                      <hr className="border-border-light" />
                      <div className="flex justify-between text-lg font-bold text-charcoal">
                        <span>Total</span>
                        <span className="font-display">₹{summary.total.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                    <button onClick={handleNext} disabled={items.length === 0 && packages.length === 0} className="btn-primary w-full py-4 text-sm font-bold uppercase tracking-wider gap-2 mt-6">
                      Continue <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ STEP 1: Order Summary ═══ */}
          {currentStep === 1 && (
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-charcoal mb-8">Order Summary</h1>

              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  {/* User Info */}
                  {user && (
                    <ScrollReveal>
                      <div className="bg-surface rounded-2xl border border-border-light p-6 shadow-soft">
                        <h3 className="font-display text-lg font-bold text-charcoal mb-4">Customer Details</h3>
                        <div className="grid sm:grid-cols-2 gap-3 text-sm">
                          <div><span className="text-text-muted">Name:</span> <span className="font-semibold text-charcoal ml-2">{user.name}</span></div>
                          <div><span className="text-text-muted">Email:</span> <span className="font-semibold text-charcoal ml-2">{user.email}</span></div>
                          <div><span className="text-text-muted">Phone:</span> <span className="font-semibold text-charcoal ml-2">{user.phone}</span></div>
                        </div>
                      </div>
                    </ScrollReveal>
                  )}

                  {/* Cart Items */}
                  <ScrollReveal delay={160}>
                    <div className="bg-surface rounded-2xl border border-border-light p-6 shadow-soft">
                      <h3 className="font-display text-lg font-bold text-charcoal mb-4">Items ({summary.itemCount})</h3>
                      <div className="space-y-3">
                        {/* Packages */}
                        {packages.map((pkg) => {
                          const pkgData = packagesBySlug[pkg.packageId];
                          const themeData = themesBySlug[pkg.themeSlug];
                          const addons = pkg.addons || [];
                          const addonsTotal = addons.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
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
                                      {addons.map(addon => (
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
                          <div key={item.product.id} className="flex items-center gap-3 py-2 border-b border-border-light last:border-0">
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                              <Image src={item.product.images[0]} alt={item.product.title} fill className="object-cover" sizes="48px" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-charcoal line-clamp-1">{item.product.title}</p>
                              {item.personalizationValues.length > 0 && (
                                <p className="text-[10px] text-mocha">
                                  {item.personalizationValues.map((pv) => `${pv.label}: ${pv.value}`).join(", ")}
                                </p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-charcoal">₹{(item.product.price * item.quantity).toLocaleString("en-IN")}</p>
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
                      <span className="font-semibold text-charcoal">₹{summary.subtotal.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-text-muted">
                      <span>GST (18%)</span>
                      <span className="font-semibold text-charcoal">₹{summary.gst.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-text-muted">
                      <span>Shipping</span>
                      <span className="font-semibold text-green-600">FREE</span>
                    </div>
                    <hr className="border-border-light" />
                    <div className="flex justify-between text-lg font-bold text-charcoal">
                      <span>Total</span>
                      <span className="font-display">₹{orderTotal.toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  <button onClick={handlePlaceOrder} className="btn-primary w-full py-4 text-sm font-bold uppercase tracking-wider gap-2 mt-6 cursor-pointer">
                    Proceed to Payment <ArrowRight size={16} />
                  </button>

                  <p className="text-[10px] text-text-light text-center mt-3">
                    By placing your order, you agree to our Terms & Conditions
                  </p>

                  <button onClick={handleBack} className="w-full text-center text-sm text-text-muted hover:text-mocha mt-4 cursor-pointer">
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
                  Order Placed Successfully!
                </h1>
                <p className="text-text-muted mb-2">Thank you for choosing Vaibhav Celebrations</p>
                <p className="text-lg font-bold text-mocha font-mono mb-10">{orderId}</p>
              </ScrollReveal>

              {/* What Happens Next */}
              <ScrollReveal delay={200}>
                <div className="bg-surface rounded-2xl border border-border-light p-8 shadow-soft mb-8">
                  <h3 className="font-display text-xl font-bold text-charcoal mb-8">What Happens Next</h3>
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                    {[
                      { icon: <Check size={22} strokeWidth={3} className="text-white" />, title: "Order Confirmed", desc: "We've received your order", color: "bg-sage-dark text-white shadow-md" },
                      { icon: <Package size={22} strokeWidth={2.5} fill="currentColor" className="text-white" />, title: "Preparing", desc: "We'll curate your celebration kit", color: "bg-blush-deep text-white shadow-md" },
                      { icon: <Truck size={22} strokeWidth={2.5} fill="currentColor" className="text-white" />, title: "Shipped", desc: "Your kit will be delivered to your doorstep", color: "bg-charcoal text-white shadow-md" },
                      { icon: <PartyPopper size={22} strokeWidth={2.5} fill="currentColor" className="text-white" />, title: "Celebrate!", desc: "Unbox & create magical memories", color: "bg-mocha text-white shadow-md" },
                    ].map((step, i) => (
                      <div key={step.title} className="flex flex-col items-center text-center flex-1">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-transform hover:scale-110 ${step.color}`}>
                          {step.icon}
                        </div>
                        <h4 className="font-semibold text-charcoal text-sm">{step.title}</h4>
                        <p className="text-[11px] text-text-muted mt-1">{step.desc}</p>
                        {i < 3 && (
                          <div className="hidden md:block absolute translate-x-[70px]">
                            <ArrowRight size={14} className="text-text-light/50" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollReveal>

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
