import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFABServer } from "@/components/layout/WhatsAppFABServer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { FAQAccordion } from "@/components/shared/FAQAccordion";
import { buildPageMetadata } from "@/lib/cms/metadata";
import { listFaqs } from "@/lib/cms/content";
import { getWhatsAppNumber, getWhatsAppPrefillMessage } from "@/lib/cms/settings";
import { whatsappHref } from "@/lib/cms/map-media";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata("faq", {
    title: "Frequently Asked Questions",
    description: "Find answers to common questions about booking, packages, and celebrating with Vaibhav Celebrations.",
  });
}

export default async function FAQPage() {
  const faqs = await listFaqs().catch(() => []);
  const categories = Array.from(new Set(faqs.map((faq) => faq.category ?? "General")));
  const whatsappNumber = await getWhatsAppNumber().catch(() => "");
  const whatsappPrefillMessage = getWhatsAppPrefillMessage();

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
                  <FAQAccordion items={faqs.filter((faq) => (faq.category ?? "General") === category).map((faq) => ({ question: faq.question, answer: faq.answer }))} />
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
                <a href={whatsappHref(whatsappNumber, whatsappPrefillMessage)} target="_blank" rel="noopener noreferrer" className="btn-outline px-6 py-3">WhatsApp Us</a>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </main>
      <Footer />
      <WhatsAppFABServer />
    </>
  );
}
