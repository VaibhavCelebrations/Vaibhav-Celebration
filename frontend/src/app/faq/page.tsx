import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { FAQAccordion } from "@/components/shared/FAQAccordion";
import { placeholderFAQs } from "@/lib/placeholder-data";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: "Find answers to common questions about booking, packages, and celebrating with Vaibhav Celebrations.",
};

export default function FAQPage() {
  const categories = Array.from(new Set(placeholderFAQs.map((faq) => faq.category)));

  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-36 pb-16 md:pb-24">
        <div className="max-w-3xl mx-auto px-5 md:px-10">
          <ScrollReveal>
            <SectionHeader eyebrow="Support" title="Frequently Asked Questions" description="Everything you need to know about celebrating with us. Can't find the answer you're looking for? Feel free to reach out." />
          </ScrollReveal>

          <div className="mt-14 space-y-12">
            {categories.map((category, idx) => (
              <ScrollReveal key={category} delay={idx * 100}>
                <div>
                  <h3 className="font-display text-xl text-charcoal font-semibold mb-6 pb-2 border-b border-border">{category}</h3>
                  <FAQAccordion items={placeholderFAQs.filter((faq) => faq.category === category)} />
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal delay={200}>
            <div className="mt-16 text-center bg-cream border border-border rounded-2xl p-8 md:p-10">
              <MessageCircle size={32} className="mx-auto text-mocha mb-4" />
              <h3 className="font-display text-2xl text-charcoal font-semibold mb-3">Still have questions?</h3>
              <p className="text-sm text-text-muted mb-6">Our team is happy to help you with any specific queries about your celebration.</p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/contact" className="btn-primary px-6 py-3">Contact Support</Link>
                <a href="https://wa.me/910000000000" target="_blank" rel="noopener noreferrer" className="btn-outline px-6 py-3">WhatsApp Us</a>
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
