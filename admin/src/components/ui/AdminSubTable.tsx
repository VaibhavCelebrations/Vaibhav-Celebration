"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

export type SubColumn<T> = {
  key: string;
  header: string;
  width?: string;
  align?: "left" | "center" | "right";
  render: (row: T, ctx: { patch: (p: Partial<T>) => void }) => ReactNode;
};

export type AdminSubTableProps<T> = {
  title: string;
  description?: string;
  columns: SubColumn<T>[];
  rows: T[];
  rowKey: (r: T) => string;
  onAdd?: () => void;
  addLabel?: string;
  onRemove?: (row: T) => void;
  onReorder?: (rowId: string, dir: "up" | "down") => void;
  onPatch: (rowId: string, patch: Partial<T>) => void;
  emptyLabel?: string;
  dirty?: boolean;
  onSave?: () => void;
  saving?: boolean;
};

/** Inline-editable sub-table for Package Features/Customization Options/Add-Ons, Theme Sample Assets/Linked Packages, Event Activities. */
export function AdminSubTable<T>({
  title,
  description,
  columns,
  rows,
  rowKey,
  onAdd,
  addLabel = "Add row",
  onRemove,
  onReorder,
  onPatch,
  emptyLabel = "No rows yet.",
  dirty,
  onSave,
  saving,
}: AdminSubTableProps<T>) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--color-border-soft) px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-(--color-charcoal)">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-(--color-text-muted)">{description}</p>}
        </div>
        {onAdd && (
          <button type="button" onClick={onAdd} className="btn btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs">
            <Plus size={14} strokeWidth={2} aria-hidden="true" />
            {addLabel}
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-(--color-text-muted)">{emptyLabel}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr style={{ background: "var(--color-surface)" }}>
                {onReorder && <th className="w-12 border-b border-(--color-border-soft)" />}
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className="whitespace-nowrap border-b border-(--color-border-soft) px-3 py-2 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-(--color-text-muted)"
                    style={{ width: c.width, textAlign: c.align ?? "left" }}
                  >
                    {c.header}
                  </th>
                ))}
                {onRemove && <th className="w-10 border-b border-(--color-border-soft)" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const key = rowKey(row);
                return (
                  <tr key={key} className="table-row">
                    {onReorder && (
                      <td className="px-2 py-2">
                        <div className="flex flex-col">
                          <button type="button" disabled={i === 0} onClick={() => onReorder(key, "up")} aria-label="Move up" className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-30">
                            <ChevronUp size={14} strokeWidth={2} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            disabled={i === rows.length - 1}
                            onClick={() => onReorder(key, "down")}
                            aria-label="Move down"
                            className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    )}
                    {columns.map((c) => (
                      <td key={c.key} className="px-3 py-2" style={{ textAlign: c.align ?? "left" }}>
                        {c.render(row, { patch: (p) => onPatch(key, p) })}
                      </td>
                    ))}
                    {onRemove && (
                      <td className="px-2 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => onRemove(row)}
                          aria-label="Remove row"
                          className="cursor-pointer text-(--color-error) hover:opacity-70"
                        >
                          <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {dirty && onSave && (
        <div className="flex items-center justify-between gap-3 border-t border-(--color-border-soft) px-4 py-3" style={{ background: "var(--color-warning-bg)" }}>
          <span className="text-xs font-medium" style={{ color: "var(--color-mocha-dark)" }}>
            Unsaved changes
          </span>
          <button type="button" onClick={onSave} disabled={saving} className="btn btn-primary px-3 py-1.5 text-xs">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}
    </div>
  );
}
