export function TabNav({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div role="tablist" aria-label="Section tabs" className="mb-5 flex gap-1 overflow-x-auto border-b border-(--color-border-soft)">
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className="relative shrink-0 cursor-pointer px-3.5 py-2.5 text-sm font-medium transition-colors"
            style={{ color: isActive ? "var(--color-mocha)" : "var(--color-text-muted)" }}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1.5 text-xs text-(--color-text-muted)">({t.count})</span>}
            {isActive && (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full"
                style={{ background: "var(--color-mocha)" }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
