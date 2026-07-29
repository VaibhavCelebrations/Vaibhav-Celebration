import type { Metadata } from "next";
import { LegalPageContent } from "@/components/legal/LegalPageContent";
import { getLegalPage } from "@/lib/cms/legal";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const page = await getLegalPage("refund-policy");
    return { title: page.title };
  } catch {
    return { title: "Refund & Cancellation Policy" };
  }
}

export default function RefundPage() {
  return <LegalPageContent type="refund-policy" />;
}
