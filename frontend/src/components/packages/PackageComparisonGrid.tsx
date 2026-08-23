import { Check, Minus, Sparkles } from "lucide-react";
import Link from "next/link";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const comparisonFeatures = [
  { feature: "Digital Theme Invite", essential: true, signature: true, grand: true },
  { feature: "Welcome Board / Standee", essential: true, signature: true, grand: true },
  { feature: "Theme Table Elements", essential: true, signature: true, grand: true },
  { feature: "Thank You Tags", essential: true, signature: true, grand: true },
  { feature: "Parent Party Brief", essential: false, signature: true, grand: true },
  { feature: "Countdown Cards (5 Days)", essential: false, signature: true, grand: true },
  { feature: "Theme Activity / Craft", essential: false, signature: "1 Activity", grand: "2 Activities" },
  { feature: "Return Gift Sourcing", essential: false, signature: true, grand: true },
  { feature: "Themed Gift Bag / Box", essential: "Simple Bag", signature: "Theme Bag", grand: "Custom Box" },
  { feature: "On-Day Coordination (Jaipur)", essential: false, signature: false, grand: true },
  { feature: "Premium Keepsake Box", essential: false, signature: false, grand: true },
  { feature: "Gift Registry", essential: false, signature: true, grand: true },
];

export function PackageComparisonGrid() {
  return (
    <section className="py-20 mt-10">
      <ScrollReveal>
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl text-charcoal font-semibold">
            Compare Packages
          </h2>
          <p className="mt-3 text-text-muted text-sm md:text-base max-w-xl mx-auto">
            A detailed breakdown of what&apos;s included in each celebration package.
          </p>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={100}>
        <div className="overflow-x-auto rounded-2xl border border-border shadow-sm">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-cream border-b border-border">
                <th className="py-5 px-6 font-display font-semibold text-charcoal text-lg w-1/4">Features</th>
                <th className="py-5 px-6 font-display font-semibold text-charcoal text-center text-lg w-1/4 border-l border-border/50">
                  Essential<br /><span className="text-sm font-normal text-text-muted">Celebration</span>
                </th>
                <th className="py-5 px-6 font-display font-semibold text-charcoal text-center text-lg w-1/4 border-l border-border/50 bg-mocha/5">
                  Signature<br /><span className="text-sm font-normal text-text-muted">Celebration</span>
                </th>
                <th className="py-5 px-6 font-display font-semibold text-charcoal text-center text-lg w-1/4 border-l border-border/50">
                  Grand<br /><span className="text-sm font-normal text-text-muted">Celebration</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {comparisonFeatures.map((row, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-cream-dark/30 transition-colors">
                  <td className="py-4 px-6 text-sm font-medium text-charcoal">{row.feature}</td>
                  
                  {/* Essential */}
                  <td className="py-4 px-6 text-center border-l border-border/50">
                    {typeof row.essential === "boolean" ? (
                      row.essential ? <Check className="mx-auto text-mocha" size={20} /> : <Minus className="mx-auto text-text-light/50" size={20} />
                    ) : (
                      <span className="text-sm text-text-muted">{row.essential}</span>
                    )}
                  </td>
                  
                  {/* Signature */}
                  <td className="py-4 px-6 text-center border-l border-border/50 bg-mocha/5">
                    {typeof row.signature === "boolean" ? (
                      row.signature ? <Check className="mx-auto text-mocha" size={20} /> : <Minus className="mx-auto text-text-light/50" size={20} />
                    ) : (
                      <span className="text-sm font-semibold text-mocha">{row.signature}</span>
                    )}
                  </td>
                  
                  {/* Grand */}
                  <td className="py-4 px-6 text-center border-l border-border/50">
                    {typeof row.grand === "boolean" ? (
                      row.grand ? <Check className="mx-auto text-mocha" size={20} /> : <Minus className="mx-auto text-text-light/50" size={20} />
                    ) : (
                      <span className="text-sm font-semibold text-charcoal">{row.grand}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScrollReveal>

      {/* Custom Plan CTA */}
      <ScrollReveal delay={200}>
        <div className="mt-12 bg-mocha/5 border border-mocha/20 rounded-2xl p-8 md:p-10 text-center">
          <div className="w-14 h-14 bg-mocha/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="text-mocha" size={24} />
          </div>
          <h3 className="font-display text-2xl font-semibold text-charcoal mb-2">
            Want to build your own?
          </h3>
          <p className="text-text-muted text-sm max-w-md mx-auto mb-6">
            Mix and match items from any package tier. Choose exactly what fits your celebration, budget, and number of guests.
          </p>
          <Link
            href="/custom-plan"
            className="btn-primary px-8 py-3 text-sm inline-flex"
          >
            Build Your Custom Plan
          </Link>
        </div>
      </ScrollReveal>
    </section>
  );
}
