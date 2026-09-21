"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mail, RefreshCw, AlertCircle, ArrowLeft, ShieldCheck, ArrowRight } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import * as authApi from "@/lib/customer-auth-api";
import { friendlyAuthError } from "@/lib/customer-auth-api";
import type { User } from "@/lib/ecom-types";

interface ChangeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEmail: string;
  onSuccess: (updatedUser: User) => void;
}

export function ChangeEmailModal({
  isOpen,
  onClose,
  currentEmail,
  onSuccess,
}: ChangeEmailModalProps) {
  const [step, setStep] = useState<"enter-email" | "verify-otp">("enter-email");
  const [newEmail, setNewEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(60);
  const [devOtp, setDevOtp] = useState<string | undefined>(undefined);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setStep("enter-email");
      setNewEmail("");
      setDigits(["", "", "", "", "", ""]);
      setError(null);
      setCooldown(60);
      setDevOtp(undefined);
      setTimeout(() => {
        emailInputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  // Cooldown countdown timer
  useEffect(() => {
    if (!isOpen || step !== "verify-otp" || cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, step, cooldown]);

  const otpCode = digits.join("");

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) {
      setError("Please enter your new email address");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address");
      return;
    }
    if (trimmed === currentEmail.toLowerCase()) {
      setError("New email must be different from your current email");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await authApi.requestEmailChangeOtp(trimmed);
      if (res.devOtp) {
        setDevOtp(res.devOtp);
      }
      setCooldown(60);
      setDigits(["", "", "", "", "", ""]);
      setStep("verify-otp");
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    const cleanValue = value.replace(/\D/g, "");
    if (cleanValue.length <= 1) {
      const newDigits = [...digits];
      newDigits[index] = cleanValue;
      setDigits(newDigits);
      setError(null);

      if (cleanValue && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = "";
        setDigits(newDigits);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || "";
    }
    setDigits(newDigits);
    setError(null);

    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleVerifyAndUpdate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (otpCode.length !== 6) {
      setError("Please enter all 6 digits of the verification code");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await authApi.verifyEmailChangeOtp(newEmail.trim().toLowerCase(), otpCode);
      onSuccess(res.user);
      onClose();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await authApi.requestEmailChangeOtp(newEmail.trim().toLowerCase());
      setCooldown(60);
      if (res.devOtp) {
        setDevOtp(res.devOtp);
      }
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose}>
      <div className="space-y-6">
        {step === "enter-email" ? (
          <>
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-mocha/10 text-mocha border border-mocha/20 mx-auto flex items-center justify-center mb-3">
                <Mail size={26} />
              </div>
              <h2 className="font-display text-xl font-bold text-charcoal">Change Email Address</h2>
              <p className="text-xs md:text-sm text-text-muted mt-1 max-w-sm mx-auto">
                Enter your new email address. We will send a 6-digit verification code to confirm ownership before updating your account.
              </p>
            </div>

            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-charcoal mb-1 block">Current Email</label>
                <input
                  type="text"
                  value={currentEmail}
                  disabled
                  className="w-full px-4 py-3 rounded-xl border border-border-light bg-cream/40 text-text-muted text-sm cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-charcoal mb-1 block">New Email Address</label>
                <input
                  ref={emailInputRef}
                  type="email"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="name@example.com"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-border-light bg-surface text-charcoal text-sm placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-mocha/30 focus:border-mocha transition-all"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 animate-fadeIn">
                  <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !newEmail.trim()}
                  className="w-full py-3 px-6 rounded-xl bg-mocha text-white text-sm font-semibold hover:bg-mocha-dark transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Sending Code…
                    </>
                  ) : (
                    <>
                      Send Verification Code <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setStep("enter-email");
                  setError(null);
                }}
                className="inline-flex items-center gap-1 text-xs text-mocha hover:text-mocha-dark font-medium mb-3 cursor-pointer"
              >
                <ArrowLeft size={13} /> Change email address
              </button>
              <h2 className="font-display text-xl font-bold text-charcoal">Verify New Email</h2>
              <p className="text-xs md:text-sm text-text-muted mt-1 max-w-sm mx-auto">
                Enter the 6-digit verification code sent to{" "}
                <span className="font-semibold text-charcoal">{newEmail}</span>
              </p>
            </div>

            {/* Dev OTP Banner */}
            {devOtp && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
                <span className="font-medium">Dev OTP Code: <code className="font-mono font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">{devOtp}</code></span>
                <button
                  type="button"
                  onClick={() => {
                    const parts = devOtp.split("").slice(0, 6);
                    setDigits(parts);
                    setError(null);
                  }}
                  className="text-[11px] underline font-semibold text-amber-900 hover:text-amber-950 cursor-pointer"
                >
                  Fill Code
                </button>
              </div>
            )}

            {/* 6-Digit OTP Input Grid */}
            <form onSubmit={handleVerifyAndUpdate} className="space-y-5">
              <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className={`w-11 h-13 sm:w-12 sm:h-14 text-center font-mono text-xl sm:text-2xl font-bold rounded-xl border transition-all ${
                      error
                        ? "border-red-300 bg-red-50/50 text-red-700 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                        : digit
                        ? "border-mocha bg-mocha/5 text-charcoal focus:border-mocha focus:ring-2 focus:ring-mocha/20"
                        : "border-border-light bg-surface text-charcoal focus:border-mocha focus:ring-2 focus:ring-mocha/20"
                    }`}
                    autoComplete="one-time-code"
                  />
                ))}
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 animate-fadeIn">
                  <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || otpCode.length !== 6}
                  className="w-full py-3 px-6 rounded-xl bg-mocha text-white text-sm font-semibold hover:bg-mocha-dark transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Updating Email…
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} /> Confirm & Update Email
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  {cooldown > 0 ? (
                    <p className="text-xs text-text-muted">
                      Resend code in <span className="font-semibold text-charcoal">{cooldown}s</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-mocha hover:text-mocha-dark transition cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                      Resend Verification Code
                    </button>
                  )}
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </Modal>
  );
}
