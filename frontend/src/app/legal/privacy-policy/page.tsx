import type { Metadata } from "next";
import { LegalPageContent } from "@/components/legal/LegalPageContent";
import { getLegalPage } from "@/lib/cms/legal";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const page = await getLegalPage("privacy-policy");
    return { title: page.title };
  } catch {
    return { title: "Privacy Policy" };
  }
}

export default function PrivacyPage() {
  return <LegalPageContent type="privacy-policy" />;
}
