import type { Metadata } from "next";
import { CalendarDays, Clock, Users } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export const metadata: Metadata = {
  title: "Book a Consultation",
  description: "Schedule a free consultation with Vaibhav Celebrations to plan your child's dream birthday celebration.",
};

export default function ConsultationPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-36 pb-16 md:pb-24">
        <div className="max-w-4xl mx-auto px-5 md:px-10">
          <ScrollReveal>
            <SectionHeader eyebrow="Let's Plan" title="Book a Free Consultation" description="Tell us about your child and their dream celebration — we'll handle the rest." />
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <div className="mt-14 bg-surface rounded-2xl shadow-card border border-border-light p-8 md:p-10">
              <form className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="cons-parent" className="block text-sm font-medium text-charcoal mb-1.5">Parent&apos;s Name</label>
                    <input id="cons-parent" type="text" placeholder="Your full name" className="w-full rounded-lg border border-border bg-cream px-4 py-3 text-sm text-text placeholder:text-text-light focus:outline-none focus:border-mocha focus:ring-1 focus:ring-mocha transition-colors" />
                  </div>
                  <div>
                    <label htmlFor="cons-child" className="block text-sm font-medium text-charcoal mb-1.5">Child&apos;s Name</label>
                    <input id="cons-child" type="text" placeholder="Birthday child's name" className="w-full rounded-lg border border-border bg-cream px-4 py-3 text-sm text-text placeholder:text-text-light focus:outline-none focus:border-mocha focus:ring-1 focus:ring-mocha transition-colors" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="cons-email" className="block text-sm font-medium text-charcoal mb-1.5">Email</label>
                    <input id="cons-email" type="email" placeholder="email@example.com" className="w-full rounded-lg border border-border bg-cream px-4 py-3 text-sm text-text placeholder:text-text-light focus:outline-none focus:border-mocha focus:ring-1 focus:ring-mocha transition-colors" />
                  </div>
                  <div>
                    <label htmlFor="cons-phone" className="block text-sm font-medium text-charcoal mb-1.5">Phone</label>
                    <input id="cons-phone" type="tel" placeholder="+91 00000 00000" className="w-full rounded-lg border border-border bg-cream px-4 py-3 text-sm text-text placeholder:text-text-light focus:outline-none focus:border-mocha focus:ring-1 focus:ring-mocha transition-colors" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="cons-age" className="block text-sm font-medium text-charcoal mb-1.5">Child&apos;s Age</label>
                    <select id="cons-age" className="w-full rounded-lg border border-border bg-cream px-4 py-3 text-sm text-text focus:outline-none focus:border-mocha focus:ring-1 focus:ring-mocha transition-colors">
                      <option value="">Select age</option>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((age) => (<option key={age} value={age}>{age} year{age > 1 ? "s" : ""}</option>))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="cons-date" className="block text-sm font-medium text-charcoal mb-1.5">Preferred Date</label>
                    <input id="cons-date" type="date" className="w-full rounded-lg border border-border bg-cream px-4 py-3 text-sm text-text focus:outline-none focus:border-mocha focus:ring-1 focus:ring-mocha transition-colors" />
                  </div>
                </div>
                <div>
                  <label htmlFor="cons-theme" className="block text-sm font-medium text-charcoal mb-1.5">Dream Theme (Optional)</label>
                  <input id="cons-theme" type="text" placeholder="e.g., Space Explorer, Princess Palace, or 'I'm not sure yet'" className="w-full rounded-lg border border-border bg-cream px-4 py-3 text-sm text-text placeholder:text-text-light focus:outline-none focus:border-mocha focus:ring-1 focus:ring-mocha transition-colors" />
                </div>
                <div>
                  <label htmlFor="cons-notes" className="block text-sm font-medium text-charcoal mb-1.5">Additional Notes</label>
                  <textarea id="cons-notes" rows={3} placeholder="Any special requests, guest count estimates..." className="w-full rounded-lg border border-border bg-cream px-4 py-3 text-sm text-text placeholder:text-text-light focus:outline-none focus:border-mocha focus:ring-1 focus:ring-mocha transition-colors resize-none" />
                </div>
                <button type="button" className="btn-primary w-full py-4 text-base mt-2">Schedule Consultation</button>
              </form>
            </div>
          </ScrollReveal>

          {/* Info cards */}
          <ScrollReveal delay={200}>
            <div className="mt-8 grid sm:grid-cols-3 gap-6">
              <div className="flex items-start gap-3 bg-surface border border-border-light rounded-xl p-5">
                <CalendarDays size={20} className="text-mocha shrink-0 mt-0.5" />
                <div><p className="font-medium text-charcoal text-sm">Book 2-3 Weeks Ahead</p><p className="text-xs text-text-light mt-0.5">For personalization time</p></div>
              </div>
              <div className="flex items-start gap-3 bg-surface border border-border-light rounded-xl p-5">
                <Clock size={20} className="text-mocha shrink-0 mt-0.5" />
                <div><p className="font-medium text-charcoal text-sm">30-Min Consultation</p><p className="text-xs text-text-light mt-0.5">Free, no obligation</p></div>
              </div>
              <div className="flex items-start gap-3 bg-surface border border-border-light rounded-xl p-5">
                <Users size={20} className="text-mocha shrink-0 mt-0.5" />
                <div><p className="font-medium text-charcoal text-sm">For Any Guest Count</p><p className="text-xs text-text-light mt-0.5">Intimate to grand</p></div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </main>
      <Footer />
      <WhatsAppFAB />
    </>
  );
}
