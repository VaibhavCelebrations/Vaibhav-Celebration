export default function SettingsPage() {
  return (
    <div>
      <h1 className="font-display text-3xl">Operational Settings</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--color-ink-muted)]">
        GST %, booking capacity defaults, consultation advance-notice, and integration health will
        be managed here (SUPER_ADMIN only). Seeded defaults are already in the database via{" "}
        <code>prisma/seed.ts</code>.
      </p>
    </div>
  );
}
