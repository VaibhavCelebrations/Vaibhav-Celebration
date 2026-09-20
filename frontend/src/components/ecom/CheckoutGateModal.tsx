"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, LogIn, UserPlus, ShoppingBag, X } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import {
  friendlyAuthError,
  requestGuestCheckoutOtp,
  verifyGuestCheckoutOtp,
} from "@/lib/customer-auth-api";
import { ApiClientError } from "@/lib/api-client";

type GateStep = "choice" | "guest-details" | "guest-otp";

type ShippingDraft = {
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

const EMPTY_ADDRESS: ShippingDraft = {
  fullName: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
};

export const GUEST_CHECKOUT_PREFILL_KEY = "vc_guest_checkout_prefill";

type PrefillPayload = {
  contactEmail: string;
  contactPhone: string;
  shippingAddress: ShippingDraft;
};

type CheckoutGateModalProps = {
  open: boolean;
  onClose: () => void;
  /** Called after guest OTP verify (session set) or after login/signup success. */
  onContinue: () => void;
  /** When true, guest path requires a full shipping address (shop cart / buy-now). */
  requireShippingAddress?: boolean;
};

export function CheckoutGateModal({
  open,
  onClose,
  onContinue,
  requireShippingAddress = true,
}: CheckoutGateModalProps) {
  const { openAuthModal, applyAuthenticatedUser } = useAuth();
  const [step, setStep] = useState<GateStep>("choice");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState<ShippingDraft>(EMPTY_ADDRESS);
  const [otp, setOtp] = useState("");
  const [agreedPolicies, setAgreedPolicies] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep("choice");
    setFormError("");
    setErrors({});
    setOtp("");
    setDevOtpHint(null);
    setIsSubmitting(false);
  }, [open]);

  if (!open) return null;

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-border-light bg-surface text-charcoal text-sm placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-mocha/30 focus:border-mocha transition-all";
  const errorClass = "text-red-500 text-xs mt-1";
  const labelClass = "text-[11px] font-bold text-charcoal/70 uppercase tracking-wider mb-1.5 block";

  const validateDetails = (): boolean => {
    const next: Record<string, string> = {};
    if (!address.fullName.trim()) next.fullName = "Full name is required";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Enter a valid email";
    if (phone.trim().length < 6) next.phone = "Enter a valid phone number";
    if (requireShippingAddress) {
      if (!address.line1.trim()) next.line1 = "Address is required";
      if (!address.city.trim()) next.city = "City is required";
      if (!address.state.trim()) next.state = "State is required";
      if (!/^\d{4,10}$/.test(address.pincode.trim())) next.pincode = "Enter a valid PIN code";
    }
    if (!agreedPolicies) next.policies = "You must agree to the policies to continue";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSendOtp = async () => {
    setFormError("");
    if (!validateDetails()) return;
    setIsSubmitting(true);
    try {
      const result = await requestGuestCheckoutOtp(email.trim());
      if (result.devOtp) setDevOtpHint(result.devOtp);
      setStep("guest-otp");
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "EMAIL_EXISTS") {
        setFormError("An account with this email already exists. Please log in instead.");
      } else {
        setFormError(friendlyAuthError(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    setFormError("");
    if (!/^\d{6}$/.test(otp.trim())) {
      setErrors({ otp: "Enter the 6-digit code from your email" });
      return;
    }
    setIsSubmitting(true);
    try {
      const shippingAddress = {
        fullName: address.fullName.trim(),
        line1: address.line1.trim() || "To be confirmed",
        line2: address.line2.trim() || undefined,
        city: address.city.trim() || "Jaipur",
        state: address.state.trim() || "Rajasthan",
        pincode: address.pincode.trim() || "000000",
        country: address.country.trim() || "India",
      };

      const user = await verifyGuestCheckoutOtp({
        email: email.trim(),
        otp: otp.trim(),
        name: address.fullName.trim(),
        phone: phone.trim(),
        defaultAddress: requireShippingAddress ? shippingAddress : undefined,
      });

      const prefill: PrefillPayload = {
        contactEmail: email.trim(),
        contactPhone: phone.trim(),
        shippingAddress: {
          fullName: shippingAddress.fullName,
          line1: shippingAddress.line1,
          line2: shippingAddress.line2 ?? "",
          city: shippingAddress.city,
          state: shippingAddress.state,
          pincode: shippingAddress.pincode,
          country: shippingAddress.country,
        },
      };
      try {
        sessionStorage.setItem(GUEST_CHECKOUT_PREFILL_KEY, JSON.stringify(prefill));
      } catch {
        // ignore
      }

      applyAuthenticatedUser(user, onContinue);
      onClose();
    } catch (err) {
      setFormError(friendlyAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const goLogin = () => {
    onClose();
    openAuthModal(onContinue, { tab: "login" });
  };

  const goSignup = () => {
    onClose();
    openAuthModal(onContinue, { tab: "signup" });
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-charcoal/60 backdrop-blur-sm p-4"
      onMouseDown={onClose}
    >
      <div
        className="relative w-full max-w-md bg-surface rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-cream hover:bg-blush flex items-center justify-center text-charcoal z-10 transition-colors cursor-pointer"
          type="button"
        >
          <X size={16} />
        </button>

        <div className="px-8 pt-8 pb-4 shrink-0">
          <h2 className="font-display text-2xl font-bold text-charcoal">
            {step === "choice" && "Continue to Checkout"}
            {step === "guest-details" && "Guest Checkout"}
            {step === "guest-otp" && "Verify Your Email"}
          </h2>
          <p className="text-text-muted text-sm mt-1">
            {step === "choice" && "Choose how you'd like to complete your purchase"}
            {step === "guest-details" && "We'll create an account for you after email verification"}
            {step === "guest-otp" && `Enter the 6-digit code sent to ${email}`}
          </p>
        </div>

        <div className="px-8 pb-8 overflow-y-auto">
          {formError && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {formError}
              {formError.includes("already exists") && (
                <button type="button" onClick={goLogin} className="ml-1 underline font-bold">
                  Log in
                </button>
              )}
            </div>
          )}

          {step === "choice" && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setStep("guest-details")}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border-light hover:border-mocha/40 hover:bg-cream/40 transition-all text-left cursor-pointer"
              >
                <div className="w-11 h-11 rounded-xl bg-mocha/10 text-mocha flex items-center justify-center shrink-0">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <p className="font-bold text-charcoal text-sm">Guest Checkout</p>
                  <p className="text-xs text-text-muted mt-0.5">Verify email with OTP — no password needed now</p>
                </div>
              </button>
              <button
                type="button"
                onClick={goLogin}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border-light hover:border-mocha/40 hover:bg-cream/40 transition-all text-left cursor-pointer"
              >
                <div className="w-11 h-11 rounded-xl bg-blush text-mocha flex items-center justify-center shrink-0">
                  <LogIn size={20} />
                </div>
                <div>
                  <p className="font-bold text-charcoal text-sm">Log In</p>
                  <p className="text-xs text-text-muted mt-0.5">Already have an account? Faster checkout</p>
                </div>
              </button>
              <button
                type="button"
                onClick={goSignup}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border-light hover:border-mocha/40 hover:bg-cream/40 transition-all text-left cursor-pointer"
              >
                <div className="w-11 h-11 rounded-xl bg-sage/20 text-sage-dark flex items-center justify-center shrink-0">
                  <UserPlus size={20} />
                </div>
                <div>
                  <p className="font-bold text-charcoal text-sm">Sign Up</p>
                  <p className="text-xs text-text-muted mt-0.5">Create an account with your own password</p>
                </div>
              </button>
            </div>
          )}

          {step === "guest-details" && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setStep("choice")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-mocha mb-1 cursor-pointer"
              >
                <ArrowLeft size={14} /> Back
              </button>

              <div>
                <label className={labelClass}>Full Name *</label>
                <input
                  className={inputClass}
                  value={address.fullName}
                  onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                  placeholder="Your full name"
                  disabled={isSubmitting}
                />
                {errors.fullName && <p className={errorClass}>{errors.fullName}</p>}
              </div>
              <div>
                <label className={labelClass}>Email *</label>
                <input
                  type="email"
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={isSubmitting}
                />
                {errors.email && <p className={errorClass}>{errors.email}</p>}
              </div>
              <div>
                <label className={labelClass}>Phone *</label>
                <input
                  type="tel"
                  className={inputClass}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 12))}
                  placeholder="10-digit mobile number"
                  disabled={isSubmitting}
                />
                {errors.phone && <p className={errorClass}>{errors.phone}</p>}
              </div>

              {requireShippingAddress && (
                <>
                  <div>
                    <label className={labelClass}>Address Line 1 *</label>
                    <input
                      className={inputClass}
                      value={address.line1}
                      onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                      placeholder="House no., street"
                      disabled={isSubmitting}
                    />
                    {errors.line1 && <p className={errorClass}>{errors.line1}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Address Line 2</label>
                    <input
                      className={inputClass}
                      value={address.line2}
                      onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                      placeholder="Landmark (optional)"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>City *</label>
                      <input
                        className={inputClass}
                        value={address.city}
                        onChange={(e) => setAddress({ ...address, city: e.target.value })}
                        disabled={isSubmitting}
                      />
                      {errors.city && <p className={errorClass}>{errors.city}</p>}
                    </div>
                    <div>
                      <label className={labelClass}>State *</label>
                      <input
                        className={inputClass}
                        value={address.state}
                        onChange={(e) => setAddress({ ...address, state: e.target.value })}
                        disabled={isSubmitting}
                      />
                      {errors.state && <p className={errorClass}>{errors.state}</p>}
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>PIN Code *</label>
                    <input
                      className={inputClass}
                      value={address.pincode}
                      onChange={(e) => setAddress({ ...address, pincode: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                      disabled={isSubmitting}
                    />
                    {errors.pincode && <p className={errorClass}>{errors.pincode}</p>}
                  </div>
                </>
              )}

              <label className="flex items-start gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={agreedPolicies}
                  onChange={(e) => setAgreedPolicies(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-border-light text-mocha focus:ring-mocha shrink-0"
                />
                <span className="text-[11px] text-text-muted leading-relaxed">
                  I agree to the{" "}
                  <a href="/legal/terms-of-service" target="_blank" className="text-mocha underline">
                    Terms
                  </a>
                  ,{" "}
                  <a href="/legal/privacy-policy" target="_blank" className="text-mocha underline">
                    Privacy Policy
                  </a>
                  ,{" "}
                  <a href="/legal/refund-policy" target="_blank" className="text-mocha underline">
                    Refund Policy
                  </a>
                  , and{" "}
                  <a href="/legal/cancellation-policy" target="_blank" className="text-mocha underline">
                    Shipping Policy
                  </a>
                  . <span className="text-red-500">*</span>
                </span>
              </label>
              {errors.policies && <p className={errorClass}>{errors.policies}</p>}

              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isSubmitting}
                className="btn-primary w-full py-4 text-sm font-bold uppercase tracking-wider gap-2 mt-2 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    Send Verification Code <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          )}

          {step === "guest-otp" && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setStep("guest-details")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-mocha cursor-pointer"
              >
                <ArrowLeft size={14} /> Edit details
              </button>

              {devOtpHint && (
                <p className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">
                  Dev OTP: <strong className="font-mono">{devOtpHint}</strong>
                </p>
              )}

              <div>
                <label className={labelClass}>Verification Code *</label>
                <input
                  className={`${inputClass} text-center text-2xl tracking-[0.4em] font-mono`}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  disabled={isSubmitting}
                />
                {errors.otp && <p className={errorClass}>{errors.otp}</p>}
              </div>

              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={isSubmitting || otp.length !== 6}
                className="btn-primary w-full py-4 text-sm font-bold uppercase tracking-wider gap-2 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    Verify & Continue <ArrowRight size={16} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isSubmitting}
                className="w-full text-center text-xs font-semibold text-mocha hover:underline cursor-pointer disabled:opacity-50"
              >
                Resend code
              </button>

              <p className="text-[11px] text-text-muted text-center leading-relaxed">
                After verification we&apos;ll email your account password. Order confirmation is sent after payment.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
