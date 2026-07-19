type Props = { params: Promise<{ module: string }> };

const TITLES: Record<string, string> = {
  themes: "Themes",
  packages: "Packages",
  gallery: "Gallery",
  events: "Events",
  blog: "Blog",
  faqs: "FAQs",
  testimonials: "Testimonials",
  popups: "Popups",
  legal: "Legal Pages",
};

export default async function CmsModulePlaceholder({ params }: Props) {
  const { module } = await params;
  const title = TITLES[module] ?? module;

  return (
    <div>
      <h1 className="font-display text-3xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--color-ink-muted)]">
        Module shell ready. Full CRUD UI ships in Phase 1 Sub-Phase 1.3 (Document 05 / Document 08).
        Data-table + drawer pattern will be stamped here once APIs are wired.
      </p>
    </div>
  );
}
