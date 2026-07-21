import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const pages: Record<string, { title: string; content: string }> = {
  "privacy-policy": {
    title: "Privacy Policy",
    content: "This privacy policy will be loaded from the admin panel. It covers how Vaibhav Celebrations collects, uses, and protects your personal information. Content will be dynamically fetched from the LegalPage model in the admin CMS.",
  },
  "refund-policy": {
    title: "Refund & Cancellation Policy",
    content: "This refund and cancellation policy will be loaded from the admin panel. It outlines the terms under which bookings can be cancelled and refunds processed. Content will be dynamically fetched from the LegalPage model in the admin CMS.",
  },
  "terms-of-service": {
    title: "Terms & Conditions",
    content: "These terms and conditions will be loaded from the admin panel. They govern the use of Vaibhav Celebrations' services and website. Content will be dynamically fetched from the LegalPage model in the admin CMS.",
  },
};

interface Props { params: Promise<{ type: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type } = await params;
  const page = pages[type];
  if (!page) return { title: "Not Found" };
  return { title: page.title };
}

export default async function LegalPage({ params }: Props) {
  const { type } = await params;
  const page = pages[type];
  if (!page) notFound();

  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-36 pb-16 md:pb-24">
        <div className="max-w-3xl mx-auto px-5 md:px-10">
          <ScrollReveal>
            <h1 className="font-display text-3xl md:text-4xl text-navy font-semibold">{page.title}</h1>
            <p className="mt-3 text-sm text-charcoal/50">Last updated: Will be set from Admin</p>
            <div className="mt-10 prose prose-sm max-w-none text-charcoal/75">
              <div className="bg-paper rounded-xl border border-gold-light/30 p-8 md:p-10">
                <p className="text-navy/30 text-center italic">[{page.content}]</p>
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
