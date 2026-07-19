export default function DashboardHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Phase 1.0 foundation — shell, auth, and navigation are ready. CMS/CRM modules land in
          Sub-Phases 1.3–1.4.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Today's Bookings", value: "—" },
          { label: "New Leads (7d)", value: "—" },
          { label: "Pending Consultations", value: "—" },
          { label: "Revenue MTD", value: "—" },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm"
          >
            <p className="text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
              {card.label}
            </p>
            <p className="mt-2 font-display text-3xl">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
