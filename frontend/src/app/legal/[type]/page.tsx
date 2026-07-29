import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFABServer } from "@/components/layout/WhatsAppFABServer";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { LegalPageContent } from "@/components/legal/LegalPageContent";
import { getLegalPage } from "@/lib/cms/legal";
import type { LegalPageType } from "@/lib/cms/types";

const VALID_TYPES = new Set<LegalPageType>([
  "privacy-policy",
  "refund-policy",
  "terms-of-service",
  "cancellation-policy",
]);

interface Props { params: Promise<{ type: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type } = await params;
  if (!VALID_TYPES.has(type as LegalPageType)) return { title: "Not Found" };
  try {
    const page = await getLegalPage(type as LegalPageType);
    return { title: page.title };
  } catch {
    return { title: "Legal" };
  }
}

export default async function LegalDynamicPage({ params }: Props) {
  const { type } = await params;
  if (!VALID_TYPES.has(type as LegalPageType)) notFound();

  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-36 pb-16 md:pb-24">
        <div className="max-w-3xl mx-auto px-5 md:px-10">
          <ScrollReveal>
            <LegalPageContent type={type as LegalPageType} />
          </ScrollReveal>
        </div>
      </main>
      <Footer />
      <WhatsAppFABServer />
    </>
  );
}
