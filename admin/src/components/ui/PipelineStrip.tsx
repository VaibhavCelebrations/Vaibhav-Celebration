export function PipelineStrip({
  segments,
  active,
  onSelect,
}: {
  segments: { id: string; label: string; count: number }[];
  active?: string;
  onSelect: (id: string | undefined) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
      {segments.map((s) => {
        const isActive = s.id === active;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(isActive ? undefined : s.id)}
            aria-pressed={isActive}
            className="card flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors"
            style={{
              borderColor: isActive ? "var(--color-mocha)" : "var(--color-border-soft)",
              background: isActive ? "var(--color-blush-light)" : "#fff",
            }}
          >
            <span style={{ color: isActive ? "var(--color-mocha-dark)" : "var(--color-charcoal)", fontWeight: 500 }}>{s.label}</span>
            <span
              className="rounded-full px-1.5 text-xs font-semibold"
              style={{ background: isActive ? "var(--color-mocha)" : "var(--color-surface-alt)", color: isActive ? "#fff" : "var(--color-text-muted)" }}
            >
              {s.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
