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
import { FreeDeliveryProgress } from "@/components/ecom/FreeDeliveryProgress";
import { useCart } from "@/context/cart-context";
import { useAuth } from "@/context/auth-context";
import { useCatalog } from "@/context/catalog-context";
import { useToast } from "@/components/ui/Toast";
import { formatPaise, toRupees } from "@/lib/shop-types";
import type { ShippingAddress, CreateOrderResult, CheckoutQuoteResult, ServerCartItem } from "@/lib/shop-types";
import * as shopApi from "@/lib/shop-api";
import { loadRazorpayScript, openRazorpayCheckout } from "@/lib/load-razorpay";
import { ApiClientError } from "@/lib/api-client";
import { CacheStore } from "@/lib/cache-store";
import { useDeliverySettings } from "@/lib/delivery-settings";
import type { PersonalizationValue } from "@/lib/ecom-types";
import { combineCartQuote } from "@/lib/cart-totals";

const DIRECT_CHECKOUT_KEY = "vc_direct_checkout";

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

type DirectCheckoutPayload = {
  productId: string;
  title: string;
  quantity: number;
  unitPriceInPaise: number;
  personalizationSelected: boolean;
  personalizationCostInPaise: number;
  personalizationValues: PersonalizationValue[];
};

const STEPS = [
  { label: "Checkout" },
  { label: "Confirmation" },
];

const EMPTY_ADDRESS: ShippingAddress = { fullName: "", line1: "", line2: "", city: "", state: "", pincode: "", country: "India" };

export default function CheckoutPage() {
  const { items, quote, packages, itemCount, packagesSubtotalRupees, updateQuantity, removeItem, removePackage, refreshCart, clearCart } = useCart();
  const { isAuthenticated, openAuthModal, user } = useAuth();
  const { themesBySlug, packagesBySlug } = useCatalog();
  const { push } = useToast();
  const deliverySettings = useDeliverySettings();
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
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "confirming" | "failed" | "cancelled" | "pending" | "success">("idle");

  const [confirmedOrderCode, setConfirmedOrderCode] = useState<string | null>(null);
  const [confirmedInvoiceUrl, setConfirmedInvoiceUrl] = useState<string | null>(null);
  const [hadPackagesAtCheckout, setHadPackagesAtCheckout] = useState(false);
  const [pendingOrderCode, setPendingOrderCode] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [registryCheckout, setRegistryCheckout] = useState<CheckoutQuoteResult["registryCheckout"]>(null);
  const [directCheckout, setDirectCheckout] = useState<DirectCheckoutPayload | null>(null);

  useEffect(() => {
    const payload = CacheStore.getSessionItem<DirectCheckoutPayload | null>(DIRECT_CHECKOUT_KEY, null);
    if (payload?.productId) setDirectCheckout(payload);
  }, []);

  useEffect(() => {
    if (currentStep === 1) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep]);

  useEffect(() => {
    if (user && !registryCheckout) {
      setAddress((prev) => ({ ...prev, fullName: prev.fullName || user.name }));
      setContactEmail((prev) => prev || user.email);
      setContactPhone((prev) => prev || user.phone || "");
    }
  }, [user, registryCheckout]);

  useEffect(() => {
    if (!items.some((i) => i.registryItemId)) {
      setRegistryCheckout(null);
      return;
    }
    void shopApi.getCheckoutQuote().then((q) => {
      if (q.registryCheckout) {
        setRegistryCheckout(q.registryCheckout);
        setAddress(q.registryCheckout.shippingAddress);
      }
    }).catch(() => undefined);
  }, [items]);

  useEffect(() => () => {
    if (pollTimer.current) clearInterval(pollTimer.current);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  const hasItems = items.length > 0;
  const isDirectCheckout = Boolean(directCheckout);
  const pkg = packages.length > 0 ? packages[0] : null;
  const directSubtotal =
    directCheckout
      ? (directCheckout.unitPriceInPaise + (directCheckout.personalizationSelected ? directCheckout.personalizationCostInPaise : 0)) *
        directCheckout.quantity
      : 0;
  const directShippingWaived = directSubtotal >= deliverySettings.freeShippingThresholdInPaise;
  const directShipping = directShippingWaived ? 0 : deliverySettings.shippingFeeInPaise;
  const directTaxable = directSubtotal + directShipping;
  const directGst = Math.round((directTaxable * 18) / 100);
  const directQuote = {
    subtotalInPaise: directSubtotal,
    shippingInPaise: directShipping,
    shippingWaived: directShippingWaived,
    freeShippingThresholdInPaise: deliverySettings.freeShippingThresholdInPaise,
    amountUntilFreeShippingInPaise: Math.max(0, deliverySettings.freeShippingThresholdInPaise - directSubtotal),
    gstPercent: 18,
    gstInPaise: directGst,
    totalInPaise: directTaxable + directGst,
    lines: [],
  };
  // One shipping/GST calculation across the shop cart AND event packages —
  // free delivery must consider both, matching the backend's combined quote.
  const displayQuote = isDirectCheckout
    ? directQuote
    : combineCartQuote(quote, packages, deliverySettings.shippingFeeInPaise);
  const combinedTotalRupees = toRupees(displayQuote.totalInPaise);

  // Package-only checkout (no shop cart items) reuses the delivery address
  // already collected in the package builder — it has no address form of
  // its own here, so that address must exist and be sent to the backend.
  const packageOnlyCheckout = !hasItems && !isDirectCheckout && packages.length > 0;

  const validateCheckout = (): boolean => {
    const errors: Record<string, string> = {};
    if (hasItems || isDirectCheckout) {
      if (!address.fullName.trim()) errors.fullName = "Full name is required";
      if (!address.line1.trim()) errors.line1 = "Address is required";
      if (!address.city.trim()) errors.city = "City is required";
      if (!address.state.trim()) errors.state = "State is required";
      if (!/^\d{4,10}$/.test(address.pincode.trim())) errors.pincode = "Enter a valid PIN code";
    } else if (packageOnlyCheckout) {
      if (!pkg?.builderInput?.shippingAddress?.line1) {
        errors.fullName = "Please complete the delivery address in the package builder";
      }
    } else {
      if (!address.fullName.trim()) errors.fullName = "Full name is required";
    }
    if (!/^\S+@\S+\.\S+$/.test(contactEmail.trim())) errors.contactEmail = "Enter a valid email";
    if (contactPhone.trim().length < 6) errors.contactPhone = "Enter a valid phone number";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isFormComplete = (): boolean => {
    if (hasItems || isDirectCheckout) {
      if (!address.fullName.trim()) return false;
      if (!address.line1.trim()) return false;
      if (!address.city.trim()) return false;
      if (!address.state.trim()) return false;
      if (!/^\d{4,10}$/.test(address.pincode.trim())) return false;
    } else if (packageOnlyCheckout) {
      if (!pkg?.builderInput?.shippingAddress?.line1) return false;
    } else {
      if (!address.fullName.trim()) return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(contactEmail.trim())) return false;
    if (contactPhone.trim().length < 6) return false;
    return true;
  };

  function pollOrderUntilPaid(orderCode: string) {
    setPaymentStatus("confirming");
    let attempts = 0;
    pollTimer.current = setInterval(async () => {
      attempts += 1;
      try {
        const order = await shopApi.getMyOrder(orderCode);
        if (order.status === "PAID" || order.paymentStatus === "PAID") {
          if (pollTimer.current) clearInterval(pollTimer.current);
          setPaymentStatus("success");
          setTimeout(() => {
            setConfirmedOrderCode(orderCode);
            setConfirmedInvoiceUrl(order.invoicePdfUrl);
            setHadPackagesAtCheckout(packages.length > 0);
            setPaymentStatus("idle");
            setIsPlacingOrder(false);
            setPendingOrderCode(null);
            void clearCart().then(() => refreshCart());
            setCurrentStep(1);
          }, 2500);
        } else if (order.paymentStatus === "FAILED") {
          if (pollTimer.current) clearInterval(pollTimer.current);
          setPaymentStatus("failed");
          setIsPlacingOrder(false);
        } else if (attempts >= 20) {
          if (pollTimer.current) clearInterval(pollTimer.current);
          setPaymentStatus("pending");
          setIsPlacingOrder(false);
          setPendingOrderCode(orderCode);
          push("Payment is still confirming. You can refresh this page or check Order History.", "default");
        }
      } catch {
        // keep polling
      }
    }, 2000);
  }

  async function openShopRazorpay(order: CreateOrderResult) {
    const sdkReady = await loadRazorpayScript();
    if (!sdkReady) {
      push("Could not load the payment gateway. Please check your connection and try again.", "error");
      setIsPlacingOrder(false);
      return;
    }
    setPendingOrderCode(order.orderCode);
    if (!order.razorpayKeyId) {
      push("Payment is not configured. Please contact support.", "error");
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
      handler: async (response) => {
        setPaymentStatus("confirming");
        try {
          const verified = await shopApi.verifyShopPayment({
            orderCode: order.orderCode,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          if (verified.status === "PAID" || verified.paymentStatus === "PAID") {
            setPaymentStatus("success");
            setTimeout(() => {
              setConfirmedOrderCode(verified.orderCode);
              setConfirmedInvoiceUrl(verified.invoicePdfUrl);
              setPaymentStatus("idle");
              setIsPlacingOrder(false);
              setPendingOrderCode(null);
              setHadPackagesAtCheckout(packages.length > 0);
              void clearCart().then(() => refreshCart());
              setCurrentStep(1);
            }, 2500);
          } else {
            pollOrderUntilPaid(order.orderCode);
          }
        } catch {
          pollOrderUntilPaid(order.orderCode);
        }
      },
      modal: {
        ondismiss: () => {
          setIsPlacingOrder(false);
          setPaymentStatus("cancelled");
          void shopApi.markCheckoutCancelled(order.orderCode).catch(() => undefined);
        },
      },
    });
    if (!opened) {
      push("Could not open the payment gateway. Please try again.", "error");
      setIsPlacingOrder(false);
    }
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

    if (!hasItems && packages.length === 0 && !directCheckout) {
      push("Your cart is empty.", "error");
      return;
    }

    setIsPlacingOrder(true);
    try {
      let packageData: any = undefined;

      if (pkg && pkg.builderInput) {
        const builderGuestCount =
          parseInt(eventDetails.guestCount, 10) > 0
            ? parseInt(eventDetails.guestCount, 10)
            : Number(pkg.builderInput.guestCount) || 10;
        packageData = {
          eventDate: pkg.builderInput.eventDetails?.eventDate || eventDetails.eventDate,
          contactEmail: pkg.builderInput.contactEmail || contactEmail.trim(),
          contactPhone: pkg.builderInput.contactPhone || contactPhone.trim(),
          shippingAddress: pkg.builderInput.shippingAddress || {
            fullName: address.fullName.trim() || eventDetails.childName.trim() || "Celebration guest",
            line1: eventDetails.venue.trim() || "Venue to be confirmed",
            city: eventDetails.venue.toLowerCase().includes("jaipur") ? "Jaipur" : "Outside Jaipur",
            state: "Rajasthan",
            pincode: "000000",
            country: "India",
          },
          eventDetails: {
            childName: eventDetails.childName || pkg.builderInput.eventDetails?.childName,
            childAge: eventDetails.childAge,
            venue: eventDetails.venue || pkg.builderInput.eventDetails?.venue,
            guestCount: eventDetails.guestCount || pkg.builderInput.guestCount,
            notes: eventDetails.notes,
          },
          builder: {
            ...pkg.builderInput,
            guestCount: builderGuestCount,
            location: pkg.builderInput.location || (eventDetails.venue.toLowerCase().includes("jaipur") ? "jaipur" : "outside"),
          },
        };
      }

      // Package-only checkout has no address form of its own — fall back to
      // the address already collected in the package builder.
      const effectiveShippingAddress =
        hasItems || isDirectCheckout || !packageOnlyCheckout
          ? address
          : packageData?.shippingAddress ?? address;

      if (directCheckout) {
        const order = await shopApi.createDirectShopOrder({
          productId: directCheckout.productId,
          quantity: directCheckout.quantity,
          shippingAddress: address,
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim(),
          personalizationValues: directCheckout.personalizationSelected ? directCheckout.personalizationValues : undefined,
          personalizationSelected: directCheckout.personalizationSelected,
          packageData,
        });
        CacheStore.removeSessionItem(DIRECT_CHECKOUT_KEY);
        setDirectCheckout(null);
        await openShopRazorpay(order);
        return;
      }

      const order = await shopApi.createShopOrder({
        shippingAddress: effectiveShippingAddress,
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        packageData,
      });
      await openShopRazorpay(order);
    } catch (err) {
      push(err instanceof ApiClientError ? err.message : "Could not place your order. Please try again.", "error");
      setIsPlacingOrder(false);
    }
  };

  const inputClass = "w-full px-4 py-3.5 rounded-xl border border-border-light bg-cream-dark/50 text-charcoal text-sm placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-mocha/40 focus:border-mocha focus:bg-surface transition-all";
  const labelClass = "text-[11px] font-bold text-charcoal/70 uppercase tracking-wider mb-2 block";
  const errClass = "text-red-500 text-[11px] mt-1.5 font-medium";

  return (
    <>
      {paymentStatus === "success" && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center animate-fade-in">
          <div className="w-32 h-32 rounded-full bg-sage/20 flex items-center justify-center animate-bounce-slow mb-6">
            <Check size={64} strokeWidth={3} className="text-sage-dark animate-scale-in" />
          </div>
          <h2 className="font-display text-3xl font-bold text-charcoal animate-slide-up">Payment Successful!</h2>
          <p className="text-text-muted mt-2 animate-slide-up" style={{ animationDelay: "200ms" }}>Preparing your order...</p>
        </div>
      )}

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

              {items.length === 0 && packages.length === 0 && !directCheckout ? (
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
                    <div className="bg-surface rounded-3xl border border-border-light p-6 md:p-8 shadow-sm">
                      <div className="flex items-center justify-between mb-6 pb-5 border-b border-border-light">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-blush flex items-center justify-center text-mocha shadow-inner">
                            <ShoppingCart size={22} />
                          </div>
                          <div>
                            <h3 className="font-display text-xl font-bold text-charcoal">Cart Items</h3>
                            <p className="text-sm text-text-muted mt-1">Review your selections</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-mocha bg-mocha/5 px-3 py-1 rounded-full">{itemCount} items</span>
                      </div>
                      <div className="space-y-5">
                        {directCheckout && (
                          <div className="flex gap-4 p-4 rounded-2xl border border-border-light bg-cream/40">
                            <div className="flex-1">
                              <p className="text-xs font-bold uppercase tracking-wider text-mocha mb-1">Buy Now</p>
                              <h4 className="font-semibold text-charcoal">{directCheckout.title}</h4>
                              <p className="text-sm text-text-muted mt-1">Qty: {directCheckout.quantity}</p>
                              {directCheckout.personalizationSelected && (
                                <p className="text-xs text-mocha font-semibold mt-1">✨ Personalization included — our team will contact you for details</p>
                              )}
                            </div>
                            <div className="text-right font-bold text-charcoal">
                              {formatPaise((directCheckout.unitPriceInPaise + (directCheckout.personalizationSelected ? directCheckout.personalizationCostInPaise : 0)) * directCheckout.quantity)}
                            </div>
                          </div>
                        )}
                        {/* Packages */}
                        {packages.map((pkg) => {
                          const pkgData = packagesBySlug[pkg.packageId];
                          const themeData = themesBySlug[pkg.themeSlug];
                          if (!pkgData) return null;
                          return (
                            <div key={pkg.id} className="flex gap-4 p-4 md:p-5 bg-gradient-to-br from-cream-dark to-surface rounded-2xl border border-mocha/20 shadow-sm relative overflow-hidden group">
                              <div className="absolute top-0 right-0 w-24 h-24 bg-mocha/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
                              <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-xl bg-mocha/10 flex items-center justify-center shrink-0 shadow-inner">
                                <Package size={36} className="text-mocha" />
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <h4 className="font-bold text-charcoal text-base">{pkgData.title} Package</h4>
                                {themeData && <p className="text-[11px] font-bold text-mocha/80 mt-1 uppercase tracking-wider">{themeData.title} Theme</p>}
                                <div className="flex items-center justify-between mt-4">
                                  <span className="font-display font-bold text-charcoal text-lg">₹{pkg.basePrice.toLocaleString("en-IN")}</span>
                                  <button onClick={() => removePackage(pkg.id)} className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={14} /></button>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Essential Items */}
                        {items.map((item) => (
                          <div key={item.id} className="flex items-start gap-4 p-4 rounded-2xl border border-border-light bg-surface hover:border-mocha/30 transition-colors">
                            <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-cream-dark">
                              <Image src={item.image?.url ?? "/placeholder-product.svg"} alt={item.title} fill className="object-cover" sizes="80px" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-charcoal text-sm line-clamp-1">{item.title}</h4>
                              {Array.isArray(item.personalizationValues) && item.personalizationValues.length > 0 && (
                                <p className="text-[11px] text-mocha font-medium mt-1">
                                  {(item.personalizationValues as Array<{ label?: unknown; value?: unknown }>).map((pv) => {
                                    const label = typeof pv.label === "string" ? pv.label : "Personalization";
                                    const value = typeof pv.value === "string" ? pv.value : "";
                                    return value ? `${label}: ${value}` : label;
                                  }).join(", ")}
                                </p>
                              )}
                              <div className="flex items-center justify-between mt-3">
                                <div className="flex items-center gap-1 bg-cream-dark rounded-lg border border-border-light h-9">
                                  <button onClick={() => void updateQuantity(item.id, item.quantity - 1)} className="w-9 h-full flex items-center justify-center text-charcoal hover:text-mocha transition-colors"><Minus size={14} /></button>
                                  <QuantityInput item={item} updateQuantity={updateQuantity} />
                                  <button onClick={() => void updateQuantity(item.id, item.quantity + 1)} className="w-9 h-full flex items-center justify-center text-charcoal hover:text-mocha transition-colors" disabled={item.quantity >= item.stockAvailable || (item.maxOrderQuantity !== null && item.quantity >= item.maxOrderQuantity)}><Plus size={14} /></button>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-charcoal">{formatPaise((item.unitPriceInPaise + item.personalizationCostInPaise) * item.quantity)}</span>
                                  <button onClick={() => void removeItem(item.id)} className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={14} /></button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>



                    {/* Shipping Address Form */}
                    {(hasItems || packages.length === 0) && (
                    <ScrollReveal>
                      <div className="bg-surface rounded-3xl border border-border-light p-6 md:p-8 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blush/20 rounded-bl-full -z-10" />
                        <div className="flex items-center justify-between mb-8 pb-5 border-b border-border-light">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blush flex items-center justify-center text-mocha shadow-inner">
                              <Truck size={22} />
                            </div>
                            <div>
                              <h3 className="font-display text-xl font-bold text-charcoal">{registryCheckout ? "Gift recipient" : "Shipping Details"}</h3>
                              <p className="text-sm text-text-muted mt-1">
                                {registryCheckout
                                  ? `This order will be delivered to the registry owner (${registryCheckout.recipientName}).`
                                  : "Where should we deliver?"}
                              </p>
                            </div>
                          </div>
                          {isAuthenticated && (
                            <span className="text-[10px] bg-sage/20 text-sage-dark px-3 py-1.5 rounded-full font-bold uppercase tracking-wider whitespace-nowrap hidden sm:block">Profile loaded</span>
                          )}
                        </div>
                        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
                          <div className="sm:col-span-2">
                            <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
                            <input className={inputClass} value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} placeholder="Recipient's full name" readOnly={Boolean(registryCheckout)} />
                            {formErrors.fullName && <p className={errClass}>{formErrors.fullName}</p>}
                          </div>
                          <div className="sm:col-span-2">
                            <label className={labelClass}>Address Line 1 <span className="text-red-500">*</span></label>
                            <input className={inputClass} value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} placeholder="House no., street" readOnly={Boolean(registryCheckout)} />
                            {formErrors.line1 && <p className={errClass}>{formErrors.line1}</p>}
                          </div>
                          <div className="sm:col-span-2">
                            <label className={labelClass}>Address Line 2 (optional)</label>
                            <input className={inputClass} value={address.line2 ?? ""} onChange={(e) => setAddress({ ...address, line2: e.target.value })} placeholder="Landmark, apartment, etc." readOnly={Boolean(registryCheckout)} />
                          </div>
                          <div>
                            <label className={labelClass}>City <span className="text-red-500">*</span></label>
                            <input className={inputClass} value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} readOnly={Boolean(registryCheckout)} />
                            {formErrors.city && <p className={errClass}>{formErrors.city}</p>}
                          </div>
                          <div>
                            <label className={labelClass}>State <span className="text-red-500">*</span></label>
                            <input className={inputClass} value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} readOnly={Boolean(registryCheckout)} />
                            {formErrors.state && <p className={errClass}>{formErrors.state}</p>}
                          </div>
                          <div>
                            <label className={labelClass}>PIN Code <span className="text-red-500">*</span></label>
                            <input className={inputClass} value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value })} readOnly={Boolean(registryCheckout)} />
                            {formErrors.pincode && <p className={errClass}>{formErrors.pincode}</p>}
                          </div>
                          <div>
                            <label className={labelClass}>Country <span className="text-red-500">*</span></label>
                            <input className={inputClass} value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })} readOnly={Boolean(registryCheckout)} />
                          </div>
                          <div>
                            <label className={labelClass}>Contact Email <span className="text-red-500">*</span></label>
                            <input type="email" className={inputClass} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                            {formErrors.contactEmail && <p className={errClass}>{formErrors.contactEmail}</p>}
                          </div>
                          <div>
                            <label className={labelClass}>Contact Phone <span className="text-red-500">*</span></label>
                            <input type="tel" className={inputClass} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                            {formErrors.contactPhone && <p className={errClass}>{formErrors.contactPhone}</p>}
                          </div>
                        </div>
                      </div>
                    </ScrollReveal>
                    )}
                  </div>

                  {/* Payment Summary */}
                  <div className="bg-surface rounded-3xl border border-border-light p-6 md:p-8 shadow-sm h-fit lg:sticky lg:top-32 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-mocha/5 rounded-bl-full -z-10" />
                    {paymentStatus === "cancelled" && (
                      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        Payment was cancelled. Your cart is still here — you can try again. You were not charged.
                      </div>
                    )}
                    {paymentStatus === "failed" && (
                      <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        Payment failed. You were not charged. Retry when you&apos;re ready — your cart is unchanged.
                      </div>
                    )}
                    {paymentStatus === "pending" && pendingOrderCode && (
                      <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                        Payment is still confirming for {pendingOrderCode}. Refresh order history in a moment, or retry if you were not charged.
                      </div>
                    )}
                    <h3 className="font-display text-xl font-bold text-charcoal mb-6">Order Summary</h3>
                    <div className="space-y-4 text-sm">
                      <div className="flex justify-between items-center text-text-muted">
                        <span className="font-medium">Subtotal</span>
                        <span className="font-bold text-charcoal">{formatPaise(displayQuote.subtotalInPaise)}</span>
                      </div>
                      {(hasItems || packages.length > 0) && (
                        <FreeDeliveryProgress
                          subtotalInPaise={displayQuote.subtotalInPaise}
                          freeShippingThresholdInPaise={displayQuote.freeShippingThresholdInPaise}
                          shippingFeeInPaise={displayQuote.shippingWaived ? 0 : displayQuote.shippingInPaise || 19_900}
                          shippingWaived={displayQuote.shippingWaived}
                          className="my-2"
                        />
                      )}
                      <div className="flex justify-between items-center text-text-muted">
                        <span className="font-medium">Shipping</span>
                        {displayQuote.shippingWaived ? (
                          <span className="font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded text-[11px] uppercase tracking-wider">FREE</span>
                        ) : (
                          <span className="font-bold text-charcoal">{formatPaise(displayQuote.shippingInPaise)}</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-text-muted">
                        <span className="font-medium">GST ({displayQuote.gstPercent}%)</span>
                        <span className="font-bold text-charcoal">{formatPaise(displayQuote.gstInPaise)}</span>
                      </div>
                      {packages.length > 0 && hasItems && (
                        <div className="flex justify-between items-center text-text-muted">
                          <span className="font-medium">Event Packages</span>
                          <span className="font-bold text-charcoal">₹{packagesSubtotalRupees.toLocaleString("en-IN")}</span>
                        </div>
                      )}
                      <hr className="border-border-light my-6" />
                      <div className="flex justify-between items-end">
                        <span className="text-base font-bold text-charcoal">Total</span>
                        <span className="font-display text-2xl font-bold text-mocha">₹{Math.round(combinedTotalRupees).toLocaleString("en-IN")}</span>
                      </div>
                    </div>

                    {!isAuthenticated ? (
                      <div className="mt-8 space-y-4">
                        <button onClick={() => openAuthModal()} className="btn-primary w-full py-4 text-sm font-bold uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all">
                          Login to Checkout
                        </button>
                        <p className="text-[11px] text-text-muted text-center font-medium uppercase tracking-wider">You must be logged in to place an order</p>
                      </div>
                    ) : (
                      <button
                        onClick={handlePlaceOrder}
                        disabled={isPlacingOrder || paymentStatus === "confirming" || !isFormComplete()}
                        className="btn-primary w-full py-4 text-sm font-bold uppercase tracking-wider gap-2 mt-8 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60"
                      >
                        {isPlacingOrder || paymentStatus === "confirming" ? (
                          <><Loader2 size={18} className="animate-spin" /> {paymentStatus === "confirming" ? "Confirming payment…" : "Processing…"}</>
                        ) : paymentStatus === "cancelled" || paymentStatus === "failed" ? (
                          <>Retry Payment <ArrowRight size={18} /></>
                        ) : (
                          <>Pay Securely <ArrowRight size={18} /></>
                        )}
                      </button>
                    )}

                    <p className="text-[10px] text-text-light text-center mt-4 uppercase tracking-wider font-medium">
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
                  {paymentStatus === "pending"
                    ? "Payment is being confirmed"
                    : hadPackagesAtCheckout
                      ? "Celebration booking received"
                      : "Payment successful"}
                </h1>
                <p className="text-text-muted mb-2">
                  {paymentStatus === "pending"
                    ? "We have not marked this as paid yet. You’ll get an email once the bank confirms."
                    : "Thank you for choosing Vaibhav Celebrations"}
                </p>
                {confirmedOrderCode && (
                  <p className="text-lg font-bold text-mocha font-mono mb-4">{confirmedOrderCode}</p>
                )}
                {confirmedInvoiceUrl && paymentStatus !== "pending" && (
                  <a href={confirmedInvoiceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-mocha font-semibold text-sm mb-4">
                    Download invoice
                  </a>
                )}
                {hadPackagesAtCheckout && paymentStatus !== "pending" && (
                  <p className="text-sm text-text-muted max-w-md mx-auto mb-6 bg-cream/60 rounded-xl px-4 py-3 border border-border-light">
                    If your package includes personalization, our team will contact you to confirm details before production.
                  </p>
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
