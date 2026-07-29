import { formatDisplayDate } from "@/lib/cms/map-media";
import { getLegalPage } from "@/lib/cms/legal";
import { sanitizeLegalHtml } from "@/lib/cms/sanitize-html";
import type { LegalPageType } from "@/lib/cms/types";

export async function LegalPageContent({ type }: { type: LegalPageType }) {
  let page;
  try {
    page = await getLegalPage(type);
  } catch {
    return (
      <div className="prose prose-sm max-w-none text-charcoal/75">
        <div className="bg-paper rounded-xl border border-gold-light/30 p-8 md:p-10">
          <p className="text-navy/30 text-center italic">Legal content is not available yet. Please check back soon.</p>
        </div>
      </div>
    );
  }

  const safeHtml = sanitizeLegalHtml(page.bodyHtml);

  return (
    <>
      <h1 className="font-display text-3xl md:text-4xl text-navy font-semibold">{page.title}</h1>
      <p className="mt-3 text-sm text-charcoal/50">
        Last updated: {formatDisplayDate(page.updatedAt)}
      </p>
      <div className="mt-10 cms-html-content max-w-none text-charcoal/75">
        <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
      </div>
    </>
  );
}
