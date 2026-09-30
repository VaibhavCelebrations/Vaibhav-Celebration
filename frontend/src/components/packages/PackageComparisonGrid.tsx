import { Fragment } from "react";
import { Check, Minus, Sparkles } from "lucide-react";
import Link from "next/link";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { ServicePreviewButton } from "@/components/packages/ServicePreviewButton";
import type { CelebrationStageName, PackageCard, PackageServiceInfo } from "@/lib/cms/types";

const STAGE_ORDER: Array<CelebrationStageName | null> = ["BEFORE", "DURING", "AFTER", null];
const STAGE_LABELS: Record<CelebrationStageName, string> = {
  BEFORE: "Before the Celebration",
  DURING: "During the Celebration",
  AFTER: "After the Celebration",
};

type Row = { service: PackageServiceInfo; byPackage: Record<string, PackageServiceInfo | undefined> };

/** One row per service in the admin package matrix, in matrix order, grouped Before / During / After. */
function buildRows(packages: PackageCard[]): Array<{ stage: CelebrationStageName | null; label: string; rows: Row[] }> {
  const rows = new Map<string, Row>();
  for (const pkg of packages) {
    for (const service of pkg.services) {
      const row = rows.get(service.id) ?? { service, byPackage: {} };
      row.byPackage[pkg.slug] = service;
      rows.set(service.id, row);
    }
  }
  // A service no package includes tells the customer nothing.
  const visible = [...rows.values()].filter((row) => Object.values(row.byPackage).some((s) => s?.included));
  return STAGE_ORDER.map((stage) => ({
    stage,
    label: stage ? STAGE_LABELS[stage] : "More Inclusions",
    rows: visible.filter((row) => row.service.stage === stage),
  })).filter((group) => group.rows.length > 0);
}

function Cell({ service, highlight }: { service: PackageServiceInfo | undefined; highlight: boolean }) {
  if (!service?.included) {
    return (
      <>
        <Minus className="mx-auto text-text-light/50" size={20} aria-hidden="true" />
        <span className="sr-only">Not included</span>
      </>
    );
  }
  if (service.chooseCount) {
    return <span className={`text-sm font-semibold ${highlight ? "text-mocha" : "text-charcoal"}`}>Choose any {service.chooseCount}</span>;
  }
  return (
    <>
      <Check className="mx-auto text-mocha" size={20} aria-hidden="true" />
      <span className="sr-only">Included</span>
    </>
  );
}

export function PackageComparisonGrid({ packages }: { packages: PackageCard[] }) {
  const groups = buildRows(packages);

  return (
    <section className="py-20 mt-10">
      {groups.length > 0 && (
        <>
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl text-charcoal font-semibold">Compare Packages</h2>
              <p className="mt-3 text-text-muted text-sm md:text-base max-w-xl mx-auto">
                A detailed breakdown of what&apos;s included in each celebration package. Tap Preview to see samples.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <div className="overflow-x-auto rounded-2xl border border-border shadow-sm">
              <table className="w-full text-left border-collapse min-w-[720px]">
                <caption className="sr-only">Package comparison by celebration stage</caption>
                <thead>
                  <tr className="bg-cream border-b border-border">
                    <th scope="col" className="py-5 px-6 font-display font-semibold text-charcoal text-lg">
                      Features
                    </th>
                    {packages.map((pkg) => (
                      <th
                        key={pkg.slug}
                        scope="col"
                        className={`py-5 px-6 font-display font-semibold text-charcoal text-center text-lg border-l border-border/50 ${pkg.isRecommended ? "bg-mocha/5" : ""}`}
                      >
                        {pkg.title}
                        <br />
                        <span className="text-sm font-normal text-text-muted">{pkg.priceLabel}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {groups.map((group) => (
                    <Fragment key={group.stage ?? "other"}>
                      <tr className="bg-cream-dark/60 border-b border-border/50">
                        <th
                          scope="colgroup"
                          colSpan={packages.length + 1}
                          className="py-2.5 px-6 text-left text-xs font-bold uppercase tracking-[0.15em] text-mocha"
                        >
                          {group.label}
                        </th>
                      </tr>
                      {group.rows.map(({ service, byPackage }) => (
                        <tr key={service.id} className="border-b border-border/50 hover:bg-cream-dark/30 transition-colors">
                          <th scope="row" className="py-4 px-6 text-left text-sm font-medium text-charcoal">
                            {service.label}
                            <ServicePreviewButton
                              label={service.label}
                              description={service.description}
                              media={service.previewMedia}
                              className="ml-2 align-middle"
                            />
                          </th>
                          {packages.map((pkg) => (
                            <td
                              key={pkg.slug}
                              className={`py-4 px-6 text-center border-l border-border/50 ${pkg.isRecommended ? "bg-mocha/5" : ""}`}
                            >
                              <Cell service={byPackage[pkg.slug]} highlight={pkg.isRecommended} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollReveal>
        </>
      )}

      {/* Custom Plan CTA */}
      <ScrollReveal delay={200}>
        <div className="mt-12 bg-mocha/5 border border-mocha/20 rounded-2xl p-8 md:p-10 text-center">
          <div className="w-14 h-14 bg-mocha/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="text-mocha" size={24} aria-hidden="true" />
          </div>
          <h3 className="font-display text-2xl font-semibold text-charcoal mb-2">Want to build your own?</h3>
          <p className="text-text-muted text-sm max-w-md mx-auto mb-6">
            Mix and match items from any package tier. Choose exactly what fits your celebration, budget, and number of guests.
          </p>
          <Link href="/custom-plan" className="btn-primary px-8 py-3 text-sm inline-flex">
            Build Your Custom Plan
          </Link>
        </div>
      </ScrollReveal>
    </section>
  );
}
