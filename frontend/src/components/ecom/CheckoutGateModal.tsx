"use client";

import { useEffect, useState, useRef } from "react";
import { ArrowLeft, ArrowRight, Loader2, Mail, Lock, Eye, EyeOff, CheckCircle2, X } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import {
  friendlyAuthError,
  requestGuestCheckoutOtp,
  verifyGuestCheckoutOtp,
  requestPasswordReset,
} from "@/lib/customer-auth-api";
import { ApiClientError } from "@/lib/api-client";
import type { ShippingAddress } from "@/lib/shop-types";

export const GUEST_CHECKOUT_PREFILL_KEY = "vc_guest_checkout_prefill";

type GateMode = "otp" | "login" | "change-email";

export type CheckoutGateModalProps = {
  open: boolean;
  onClose: () => void;
  initialMode?: "otp" | "login";
  email: string;
  name?: string;
  phone?: string;
  shippingAddress?: ShippingAddress;
  devOtp?: string | null;
  infoMessage?: string | null;
  onSuccess: () => void;
  onEmailChanged?: (newEmail: string) => void;
};

export function CheckoutGateModal({
  open,
  onClose,
  initialMode = "otp",
  email,
  name,
  phone,
  shippingAddress,
  devOtp: initialDevOtp = null,
  infoMessage: initialInfoMessage = null,
  onSuccess,
  onEmailChanged,
}: CheckoutGateModalProps) {
  const { applyAuthenticatedUser, login } = useAuth();

  const [mode, setMode] = useState<GateMode>(initialMode);
  const [currentEmail, setCurrentEmail] = useState(email);
  const [emailInput, setEmailInput] = useState(email);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [infoMessage, setInfoMessage] = useState<string | null>(initialInfoMessage);
  const [resetSuccessMessage, setResetSuccessMessage] = useState("");
  const [devOtpHint, setDevOtpHint] = useState<string | null>(initialDevOtp);

  // Cooldown countdown timer for OTP resend (60 seconds)
  const [resendCooldown, setResendCooldown] = useState(60);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = () => {
    setResendCooldown(60);
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    cooldownTimerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (!open) {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
      return;
    }
    setMode(initialMode);
    setCurrentEmail(email);
    setEmailInput(email);
    setOtp("");
    setPassword("");
    setShowPassword(false);
    setFormError("");
    setResetSuccessMessage("");
    setDevOtpHint(initialDevOtp ?? null);
    setInfoMessage(initialInfoMessage ?? null);
    setIsSubmitting(false);

    if (initialMode === "otp") {
      startCooldown();
    }
  }, [open, initialMode, email, initialDevOtp, initialInfoMessage]);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);

  if (!open) return null;

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-border-light bg-surface text-charcoal text-sm placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-mocha/30 focus:border-mocha transition-all";
  const labelClass = "text-[11px] font-bold text-charcoal/70 uppercase tracking-wider mb-1.5 block";

  // --- Handlers ---

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError("");
    if (!/^\d{6}$/.test(otp.trim())) {
      setFormError("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await verifyGuestCheckoutOtp({
        email: currentEmail.trim(),
        otp: otp.trim(),
        name: (name || "Guest").trim(),
        phone: (phone || "").trim(),
        defaultAddress: shippingAddress,
      });

      applyAuthenticatedUser(user);
      onSuccess();
      onClose();
    } catch (err) {
      setFormError(friendlyAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isSubmitting) return;
    setFormError("");
    setInfoMessage(null);
    setIsSubmitting(true);
    try {
      const result = await requestGuestCheckoutOtp(currentEmail.trim());
      if (result.devOtp) setDevOtpHint(result.devOtp);
      setInfoMessage("A new verification code has been sent to your email.");
      startCooldown();
    } catch (err) {
      setFormError(friendlyAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError("");
    if (!password.trim()) {
      setFormError("Please enter your password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(currentEmail.trim(), password);
      onSuccess();
      onClose();
    } catch (err) {
      setFormError(friendlyAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setFormError("");
    setResetSuccessMessage("");
    setIsSubmitting(true);
    try {
      await requestPasswordReset(currentEmail.trim());
      setResetSuccessMessage(`If an account exists, a password reset link has been sent to ${currentEmail}.`);
    } catch (err) {
      setFormError(friendlyAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeEmailSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError("");
    const newEmail = emailInput.trim();
    if (!/^\S+@\S+\.\S+$/.test(newEmail)) {
      setFormError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await requestGuestCheckoutOtp(newEmail);
      // New user!
      setCurrentEmail(newEmail);
      if (result.devOtp) setDevOtpHint(result.devOtp);
      onEmailChanged?.(newEmail);
      setMode("otp");
      startCooldown();
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "EMAIL_EXISTS") {
        // Existing user!
        setCurrentEmail(newEmail);
        onEmailChanged?.(newEmail);
        setMode("login");
      } else if (err instanceof ApiClientError && err.code === "GUEST_OTP_COOLDOWN") {
        setCurrentEmail(newEmail);
        onEmailChanged?.(newEmail);
        setMode("otp");
        setInfoMessage("A verification code was recently sent to this email.");
        startCooldown();
      } else {
        setFormError(friendlyAuthError(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-charcoal/60 backdrop-blur-sm p-4"
      onMouseDown={onClose}
    >
      <div
        className="relative w-full max-w-md bg-surface rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-cream hover:bg-blush flex items-center justify-center text-charcoal z-10 transition-colors cursor-pointer"
          type="button"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="px-8 pt-8 pb-4 shrink-0 text-center">
          <div className="w-14 h-14 rounded-2xl bg-mocha/10 text-mocha flex items-center justify-center mx-auto mb-4 shadow-inner">
            {mode === "otp" && <Mail size={24} />}
            {mode === "login" && <Lock size={24} />}
            {mode === "change-email" && <Mail size={24} />}
          </div>

          <h2 className="font-display text-2xl font-bold text-charcoal">
            {mode === "otp" && "Verify Your Email"}
            {mode === "login" && "Welcome Back"}
            {mode === "change-email" && "Change Email Address"}
          </h2>

          <p className="text-text-muted text-xs md:text-sm mt-1.5 leading-relaxed px-2">
            {mode === "otp" && (
              <>
                We&apos;ve sent a 6-digit code to <strong className="text-charcoal font-semibold">{currentEmail}</strong>
              </>
            )}
            {mode === "login" && (
              <>
                An account with <strong className="text-charcoal font-semibold">{currentEmail}</strong> exists. Enter your password to proceed.
              </>
            )}
            {mode === "change-email" && "Enter the email you would like to use for this purchase."}
          </p>
        </div>

        <div className="px-8 pb-8 overflow-y-auto">
          {formError && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {formError}
            </div>
          )}

          {infoMessage && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium">
              {infoMessage}
            </div>
          )}

          {resetSuccessMessage && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-600 shrink-0" />
              <span>{resetSuccessMessage}</span>
            </div>
          )}

          {/* ═════════ OTP MODE ═════════ */}
          {mode === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              {devOtpHint && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-center">
                  Dev OTP: <strong className="font-mono text-sm tracking-widest">{devOtpHint}</strong>
                </div>
              )}

              <div>
                <label className={labelClass}>Verification Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  autoFocus
                  className={`${inputClass} text-center text-2xl tracking-[0.4em] font-mono py-3 font-bold`}
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  disabled={isSubmitting}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || otp.length !== 6}
                className="btn-primary w-full py-3.5 text-sm font-bold uppercase tracking-wider gap-2 rounded-xl shadow-md disabled:opacity-60 flex items-center justify-center cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Pay Securely</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isSubmitting}
                  className="font-semibold text-mocha hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormError("");
                    setMode("change-email");
                  }}
                  className="text-text-muted hover:text-charcoal font-medium cursor-pointer"
                >
                  Change email
                </button>
              </div>

              <div className="text-center pt-1 border-t border-border-light/60 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setFormError("");
                    setMode("login");
                  }}
                  className="text-xs text-mocha hover:underline font-semibold cursor-pointer"
                >
                  Already have a password? Log in instead
                </button>
              </div>
            </form>
          )}

          {/* ═════════ LOGIN MODE ═════════ */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelClass}>Email</label>
                  <button
                    type="button"
                    onClick={() => {
                      setFormError("");
                      setMode("change-email");
                    }}
                    className="text-[11px] font-semibold text-mocha hover:underline cursor-pointer"
                  >
                    Change
                  </button>
                </div>
                <div className="px-4 py-2.5 rounded-xl bg-cream-dark/50 border border-border-light text-charcoal text-sm font-medium">
                  {currentEmail}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelClass}>Password</label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isSubmitting}
                    className="text-[11px] font-semibold text-mocha hover:underline cursor-pointer disabled:opacity-50"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoFocus
                    className={`${inputClass} pr-11`}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-charcoal transition-colors p-1"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !password.trim()}
                className="btn-primary w-full py-3.5 text-sm font-bold uppercase tracking-wider gap-2 rounded-xl shadow-md disabled:opacity-60 flex items-center justify-center cursor-pointer mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Logging in...</span>
                  </>
                ) : (
                  <>
                    <span>Log In & Pay Securely</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="text-center pt-2 border-t border-border-light/60 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setFormError("");
                    setMode("change-email");
                  }}
                  className="text-xs text-text-muted hover:text-charcoal font-medium cursor-pointer"
                >
                  Want to use a different email address?
                </button>
              </div>
            </form>
          )}

          {/* ═════════ CHANGE EMAIL MODE ═════════ */}
          {mode === "change-email" && (
            <form onSubmit={handleChangeEmailSubmit} className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setFormError("");
                  setMode(initialMode);
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-mocha hover:underline mb-1 cursor-pointer"
              >
                <ArrowLeft size={14} /> Back
              </button>

              <div>
                <label className={labelClass}>Email Address</label>
                <input
                  type="email"
                  autoFocus
                  className={inputClass}
                  placeholder="you@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !emailInput.trim()}
                className="btn-primary w-full py-3.5 text-sm font-bold uppercase tracking-wider gap-2 rounded-xl shadow-md disabled:opacity-60 flex items-center justify-center cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Checking...</span>
                  </>
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
