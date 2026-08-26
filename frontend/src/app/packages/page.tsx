import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFABServer } from "@/components/layout/WhatsAppFABServer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { PackageComparisonGrid } from "@/components/packages/PackageComparisonGrid";
import { buildPageMetadata } from "@/lib/cms/metadata";
import { listPackages } from "@/lib/cms/packages";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata("packages", {
    title: "Packages & Pricing",
    description: "Compare Essential Celebration, Signature Celebration, and Grand Celebration packages.",
  });
}

const PACKAGING_NOTE: Record<string, string> = {
  essential: "Simple Packaging included",
  signature: "Theme-based Gift Bag included",
  grand: "Customized Theme Gift Bag included",
};

const DECOR_OUTSIDE_NOTE: Record<string, string> = {
  essential: "Basic Decor Guide (outside Jaipur)",
  signature: "Detailed Decor Guide (outside Jaipur)",
  grand: "Premium Luxe Decor Guide (outside Jaipur)",
};

export default async function PackagesPage() {
  const packages = await listPackages().catch(() => []);

  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-36 pb-16 md:pb-24">
        <div className="max-w-6xl mx-auto px-5 md:px-10">
          <ScrollReveal>
            <SectionHeader
              eyebrow="Packages"
              title="Choose Your Celebration Experience"
              description="Three clear tiers. Customize theme activities and gifts next — final quote confirmed at checkout."
            />
          </ScrollReveal>

          <div className="mt-16 grid md:grid-cols-3 gap-6 items-stretch">
            {packages.map((pkg, i) => (
              <ScrollReveal key={pkg.id} delay={i * 100} className="h-full">
                <div
                  className={`rounded-2xl p-8 flex flex-col h-full transition-premium hover:-translate-y-2 ${
                    pkg.isRecommended
                      ? "bg-cream-dark border-2 border-mocha relative shadow-card"
                      : "bg-cream border border-border"
                  }`}
                >
                  {(pkg.badgeText || pkg.isRecommended) && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-mocha text-white text-[10px] font-bold tracking-widest uppercase px-4 py-1.5 rounded-full whitespace-nowrap">
                      {pkg.badgeText || "Most Loved"}
                    </span>
                  )}
                  <h3 className="font-display text-2xl font-semibold text-charcoal">{pkg.title}</h3>
                  <p className="text-sm text-text-muted mt-2">{pkg.description}</p>
                  <p className="mt-6 font-display text-3xl text-charcoal font-semibold">{pkg.priceLabel}</p>
                  <p className="text-xs text-text-light mt-1">Base package onwards</p>
                  <hr className="my-6 border-border" />
                  <ul className="space-y-3 text-sm flex-1">
                    {pkg.features.map((f) => (
                      <li key={f.label} className="flex gap-3 text-text">
                        <Check size={16} className="text-mocha shrink-0 mt-0.5" />
                        <span>{f.label}</span>
                      </li>
                    ))}
                    <li className="flex gap-3 text-text">
                      <Check size={16} className="text-mocha shrink-0 mt-0.5" />
                      <span>{PACKAGING_NOTE[pkg.slug] ?? "Packaging included"}</span>
                    </li>
                    <li className="flex gap-3 text-text-muted">
                      <Check size={16} className="text-mocha/70 shrink-0 mt-0.5" />
                      <span>{DECOR_OUTSIDE_NOTE[pkg.slug]}</span>
                    </li>
                  </ul>
                  <div className="mt-8 flex flex-col gap-3">
                    <Link
                      href={`/build-package?pkg=${pkg.slug}`}
                      className="text-sm font-semibold px-6 py-3.5 rounded-lg text-center btn-primary"
                    >
                      Checkout
                    </Link>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <PackageComparisonGrid />

          <ScrollReveal>
            <div className="mt-16 mb-8 rounded-3xl border border-mocha/15 bg-cream-dark/50 px-6 py-10 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-mocha mb-3">Bespoke planning</p>
              <h3 className="font-display text-2xl md:text-3xl font-semibold text-charcoal">
                Plan a Custom Celebration
              </h3>
              <p className="mt-3 text-sm text-text-muted max-w-lg mx-auto leading-relaxed">
                Have a unique theme, guest count, or venue in mind? We&apos;ll design every detail around your celebration.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/consultation" className="btn-primary text-base px-10 py-4 w-full sm:w-auto uppercase tracking-wider font-bold">
                  Plan Custom Celebration
                </Link>
                <Link href="/consultation" className="btn-outline text-sm px-8 py-3.5 w-full sm:w-auto uppercase tracking-wider font-bold bg-white">
                  Book Consultation
                </Link>
              </div>
            </div>
            <p className="text-center text-xs text-text-light mt-8">
              *Base package price. Choosable activities, gifts, and Jaipur décor are added in the builder. GST applied at checkout.
            </p>
          </ScrollReveal>
        </div>
      </main>
      <Footer />
      <WhatsAppFABServer />
    </>
  );
}
