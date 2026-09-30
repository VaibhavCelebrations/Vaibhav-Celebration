"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { ServicePreviewButton } from "@/components/packages/ServicePreviewButton";
import type { CelebrationStageName, PackageCard } from "@/lib/cms/types";

const STAGES: Array<{ stage: CelebrationStageName | null; label: string }> = [
  { stage: "BEFORE", label: "Before the Celebration" },
  { stage: "DURING", label: "During the Celebration" },
  { stage: "AFTER", label: "After the Celebration" },
  { stage: null, label: "Also Included" },
];

export function PackageInclusions({ packages, themeSlug }: { packages: PackageCard[]; themeSlug: string }) {
  const [selectedPkgId, setSelectedPkgId] = useState(packages[0]?.id);

  const selectedPkg = packages.find((p) => p.id === selectedPkgId) || packages[0];
  if (!selectedPkg) return null;

  const included = selectedPkg.services.filter((s) => s.included);
  const groups = STAGES.map((g) => ({ ...g, services: included.filter((s) => s.stage === g.stage) })).filter((g) => g.services.length > 0);

  return (
    <div className="bg-surface border border-border-light rounded-[2rem] overflow-hidden shadow-sm">
      {/* Package tabs */}
      <div className="flex border-b border-border-light overflow-x-auto hide-scrollbar relative" role="tablist" aria-label="Packages">
        {packages.map((pkg) => {
          const isSelected = selectedPkg.id === pkg.id;
          return (
            <button
              key={pkg.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelectedPkgId(pkg.id)}
              className={`flex-1 py-3 px-2 md:py-4 md:px-4 font-display font-bold text-center transition-colors relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-mocha ${
                isSelected ? "text-mocha" : "text-charcoal hover:bg-cream"
              }`}
            >
              {pkg.title}
              <span className={`block text-xs font-sans font-normal mt-1 ${isSelected ? "text-mocha/80" : "text-text-muted"}`}>
                {pkg.priceLabel}
              </span>
              {isSelected && <span className="absolute bottom-0 left-0 right-0 h-1 bg-mocha rounded-t-full" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      {/* Inclusions by stage */}
      <div className="p-6 md:p-8" role="tabpanel">
        <div className="space-y-6 mb-8">
          {groups.map((group) => (
            <div key={group.stage ?? "other"}>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-mocha">{group.label}</h4>
              <ul className="space-y-3">
                {group.services.map((service) => (
                  <li key={service.id} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-mocha" size={20} aria-hidden="true" />
                    <span className="text-sm md:text-base text-charcoal font-medium">
                      {service.label}
                      {service.chooseCount ? <span className="font-normal text-text-muted"> (choose any {service.chooseCount})</span> : null}
                      <ServicePreviewButton
                        label={service.label}
                        description={service.description}
                        media={service.previewMedia}
                        className="ml-2"
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Link
          href={`/build-package?pkg=${selectedPkg.slug}&theme=${themeSlug}`}
          className="btn-primary w-full py-4 text-center font-semibold text-sm block"
        >
          Build with {selectedPkg.title} →
        </Link>

        <Link href="/custom-plan" className="btn-outline w-full py-3 text-center font-semibold text-sm block mt-3">
          Or Build Your Custom Plan
        </Link>
      </div>
    </div>
  );
}
