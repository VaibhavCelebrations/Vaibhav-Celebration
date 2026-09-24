"use client";

import Link from "next/link";
import { ArrowLeft, MessageSquareCheck, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { FooterClient } from "@/components/layout/FooterClient";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default function VerifyPhonePage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-36 pb-16 md:pb-24 bg-cream min-h-screen">
        <div className="max-w-4xl mx-auto px-5 md:px-10">
          <ScrollReveal>
            <SectionHeader eyebrow="Account" title="WhatsApp Phone Verification" description="" />
          </ScrollReveal>
          <div className="mt-14 max-w-lg mx-auto">
            <ScrollReveal delay={100}>
              <div className="bg-surface rounded-2xl shadow-card border border-border-light p-8 md:p-10 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4 text-emerald-600">
                  <MessageSquareCheck size={28} />
                </div>
                <h3 className="font-display text-xl font-bold text-charcoal mb-2">Instant OTP Verification</h3>
                <p className="text-sm text-text-muted mb-6">
                  Phone verification is now handled via instant one-time password (OTP) sent directly to your WhatsApp.
                  You can verify your phone number anytime from your Account profile.
                </p>
                <Link
                  href="/account"
                  className="inline-flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl bg-mocha text-white font-medium hover:bg-mocha-dark transition shadow-sm"
                >
                  Go to My Account <ArrowRight size={16} />
                </Link>
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
