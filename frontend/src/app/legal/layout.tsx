import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFABServer } from "@/components/layout/WhatsAppFABServer";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-36 pb-16 md:pb-24">
        <div className="max-w-4xl mx-auto px-5 md:px-10">
          <ScrollReveal>
            <div className="bg-surface rounded-2xl shadow-soft border border-border p-8 md:p-12">
              {children}
            </div>
          </ScrollReveal>
        </div>
      </main>
      <Footer />
      <WhatsAppFABServer />
    </>
  );
}
