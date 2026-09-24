"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MessageSquare, Mail, RefreshCw, AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import * as authApi from "@/lib/customer-auth-api";
import { friendlyAuthError } from "@/lib/customer-auth-api";
import type { User } from "@/lib/ecom-types";

interface OtpVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "phone" | "email";
  targetValue: string; // phone number or email address
  initialDevOtp?: string;
  onSuccess: (updatedUser: User) => void;
}

export function OtpVerificationModal({
  isOpen,
  onClose,
  type,
  targetValue,
  initialDevOtp,
  onSuccess,
}: OtpVerificationModalProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(60);
  const [devOtp, setDevOtp] = useState<string | undefined>(initialDevOtp);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setDigits(["", "", "", "", "", ""]);
      setError(null);
      setCooldown(60);
      setDevOtp(initialDevOtp);
      // Auto-focus first input after modal renders
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    }
  }, [isOpen, initialDevOtp]);

  // Cooldown countdown timer
  useEffect(() => {
    if (!isOpen || cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, cooldown]);

  const otpCode = digits.join("");

  const handleDigitChange = (index: number, value: string) => {
    // Take only numbers
    const cleanValue = value.replace(/\D/g, "");

    // Handle single character typed
    if (cleanValue.length <= 1) {
      const newDigits = [...digits];
      newDigits[index] = cleanValue;
      setDigits(newDigits);
      setError(null);

      // Move focus forward if a digit was entered
      if (cleanValue && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        // Move back and clear previous
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

    // Focus last filled index or next available
    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (otpCode.length !== 6) {
      setError("Please enter all 6 digits of the verification code");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      if (type === "phone") {
        const res = await authApi.verifyPhoneOtp(targetValue, otpCode);
        onSuccess(res.user);
        onClose();
      } else {
        const res = await authApi.verifyEmailOtp(otpCode);
        onSuccess(res.user);
        onClose();
      }
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;

    setIsResending(true);
    setError(null);

    try {
      let res: authApi.OtpRequestResponse;
      if (type === "phone") {
        res = await authApi.requestPhoneOtp(targetValue);
      } else {
        res = await authApi.requestEmailOtp();
      }

      setCooldown(60);
      if (res.devOtp) {
        setDevOtp(res.devOtp);
      }
      // Clear inputs for re-entry
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setIsResending(false);
    }
  };

  const isPhone = type === "phone";

  return (
    <Modal open={isOpen} onClose={onClose}>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div
            className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3 ${
              isPhone ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-mocha/10 text-mocha border border-mocha/20"
            }`}
          >
            {isPhone ? <MessageSquare size={26} /> : <Mail size={26} />}
          </div>
          <h2 className="font-display text-xl font-bold text-charcoal">
            {isPhone ? "Verify WhatsApp Number" : "Verify Email Address"}
          </h2>
          <p className="text-xs md:text-sm text-text-muted mt-1 max-w-sm mx-auto">
            {isPhone ? (
              <>
                Enter the 6-digit verification code sent to your WhatsApp at{" "}
                <span className="font-semibold text-charcoal">{targetValue}</span>
              </>
            ) : (
              <>
                Enter the 6-digit verification code sent to your inbox at{" "}
                <span className="font-semibold text-charcoal">{targetValue}</span>
              </>
            )}
          </p>
        </div>

        {/* Dev OTP Banner (when present in non-production) */}
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
        <form onSubmit={handleVerify} className="space-y-5">
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

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 animate-fadeIn">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <button
              type="submit"
              disabled={isVerifying || otpCode.length !== 6}
              className="w-full py-3 px-6 rounded-xl bg-mocha text-white text-sm font-semibold hover:bg-mocha-dark transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isVerifying ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Verifying Code…
                </>
              ) : (
                <>
                  <ShieldCheck size={16} /> Confirm & Verify
                </>
              )}
            </button>

            {/* Resend Cooldown */}
            <div className="text-center pt-1">
              {cooldown > 0 ? (
                <p className="text-xs text-text-muted">
                  Resend code in <span className="font-semibold text-charcoal">{cooldown}s</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-mocha hover:text-mocha-dark transition cursor-pointer disabled:opacity-50"
                >
                  {isResending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  Resend Verification Code
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}
