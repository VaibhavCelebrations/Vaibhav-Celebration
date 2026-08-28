"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { FooterClient } from "@/components/layout/FooterClient";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { confirmPhoneVerification, friendlyAuthError } from "@/lib/customer-auth-api";
import { useAuth } from "@/context/auth-context";

function VerifyPhoneContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("t") ?? "";
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">(token ? "loading" : "error");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        await confirmPhoneVerification(token);
        await refreshUser();
        setStatus("success");
      } catch (err) {
        setError(friendlyAuthError(err));
        setStatus("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (status === "loading") {
    return (
      <div className="text-center py-8">
        <Loader2 size={32} className="mx-auto text-mocha animate-spin mb-4" />
        <p className="text-sm text-text-muted">Verifying your WhatsApp number…</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="text-center py-4">
        <CheckCircle2 size={40} className="mx-auto text-green-600 mb-4" />
        <h3 className="font-display text-xl font-bold text-charcoal mb-2">Phone Verified</h3>
        <p className="text-sm text-text-muted">Thank you — your WhatsApp number has been confirmed.</p>
      </div>
    );
  }

  return (
    <div className="text-center py-4">
      <XCircle size={40} className="mx-auto text-red-500 mb-4" />
      <h3 className="font-display text-xl font-bold text-charcoal mb-2">Verification Failed</h3>
      <p className="text-sm text-text-muted">{error || "This verification link is invalid, expired, or missing."}</p>
    </div>
  );
}

export default function VerifyPhonePage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-36 pb-16 md:pb-24 bg-cream min-h-screen">
        <div className="max-w-4xl mx-auto px-5 md:px-10">
          <ScrollReveal>
            <SectionHeader eyebrow="Account" title="WhatsApp Number Verification" description="" />
          </ScrollReveal>
          <div className="mt-14 max-w-lg mx-auto">
            <ScrollReveal delay={100}>
              <div className="bg-surface rounded-2xl shadow-card border border-border-light p-8 md:p-10">
                <Suspense fallback={<div className="skeleton h-32 w-full rounded-xl" />}>
                  <VerifyPhoneContent />
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
