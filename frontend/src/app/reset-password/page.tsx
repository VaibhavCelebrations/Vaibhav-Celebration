"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { FooterClient } from "@/components/layout/FooterClient";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { resetPassword, friendlyAuthError } from "@/lib/customer-auth-api";

const PASSWORD_HINT = "At least 8 characters, with an uppercase letter, a lowercase letter, and a number.";

function isStrongPassword(pw: string): boolean {
  return pw.length >= 8 && /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /[0-9]/.test(pw);
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-red-600 font-medium">
          This reset link is missing its token. Please request a new password reset link.
        </p>
        <Link href="/forgot-password" className="btn-primary inline-flex px-8 py-3 mt-6 text-sm">
          Request New Link
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStrongPassword(password)) {
      setError(PASSWORD_HINT);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push("/"), 2500);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="text-center py-4">
        <CheckCircle2 size={40} className="mx-auto text-green-600 mb-4" />
        <h3 className="font-display text-xl font-bold text-charcoal mb-2">Password Updated</h3>
        <p className="text-sm text-text-muted">Your password has been reset. Redirecting you to the home page…</p>
      </div>
    );
  }

  const inputClass = "w-full rounded-lg border border-border bg-cream pl-10 pr-10 py-3 text-sm text-text placeholder:text-text-light focus:outline-none focus:border-mocha focus:ring-1 focus:ring-mocha transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">{error}</div>
      )}
      <div>
        <label htmlFor="rp-password" className="block text-sm font-medium text-charcoal mb-1.5">New Password</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock size={16} className="text-mocha" /></div>
          <input
            id="rp-password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            autoComplete="new-password"
            className={inputClass}
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-charcoal cursor-pointer">
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <p className="text-text-light text-[11px] mt-1">{PASSWORD_HINT}</p>
      </div>
      <div>
        <label htmlFor="rp-confirm" className="block text-sm font-medium text-charcoal mb-1.5">Confirm Password</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock size={16} className="text-mocha" /></div>
          <input
            id="rp-confirm"
            type={showPassword ? "text" : "password"}
            placeholder="Re-enter your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isSubmitting}
            autoComplete="new-password"
            className={inputClass}
          />
        </div>
      </div>
      <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3.5 text-base mt-2 flex items-center justify-center gap-2 disabled:opacity-60">
        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : "Reset Password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-36 pb-16 md:pb-24 bg-cream min-h-screen">
        <div className="max-w-4xl mx-auto px-5 md:px-10">
          <ScrollReveal>
            <SectionHeader eyebrow="Account" title="Set a New Password" description="Choose a new, secure password for your account." />
          </ScrollReveal>

          <div className="mt-14 max-w-lg mx-auto">
            <ScrollReveal delay={100}>
              <div className="bg-surface rounded-2xl shadow-card border border-border-light p-8 md:p-10">
                <Suspense fallback={<div className="skeleton h-48 w-full rounded-xl" />}>
                  <ResetPasswordForm />
                </Suspense>
              </div>
            </ScrollReveal>

            <div className="mt-8 text-center">
              <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-mocha hover:text-mocha-dark transition-colors">
                <ArrowLeft size={14} /> Back to Home
              </Link>
            </div>
          </div>
        </div>
      </main>
      <FooterClient />
      <WhatsAppFAB />
    </>
  );
}
