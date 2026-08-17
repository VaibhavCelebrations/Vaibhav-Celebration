"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Minus } from "lucide-react";
import type { PackageCard } from "@/lib/cms/types";

export function PackageInclusions({ packages, themeSlug }: { packages: PackageCard[]; themeSlug: string }) {
  const [selectedPkgId, setSelectedPkgId] = useState(packages[0]?.id);

  const selectedPkg = packages.find((p) => p.id === selectedPkgId) || packages[0];

  return (
    <div className="bg-surface border border-border-light rounded-[2rem] overflow-hidden shadow-sm">
      {/* Toggle Header */}
      <div className="flex border-b border-border-light overflow-x-auto hide-scrollbar relative">
        {packages.map((pkg) => {
          const isSelected = selectedPkgId === pkg.id;
          return (
            <button
              key={pkg.id}
              onClick={() => setSelectedPkgId(pkg.id)}
              className={`flex-1 py-3 px-2 md:py-4 md:px-4 font-display font-bold text-center transition-colors relative ${
                isSelected ? "text-mocha" : "text-charcoal hover:bg-cream"
              }`}
            >
              {pkg.title}
              <div className={`text-xs font-sans font-normal mt-1 ${isSelected ? "text-mocha/80" : "text-text-muted"}`}>
                {pkg.priceLabel}
              </div>
              {/* Active Indicator */}
              {isSelected && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-mocha rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Features List */}
      <div className="p-6 md:p-8">
        <ul className="space-y-4 mb-8">
          {selectedPkg?.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 50}ms`, animationFillMode: "both" }}>
              <div className="mt-1 shrink-0">
                {feature.included ? (
                  <CheckCircle2 className="text-mocha" size={20} />
                ) : (
                  <Minus className="text-border-light" size={20} />
                )}
              </div>
              <span className={`text-sm md:text-base ${feature.included ? "text-charcoal font-medium" : "text-text-muted line-through"}`}>
                {feature.label}
              </span>
            </li>
          ))}
        </ul>

        {/* Checkout Button */}
        <Link
          href={`/build-package?pkg=${selectedPkg.slug}&theme=${themeSlug}`}
          className="btn-primary w-full py-4 text-center font-semibold text-sm block"
        >
          Build with {selectedPkg.title} →
        </Link>
      </div>
    </div>
  );
}
