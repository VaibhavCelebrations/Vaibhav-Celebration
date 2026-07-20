"use client";

import type { ReactNode } from "react";

export type TabItem = { id: string; label: string; content: ReactNode };

export function Tabs({
  items,
  activeId,
  onChange,
}: {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
}) {
  const active = items.find((i) => i.id === activeId) ?? items[0];

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-2">
        {items.map((item) => {
          const isActive = item.id === active?.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`rounded-[var(--radius-sm)] px-3 py-1.5 text-sm transition-colors ${
                isActive
                  ? "bg-[var(--color-ink)] text-white"
                  : "text-[var(--color-ink-muted)] hover:bg-white"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div className="pt-4">{active?.content}</div>
    </div>
  );
}
