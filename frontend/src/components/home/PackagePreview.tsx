import Link from "next/link";
import Image from "next/image";
import { Check, X, ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { placeholderPackages, IMAGES } from "@/lib/placeholder-data";

export function PackagePreview() {
  return (
    <section id="packages" className="py-16 md:py-24 bg-surface border-y border-border-light">
      <div className="max-w-7xl mx-auto px-5 md:px-10">
        <ScrollReveal>
          <div className="mb-12 text-center flex flex-col items-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="h-px w-10 md:w-16 bg-gradient-to-r from-transparent to-mocha/60" />
              <p className="text-sm font-bold text-mocha uppercase tracking-[0.2em]">
                Our Celebration Packages
              </p>
              <div className="h-px w-10 md:w-16 bg-gradient-to-l from-transparent to-mocha/60" />
            </div>
            <h2 className="font-display text-4xl md:text-5xl text-charcoal font-semibold max-w-2xl mx-auto leading-tight">
              Choose the perfect package for your celebration
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {placeholderPackages.map((pkg, i) => (
            <ScrollReveal key={pkg.id} delay={i * 100} className="h-full">
              <div
                className={`rounded-2xl p-8 flex flex-col h-full transition-premium hover:-translate-y-2 text-center ${
                  pkg.isRecommended
                    ? "bg-cream-dark border-2 border-mocha relative shadow-card hover:shadow-hover"
                    : "bg-cream border border-border hover:shadow-card"
                }`}
              >
                {pkg.isRecommended && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-mocha text-white text-[10px] font-bold tracking-widest uppercase px-4 py-1.5 rounded-full whitespace-nowrap shadow-sm">
                    Most Chosen
                  </span>
                )}
                <h3 className="font-display text-2xl font-semibold text-charcoal">
                  {pkg.title}
                </h3>
                <p className="text-sm text-text-muted mt-2 h-10">
                  {pkg.description}
                </p>
                <div className="my-8">
                  <p className="font-display text-4xl text-charcoal font-semibold">
                    {pkg.priceLabel}
                  </p>
                  <p className="text-xs text-text-light mt-1 uppercase tracking-wider font-medium">Onwards</p>
                </div>

                <Link
                  href="/packages"
                  className={`mt-auto text-sm font-semibold px-6 py-3.5 rounded-lg text-center transition-all ${
                    pkg.isRecommended
                      ? "btn-primary hover:shadow-lg"
                      : "btn-outline hover:bg-charcoal hover:text-white"
                  }`}
                >
                  View Details
                </Link>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
