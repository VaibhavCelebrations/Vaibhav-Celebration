import type { Metadata } from "next";
import { LegalPageContent } from "@/components/legal/LegalPageContent";
import { getLegalPage } from "@/lib/cms/legal";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const page = await getLegalPage("terms-of-service");
    return { title: page.title };
  } catch {
    return { title: "Terms & Conditions" };
  }
}

export default function TermsPage() {
  return <LegalPageContent type="terms-of-service" />;
}
