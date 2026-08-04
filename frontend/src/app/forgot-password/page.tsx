"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { FooterClient } from "@/components/layout/FooterClient";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { requestPasswordReset, friendlyAuthError } from "@/lib/customer-auth-api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
      setDone(true);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-36 pb-16 md:pb-24 bg-cream min-h-screen">
        <div className="max-w-4xl mx-auto px-5 md:px-10">
          <ScrollReveal>
            <SectionHeader
              eyebrow="Account"
              title="Reset Your Password"
              description="Enter the email associated with your account and we'll send you a secure link to reset your password. The link is valid for 10 minutes."
            />
          </ScrollReveal>

          <div className="mt-14 max-w-lg mx-auto">
            <ScrollReveal delay={100}>
              <div className="bg-surface rounded-2xl shadow-card border border-border-light p-8 md:p-10">
                {done ? (
                  <div className="text-center py-4">
                    <CheckCircle2 size={40} className="mx-auto text-green-600 mb-4" />
                    <h3 className="font-display text-xl font-bold text-charcoal mb-2">Check your inbox</h3>
                    <p className="text-sm text-text-muted">
                      If an account exists for <span className="font-semibold text-charcoal">{email}</span>, we&apos;ve sent a
                      password reset link. It expires in 10 minutes.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                      <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                        {error}
                      </div>
                    )}
                    <div>
                      <label htmlFor="fp-email" className="block text-sm font-medium text-charcoal mb-1.5">
                        Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Mail size={16} className="text-mocha" />
                        </div>
                        <input
                          id="fp-email"
                          type="email"
                          placeholder="email@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={isSubmitting}
                          className="w-full rounded-lg border border-border bg-cream pl-10 pr-4 py-3 text-sm text-text placeholder:text-text-light focus:outline-none focus:border-mocha focus:ring-1 focus:ring-mocha transition-colors"
                        />
                      </div>
                    </div>
                    <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3.5 text-base mt-2 flex items-center justify-center gap-2 disabled:opacity-60">
                      {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : "Send Reset Link"}
                    </button>
                  </form>
                )}
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
