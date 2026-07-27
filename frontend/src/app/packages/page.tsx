import type { Metadata } from "next";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { placeholderPackages } from "@/lib/placeholder-data";

export const metadata: Metadata = {
  title: "Packages & Pricing",
  description: "Compare our Basic, Standard, and Premium celebration packages — every detail, side by side.",
};

export default function PackagesPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-36 pb-16 md:pb-24">
        <div className="max-w-6xl mx-auto px-5 md:px-10">
          <ScrollReveal>
            <SectionHeader eyebrow="Packages" title="Choose Your Celebration Experience" description="Every package can be personalized to your theme and guest list. Final quote confirmed during your consultation." />
          </ScrollReveal>

          <div className="mt-16 grid md:grid-cols-3 gap-6 items-start">
            {placeholderPackages.map((pkg, i) => (
              <ScrollReveal key={pkg.id} delay={i * 100}>
                <div
                  className={`rounded-2xl p-8 flex flex-col h-full transition-premium hover:-translate-y-2 ${
                    pkg.isRecommended
                      ? "bg-cream-dark border-2 border-mocha relative shadow-card"
                      : "bg-cream border border-border"
                  }`}
                >
                  {pkg.isRecommended && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-mocha text-white text-[10px] font-bold tracking-widest uppercase px-4 py-1.5 rounded-full whitespace-nowrap">
                      Most Chosen
                    </span>
                  )}
                  <h3 className="font-display text-2xl font-semibold text-charcoal">
                    {pkg.title}
                  </h3>
                  <p className="text-sm text-text-muted mt-2">
                    {pkg.description}
                  </p>
                  <p className="mt-6 font-display text-3xl text-charcoal font-semibold">
                    {pkg.priceLabel}
                  </p>
                  <p className="text-xs text-text-light mt-1">Onwards</p>

                  <hr className="my-6 border-border" />

                  <ul className="space-y-4 text-sm flex-1">
                    {pkg.features.map((f) => (
                      <li
                        key={f.label}
                        className={`flex gap-3 ${
                          f.included ? "text-text" : "text-text-light/50 line-through"
                        }`}
                      >
                        {f.included ? (
                          <Check size={16} className="text-mocha shrink-0 mt-0.5" />
                        ) : (
                          <X size={16} className="shrink-0 mt-0.5" />
                        )}
                        <span>{f.label}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={`/build-package?package=${pkg.slug}`}
                    className={`mt-8 text-sm font-semibold px-6 py-3.5 rounded-lg text-center ${
                      pkg.isRecommended
                        ? "btn-primary"
                        : "btn-outline"
                    }`}
                  >
                    Proceed to Checkout
                  </Link>
                </div>
              </ScrollReveal>
            ))}
          </div>
          <ScrollReveal>
            <p className="text-center text-xs text-text-light mt-8">
              *Indicative pricing. Final quote confirmed during consultation based on your exact requirements.
            </p>
          </ScrollReveal>
        </div>
      </main>
      <Footer />
      <WhatsAppFAB />
    </>
  );
}
