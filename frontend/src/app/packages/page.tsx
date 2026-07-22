import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { PackagesComparison } from "@/components/packages/PackagesComparison";
import { fetchPublicPackages } from "@/lib/packages-api";
import { placeholderPackages } from "@/lib/placeholder-data";

export const metadata: Metadata = {
  title: "Packages & Pricing",
  description:
    "Compare Standard, Premium, and Lux celebration packages — every detail, side by side.",
};

function placeholderToPublic() {
  return placeholderPackages.map((p, i) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    priceInPaise: [4990000, 7990000, 11990000][i] ?? 4990000,
    tierRank: p.tierRank,
    isRecommended: p.isRecommended,
    isActive: true,
    isCustomizable: true,
    displayOrder: i + 1,
    description: p.description,
    serviceItems: p.features.map((f, j) => ({
      id: `${p.id}-svc-${j}`,
      extraServiceId: `svc-${j}`,
      isIncluded: f.included,
      displayOrder: j,
      extraService: {
        id: `svc-${j}`,
        label: f.label,
        description: null,
        requirements: null,
        customizationPriceInPaise: f.included ? 0 : [500000, 800000, 1200000][j % 3] ?? 500000,
      },
    })),
  }));
}

export default async function PackagesPage() {
  let packages = placeholderToPublic();
  try {
    packages = await fetchPublicPackages();
  } catch {
    // Fall back to placeholder when API is unavailable
  }

  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-36 pb-16 md:pb-24">
        <div className="max-w-6xl mx-auto px-5 md:px-10">
          <ScrollReveal>
            <SectionHeader
              eyebrow="Packages"
              title="Choose Your Celebration Experience"
              description="Every package can be personalized to your theme and guest list. Add optional services during customization — final quote confirmed at consultation."
            />
          </ScrollReveal>

          <PackagesComparison initialPackages={packages} />

          <ScrollReveal>
            <p className="text-center text-xs text-text-light mt-8">
              *Indicative pricing. Final quote confirmed during consultation based on your exact
              requirements.
            </p>
          </ScrollReveal>
        </div>
      </main>
      <Footer />
      <WhatsAppFAB />
    </>
  );
}
