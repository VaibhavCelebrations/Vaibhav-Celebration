import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Search, FileQuestion } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFABServer } from "@/components/layout/WhatsAppFABServer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export const metadata: Metadata = {
  title: "Order Lookup",
  description: "Check the status of your upcoming celebration or view past order details.",
};

export default function OrderLookupPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-36 pb-16 md:pb-24">
        <div className="max-w-4xl mx-auto px-5 md:px-10">
          <ScrollReveal>
            <SectionHeader eyebrow="Track Order" title="Find Your Celebration" description="Enter your booking reference or the email used during consultation to view your celebration details and status." />
          </ScrollReveal>

          <div className="mt-14 max-w-lg mx-auto">
            <ScrollReveal delay={100}>
              <div className="bg-surface rounded-2xl shadow-card border border-border-light p-8 md:p-10">
                <form className="space-y-6">
                  <div>
                    <label htmlFor="lookup-id" className="block text-sm font-medium text-charcoal mb-1.5">Booking Reference</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search size={16} className="text-mocha" /></div>
                      <input id="lookup-id" type="text" placeholder="e.g. VC-123456" className="w-full rounded-lg border border-border bg-cream pl-10 pr-4 py-3 text-sm text-text placeholder:text-text-light focus:outline-none focus:border-mocha focus:ring-1 focus:ring-mocha transition-colors uppercase" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-px bg-border flex-1" />
                    <span className="text-xs text-text-light font-medium uppercase tracking-wider">Or</span>
                    <div className="h-px bg-border flex-1" />
                  </div>
                  <div>
                    <label htmlFor="lookup-email" className="block text-sm font-medium text-charcoal mb-1.5">Email Address</label>
                    <input id="lookup-email" type="email" placeholder="email@example.com" className="w-full rounded-lg border border-border bg-cream px-4 py-3 text-sm text-text placeholder:text-text-light focus:outline-none focus:border-mocha focus:ring-1 focus:ring-mocha transition-colors" />
                  </div>
                  <button type="button" className="btn-primary w-full py-3.5 text-base mt-2">Find My Celebration</button>
                </form>
              </div>
            </ScrollReveal>

            {/* Help link */}
            <ScrollReveal delay={200}>
              <div className="mt-8 text-center bg-cream border border-border rounded-xl p-5">
                <FileQuestion size={24} className="mx-auto text-mocha mb-3" />
                <h4 className="text-sm font-semibold text-charcoal">Can&apos;t find your booking?</h4>
                <p className="text-xs text-text-muted mt-1 max-w-xs mx-auto">If you just booked, it might take a few minutes for your reference to activate.</p>
                <Link href="/contact" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-mocha hover:text-mocha-dark transition-colors">Contact Support <ArrowRight size={14} /></Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </main>
      <Footer />
      <WhatsAppFABServer />
    </>
  );
}
