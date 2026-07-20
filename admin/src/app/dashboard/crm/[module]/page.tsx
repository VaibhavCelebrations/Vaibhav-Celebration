type Props = { params: Promise<{ module: string }> };

const TITLES: Record<string, string> = {
  customers: "Customers",
  leads: "Leads",
  bookings: "Bookings",
  calendar: "Booking Calendar",
  invoices: "Invoices",
  consultations: "Consultations",
};

export default async function CrmModulePlaceholder({ params }: Props) {
  const { module } = await params;
  const title = TITLES[module] ?? module;

  return (
    <div>
      <h1 className="font-display text-3xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--color-ink-muted)]">
        Module shell ready. Full CRM screens ship in Phase 1 Sub-Phase 1.4 (Document 05 / Document
        08).
      </p>
    </div>
  );
}
