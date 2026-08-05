"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Minus, Plus, Trash2, ShoppingCart, Package, Truck, PartyPopper, Check, Loader2, CalendarHeart } from "lucide-react";
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
  { label: "Checkout" },
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
  
  const [eventDetails, setEventDetails] = useState({
    childName: "",
    childAge: "",
    eventDate: "",
    venue: "",
    guestCount: "",
    notes: ""
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "confirming" | "failed">("idle");

  const [confirmedOrderCode, setConfirmedOrderCode] = useState<string | null>(null);
  const [hadPackagesAtCheckout, setHadPackagesAtCheckout] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (user) {
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

  const validateCheckout = (): boolean => {
    const errors: Record<string, string> = {};
    if (!address.fullName.trim()) errors.fullName = "Full name is required";
    if (!address.line1.trim()) errors.line1 = "Address is required";
    if (!address.city.trim()) errors.city = "City is required";
    if (!address.state.trim()) errors.state = "State is required";
    if (!/^\d{4,10}$/.test(address.pincode.trim())) errors.pincode = "Enter a valid PIN code";
    if (!/^\S+@\S+\.\S+$/.test(contactEmail.trim())) errors.contactEmail = "Enter a valid email";
    if (contactPhone.trim().length < 6) errors.contactPhone = "Enter a valid phone number";
    
    if (packages.length > 0) {
      if (!eventDetails.childName.trim()) errors.childName = "Birthday child name is required";
      if (!eventDetails.eventDate.trim()) errors.eventDate = "Event date is required";
    }

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
          setCurrentStep(1);
        } else if (attempts >= 20) {
          if (pollTimer.current) clearInterval(pollTimer.current);
          setPaymentStatus("idle");
          setIsPlacingOrder(false);
          push("Payment is taking longer than expected. We'll email you once it's confirmed.", "default");
          setConfirmedOrderCode(orderCode);
          setCurrentStep(1);
        }
      } catch {
        // keep polling
      }
    }, 2000);
  }

  const handlePlaceOrder = async () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }

    if (!validateCheckout()) {
      push("Please fill in all required fields.", "error");
      return;
    }

    if (!hasItems) {
      setHadPackagesAtCheckout(packages.length > 0);
      setConfirmedOrderCode(null);
      await clearCart();
      setCurrentStep(1);
      return;
    }

    setIsPlacingOrder(true);
    try {
      const order = await shopApi.createShopOrder({ 
        shippingAddress: address, 
        contactEmail: contactEmail.trim(), 
        contactPhone: contactPhone.trim(),
        eventDetails
      });
      
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

  const inputClass = "w-full px-4 py-3 rounded-xl border border-border-light bg-surface text-charcoal text-sm placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-mocha/30 focus:border-mocha transition-all";
  const errClass = "text-red-500 text-xs mt-1";

  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-36 pb-16 md:pb-24 bg-cream min-h-screen">
        <div className="max-w-6xl mx-auto px-5 md:px-10">
          {currentStep < 1 && (
            <Link
              href="/gifts"
              className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-mocha font-semibold tracking-wide uppercase transition-colors group mb-8"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Continue Shopping
            </Link>
          )}

          {currentStep < 1 && (
            <div className="mb-12 md:mb-16">
              <CheckoutStepper steps={STEPS} currentStep={currentStep} />
            </div>
          )}

          {/* ═══ STEP 0: Checkout ═══ */}
          {currentStep === 0 && (
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-charcoal mb-8">Checkout</h1>

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
                  <div className="lg:col-span-2 space-y-8">
                    
                    {/* Cart Items */}
                    <div className="bg-surface rounded-2xl border border-border-light p-6 shadow-soft">
                      <h3 className="font-display text-lg font-bold text-charcoal mb-4">Cart Items ({itemCount})</h3>
                      <div className="space-y-4">
                        {/* Packages */}
                        {packages.map((pkg) => {
                          const pkgData = packagesBySlug[pkg.packageId];
                          const themeData = themesBySlug[pkg.themeSlug];
                          if (!pkgData) return null;
                          return (
                            <div key={pkg.id} className="flex gap-4 p-4 bg-blush/30 rounded-2xl border border-mocha/30 shadow-soft">
                              <div className="relative w-20 h-20 rounded-xl bg-mocha/10 flex items-center justify-center shrink-0">
                                <Package size={32} className="text-mocha" />
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <h4 className="font-semibold text-charcoal text-sm">{pkgData.title} Package</h4>
                                {themeData && <p className="text-xs text-mocha mt-1">Theme: {themeData.title}</p>}
                                <div className="flex items-center justify-between mt-3">
                                  <span className="font-bold text-charcoal text-sm">₹{pkg.basePrice.toLocaleString("en-IN")}</span>
                                  <button onClick={() => removePackage(pkg.id)} className="text-text-light hover:text-red-500 cursor-pointer"><Trash2 size={14} /></button>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Standard Items */}
                        {items.map((item) => (
                          <div key={item.id} className="flex items-center gap-4 py-2 border-b border-border-light last:border-0">
                            <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
                              <Image src={item.image?.url ?? "/placeholder-product.svg"} alt={item.title} fill className="object-cover" sizes="64px" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-charcoal text-sm line-clamp-1">{item.title}</h4>
                              {Array.isArray(item.personalizationValues) && item.personalizationValues.length > 0 && (
                                <p className="text-[10px] text-mocha">
                                  {(item.personalizationValues as Array<{ label: string; value: string }>).map((pv) => `${pv.label}: ${pv.value}`).join(", ")}
                                </p>
                              )}
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-1 bg-cream rounded-lg border border-border-light h-8">
                                  <button onClick={() => void updateQuantity(item.productId, item.quantity - 1)} className="w-8 h-full flex items-center justify-center text-charcoal hover:text-mocha cursor-pointer"><Minus size={12} /></button>
                                  <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                                  <button onClick={() => void updateQuantity(item.productId, item.quantity + 1)} className="w-8 h-full flex items-center justify-center text-charcoal hover:text-mocha cursor-pointer" disabled={item.quantity >= item.stockAvailable || (item.maxOrderQuantity !== null && item.quantity >= item.maxOrderQuantity)}><Plus size={12} /></button>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-charcoal text-sm">{formatPaise(item.unitPriceInPaise * item.quantity)}</span>
                                  <button onClick={() => void removeItem(item.productId)} className="text-text-light hover:text-red-500 cursor-pointer"><Trash2 size={14} /></button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Event Details Form */}
                    {packages.length > 0 && (
                      <ScrollReveal>
                        <div className="bg-surface rounded-2xl border border-border-light p-6 shadow-soft">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-full bg-mocha/10 flex items-center justify-center text-mocha">
                              <CalendarHeart size={16} />
                            </div>
                            <h3 className="font-display text-lg font-bold text-charcoal">Event Details</h3>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-semibold text-charcoal mb-1 block">Birthday Child's Name <span className="text-red-500">*</span></label>
                              <input className={inputClass} value={eventDetails.childName} onChange={(e) => setEventDetails({ ...eventDetails, childName: e.target.value })} placeholder="E.g. Aryan" />
                              {formErrors.childName && <p className={errClass}>{formErrors.childName}</p>}
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-charcoal mb-1 block">Child's Age (Turning)</label>
                              <input className={inputClass} value={eventDetails.childAge} onChange={(e) => setEventDetails({ ...eventDetails, childAge: e.target.value })} placeholder="E.g. 5" type="number" min={1} />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-charcoal mb-1 block">Event Date <span className="text-red-500">*</span></label>
                              <input className={inputClass} value={eventDetails.eventDate} onChange={(e) => setEventDetails({ ...eventDetails, eventDate: e.target.value })} type="date" />
                              {formErrors.eventDate && <p className={errClass}>{formErrors.eventDate}</p>}
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-charcoal mb-1 block">Expected Guest Count</label>
                              <input className={inputClass} value={eventDetails.guestCount} onChange={(e) => setEventDetails({ ...eventDetails, guestCount: e.target.value })} placeholder="E.g. 150" type="number" />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="text-xs font-semibold text-charcoal mb-1 block">Venue Address</label>
                              <input className={inputClass} value={eventDetails.venue} onChange={(e) => setEventDetails({ ...eventDetails, venue: e.target.value })} placeholder="Hotel or home address" />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="text-xs font-semibold text-charcoal mb-1 block">Additional Notes</label>
                              <textarea className={`${inputClass} resize-none h-24`} value={eventDetails.notes} onChange={(e) => setEventDetails({ ...eventDetails, notes: e.target.value })} placeholder="Any specific requirements or preferences..." />
                            </div>
                          </div>
                        </div>
                      </ScrollReveal>
                    )}

                    {/* Shipping Address Form */}
                    <ScrollReveal>
                      <div className="bg-surface rounded-2xl border border-border-light p-6 shadow-soft">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-display text-lg font-bold text-charcoal">Shipping Details</h3>
                          {isAuthenticated && (
                            <span className="text-xs bg-sage/20 text-sage-dark px-3 py-1 rounded-full font-semibold">Using account profile</span>
                          )}
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="sm:col-span-2">
                            <label className="text-xs font-semibold text-charcoal mb-1 block">Full Name <span className="text-red-500">*</span></label>
                            <input className={inputClass} value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} placeholder="Recipient's full name" />
                            {formErrors.fullName && <p className={errClass}>{formErrors.fullName}</p>}
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-xs font-semibold text-charcoal mb-1 block">Address Line 1 <span className="text-red-500">*</span></label>
                            <input className={inputClass} value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} placeholder="House no., street" />
                            {formErrors.line1 && <p className={errClass}>{formErrors.line1}</p>}
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-xs font-semibold text-charcoal mb-1 block">Address Line 2 (optional)</label>
                            <input className={inputClass} value={address.line2 ?? ""} onChange={(e) => setAddress({ ...address, line2: e.target.value })} placeholder="Landmark, apartment, etc." />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-charcoal mb-1 block">City <span className="text-red-500">*</span></label>
                            <input className={inputClass} value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                            {formErrors.city && <p className={errClass}>{formErrors.city}</p>}
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-charcoal mb-1 block">State <span className="text-red-500">*</span></label>
                            <input className={inputClass} value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
                            {formErrors.state && <p className={errClass}>{formErrors.state}</p>}
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-charcoal mb-1 block">PIN Code <span className="text-red-500">*</span></label>
                            <input className={inputClass} value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value })} />
                            {formErrors.pincode && <p className={errClass}>{formErrors.pincode}</p>}
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-charcoal mb-1 block">Country <span className="text-red-500">*</span></label>
                            <input className={inputClass} value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-charcoal mb-1 block">Contact Email <span className="text-red-500">*</span></label>
                            <input type="email" className={inputClass} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                            {formErrors.contactEmail && <p className={errClass}>{formErrors.contactEmail}</p>}
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-charcoal mb-1 block">Contact Phone <span className="text-red-500">*</span></label>
                            <input type="tel" className={inputClass} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                            {formErrors.contactPhone && <p className={errClass}>{formErrors.contactPhone}</p>}
                          </div>
                        </div>
                      </div>
                    </ScrollReveal>
                  </div>

                  {/* Payment Summary */}
                  <div className="bg-surface rounded-2xl border border-border-light p-6 shadow-soft h-fit lg:sticky lg:top-28">
                    <h3 className="font-display text-xl font-bold text-charcoal mb-4">Order Summary</h3>
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

                    {!isAuthenticated ? (
                      <div className="mt-6 space-y-3">
                        <button onClick={() => openAuthModal()} className="btn-primary w-full py-4 text-sm font-bold uppercase tracking-wider">
                          Login to Checkout
                        </button>
                        <p className="text-xs text-text-muted text-center">You must be logged in to place an order</p>
                      </div>
                    ) : (
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
                    )}

                    <p className="text-[10px] text-text-light text-center mt-3">
                      By placing your order, you agree to our Terms & Conditions
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ STEP 1: Confirmation ═══ */}
          {currentStep === 1 && (
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
