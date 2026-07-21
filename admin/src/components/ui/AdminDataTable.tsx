"use client";

import { AlertCircle, ChevronDown, ChevronUp, ChevronsUpDown, MoreHorizontal, Search, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ListQuery } from "@/lib/data/types";
import { EmptyState } from "./EmptyState";

export type SortDir = "asc" | "desc";

export type Column<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  cell: (row: T) => ReactNode;
  hideBelow?: "sm" | "md" | "lg";
};

export type RowAction<T> = {
  id: string;
  label: string;
  icon?: LucideIcon;
  tone?: "default" | "danger";
  onSelect: (row: T) => void;
  hidden?: (row: T) => boolean;
  disabled?: (row: T) => boolean;
};

export type FilterDef = {
  key: string;
  label: string;
  type: "select" | "dateRange" | "toggle";
  options?: { value: string; label: string }[];
};

/** Patch handler — pair this with useListQuery()'s setQuery, which merges and resets to page 1 on any non-page change. */
export type QueryPatch = (patch: Partial<ListQuery>) => void;

const HIDE_CLASS: Record<NonNullable<Column<unknown>["hideBelow"]>, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
};

// ─── Toolbar (also composed standalone by Gallery's grid view) ─────────────

export function DataToolbar({
  query,
  onQueryChange,
  searchPlaceholder,
  filters,
  toolbarActions,
}: {
  query: ListQuery;
  onQueryChange: QueryPatch;
  searchPlaceholder?: string;
  filters?: FilterDef[];
  toolbarActions?: ReactNode;
}) {
  const [searchText, setSearchText] = useState(query.search ?? "");

  // Sync local input text when the controlled query.search changes externally
  // (e.g. "Clear all") — adjusted during render, not in an effect.
  const [prevQuerySearch, setPrevQuerySearch] = useState(query.search);
  if (query.search !== prevQuerySearch) {
    setPrevQuerySearch(query.search);
    setSearchText(query.search ?? "");
  }

  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchText !== (query.search ?? "")) onQueryChange({ search: searchText || undefined });
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const activeChips: { key: string; label: string; onClear: () => void }[] = [];
  if (query.search) activeChips.push({ key: "search", label: `"${query.search}"`, onClear: () => onQueryChange({ search: undefined }) });
  for (const f of filters ?? []) {
    const val = query.filters?.[f.key];
    if (!val) continue;
    const label = f.type === "select" ? (f.options?.find((o) => o.value === val)?.label ?? val) : val;
    activeChips.push({
      key: f.key,
      label: `${f.label}: ${label}`,
      onClear: () => onQueryChange({ filters: { ...query.filters, [f.key]: undefined } }),
    });
  }
  if (query.dateFrom || query.dateTo) {
    activeChips.push({
      key: "dateRange",
      label: `${query.dateFrom ?? "…"} – ${query.dateTo ?? "…"}`,
      onClear: () => onQueryChange({ dateFrom: undefined, dateTo: undefined }),
    });
  }

  function clearAll() {
    onQueryChange({ search: undefined, filters: {}, dateFrom: undefined, dateTo: undefined });
  }

  return (
    <div className="flex flex-col gap-3 border-b border-(--color-border-soft) p-4">
      <div className="flex flex-wrap items-center gap-2.5">
        {searchPlaceholder && (
          <div className="relative min-w-[200px] flex-1 sm:flex-none sm:basis-64">
            <Search size={14} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)" aria-hidden="true" />
            <input
              type="search"
              className="input pl-8"
              placeholder={searchPlaceholder}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              aria-label={searchPlaceholder}
            />
          </div>
        )}
        {(filters ?? []).map((f) => {
          if (f.type === "select") {
            return (
              <select
                key={f.key}
                className="input w-auto"
                value={query.filters?.[f.key] ?? ""}
                onChange={(e) => onQueryChange({ filters: { ...query.filters, [f.key]: e.target.value || undefined } })}
                aria-label={f.label}
              >
                <option value="">{f.label}</option>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            );
          }
          if (f.type === "toggle") {
            const checked = query.filters?.[f.key] === "true";
            return (
              <label key={f.key} className="flex cursor-pointer items-center gap-1.5 text-sm text-(--color-charcoal)">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => onQueryChange({ filters: { ...query.filters, [f.key]: e.target.checked ? "true" : undefined } })}
                />
                {f.label}
              </label>
            );
          }
          // dateRange
          return (
            <div key={f.key} className="flex items-center gap-1.5">
              <input
                type="date"
                className="input w-auto"
                value={query.dateFrom ?? ""}
                onChange={(e) => onQueryChange({ dateFrom: e.target.value || undefined })}
                aria-label={`${f.label} from`}
              />
              <span className="text-(--color-text-muted)">–</span>
              <input
                type="date"
                className="input w-auto"
                value={query.dateTo ?? ""}
                onChange={(e) => onQueryChange({ dateTo: e.target.value || undefined })}
                aria-label={`${f.label} to`}
              />
            </div>
          );
        })}
        {toolbarActions && <div className="ml-auto flex shrink-0 items-center gap-2">{toolbarActions}</div>}
      </div>
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onClear}
              className="badge badge-neutral inline-flex cursor-pointer items-center gap-1"
            >
              {chip.label}
              <X size={11} strokeWidth={2} aria-hidden="true" />
            </button>
          ))}
          <button type="button" onClick={clearAll} className="cursor-pointer text-xs font-medium text-(--color-mocha) hover:underline">
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Pagination footer ──────────────────────────────────────────────────────

export function DataPager({ total, query, onQueryChange }: { total: number; query: ListQuery; onQueryChange: QueryPatch }) {
  const start = total === 0 ? 0 : (query.page - 1) * query.pageSize + 1;
  const end = Math.min(query.page * query.pageSize, total);
  const hasPrev = query.page > 1;
  const hasNext = end < total;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--color-border-soft) px-4 py-3 text-sm text-(--color-text-muted)">
      <span>
        Showing {start}–{end} of {total}
      </span>
      <div className="flex items-center gap-3">
        <select
          className="input w-auto py-1"
          value={query.pageSize}
          onChange={(e) => onQueryChange({ pageSize: Number(e.target.value), page: 1 })}
          aria-label="Rows per page"
        >
          {[10, 25, 50].map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <button type="button" className="btn btn-ghost px-2.5 py-1 text-xs" disabled={!hasPrev} onClick={() => onQueryChange({ page: query.page - 1 })}>
            Prev
          </button>
          <button type="button" className="btn btn-ghost px-2.5 py-1 text-xs" disabled={!hasNext} onClick={() => onQueryChange({ page: query.page + 1 })}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main table ─────────────────────────────────────────────────────────────

export type AdminDataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  total: number;
  query: ListQuery;
  onQueryChange: QueryPatch;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  searchPlaceholder?: string;
  filters?: FilterDef[];
  toolbarActions?: ReactNode;
  onRowClick?: (row: T) => void;
  rowActions?: RowAction<T>[];
  rowAccent?: (row: T) => string | undefined;
  empty?: { icon?: LucideIcon; title: string; description?: string; action?: ReactNode };
  density?: "comfortable" | "compact";
};

export function AdminDataTable<T>({
  columns,
  rows,
  rowKey,
  total,
  query,
  onQueryChange,
  loading,
  error,
  onRetry,
  searchPlaceholder,
  filters,
  toolbarActions,
  onRowClick,
  rowActions,
  rowAccent,
  empty,
  density = "comfortable",
}: AdminDataTableProps<T>) {
  const [openMenuRow, setOpenMenuRow] = useState<string | null>(null);
  const menuRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (menuRootRef.current && !menuRootRef.current.contains(e.target as Node)) setOpenMenuRow(null);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const cellPad = density === "compact" ? "0.5rem 0.875rem" : "0.875rem 1rem";
  const isFiltered = Boolean(query.search || (query.filters && Object.values(query.filters).some(Boolean)) || query.dateFrom || query.dateTo);

  function toggleSort(col: Column<T>) {
    if (!col.sortable) return;
    if (query.sort !== col.key) return onQueryChange({ sort: col.key, dir: "asc" });
    if (query.dir === "asc") return onQueryChange({ sort: col.key, dir: "desc" });
    return onQueryChange({ sort: undefined, dir: undefined });
  }

  return (
    <div className="card overflow-hidden p-0">
      {(searchPlaceholder || filters || toolbarActions) && (
        <DataToolbar query={query} onQueryChange={onQueryChange} searchPlaceholder={searchPlaceholder} filters={filters} toolbarActions={toolbarActions} />
      )}

      {error ? (
        <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <AlertCircle size={28} strokeWidth={1.5} className="text-(--color-error)" aria-hidden="true" />
          <p className="text-sm text-(--color-charcoal)">{error}</p>
          {onRetry && (
            <button type="button" onClick={onRetry} className="btn btn-secondary px-3 py-1.5 text-xs">
              Retry
            </button>
          )}
        </div>
      ) : !loading && total === 0 ? (
        isFiltered ? (
          <EmptyState
            title="No results match these filters"
            description="Try widening your search or clearing a filter."
            action={
              <button type="button" onClick={() => onQueryChange({ search: undefined, filters: {}, dateFrom: undefined, dateTo: undefined })} className="btn btn-secondary px-3 py-1.5 text-xs">
                Clear filters
              </button>
            }
          />
        ) : (
          <EmptyState icon={empty?.icon} title={empty?.title ?? "Nothing here yet"} description={empty?.description} action={empty?.action} />
        )
      ) : (
        <div className="overflow-x-auto" ref={menuRootRef}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr style={{ background: "var(--color-surface)" }}>
                {columns.map((col) => {
                  const isSorted = query.sort === col.key;
                  return (
                    <th
                      key={col.key}
                      scope="col"
                      aria-sort={isSorted ? (query.dir === "desc" ? "descending" : "ascending") : col.sortable ? "none" : undefined}
                      className={`whitespace-nowrap border-b border-(--color-border-soft) text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-(--color-text-muted) ${
                        col.hideBelow ? HIDE_CLASS[col.hideBelow] : ""
                      }`}
                      style={{ padding: cellPad, width: col.width, textAlign: col.align ?? "left" }}
                    >
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(col)}
                          className="inline-flex cursor-pointer items-center gap-1 uppercase tracking-[0.08em]"
                        >
                          {col.header}
                          {isSorted ? (
                            query.dir === "desc" ? (
                              <ChevronDown size={12} strokeWidth={2} aria-hidden="true" />
                            ) : (
                              <ChevronUp size={12} strokeWidth={2} aria-hidden="true" />
                            )
                          ) : (
                            <ChevronsUpDown size={12} strokeWidth={2} aria-hidden="true" style={{ opacity: 0.5 }} />
                          )}
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  );
                })}
                {rowActions && rowActions.length > 0 && <th scope="col" style={{ padding: cellPad }} className="w-10" />}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: query.pageSize }).map((_, i) => (
                    <tr key={i}>
                      {columns.map((col) => (
                        <td key={col.key} style={{ padding: cellPad }} className={col.hideBelow ? HIDE_CLASS[col.hideBelow] : undefined}>
                          <div className="skeleton h-4 w-full max-w-32 rounded" />
                        </td>
                      ))}
                      {rowActions && rowActions.length > 0 && <td style={{ padding: cellPad }} />}
                    </tr>
                  ))
                : rows.map((row, i) => {
                    const key = rowKey(row);
                    const accent = rowAccent?.(row);
                    const visibleActions = (rowActions ?? []).filter((a) => !a.hidden?.(row));
                    return (
                      <tr
                        key={key}
                        className="table-row"
                        style={{
                          background: i % 2 === 0 ? "#fff" : "var(--color-surface)",
                          borderLeft: accent ? `3px solid ${accent}` : undefined,
                          cursor: onRowClick ? "pointer" : undefined,
                        }}
                        tabIndex={onRowClick ? 0 : undefined}
                        role={onRowClick ? "link" : undefined}
                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                        onKeyDown={
                          onRowClick
                            ? (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  onRowClick(row);
                                }
                              }
                            : undefined
                        }
                      >
                        {columns.map((col) => (
                          <td
                            key={col.key}
                            style={{ padding: cellPad, textAlign: col.align ?? "left" }}
                            className={col.hideBelow ? HIDE_CLASS[col.hideBelow] : undefined}
                          >
                            {col.cell(row)}
                          </td>
                        ))}
                        {rowActions && rowActions.length > 0 && (
                          <td style={{ padding: cellPad }} onClick={(e) => e.stopPropagation()}>
                            {visibleActions.length <= 2 ? (
                              <div className="flex items-center justify-end gap-1">
                                {visibleActions.map((a) => {
                                  const Icon = a.icon;
                                  return (
                                    <button
                                      key={a.id}
                                      type="button"
                                      title={a.label}
                                      aria-label={a.label}
                                      disabled={a.disabled?.(row)}
                                      onClick={() => a.onSelect(row)}
                                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-(--radius-sm) transition-colors hover:bg-(--color-surface-alt) disabled:cursor-not-allowed disabled:opacity-40"
                                      style={{ color: a.tone === "danger" ? "var(--color-error)" : "var(--color-text-secondary)" }}
                                    >
                                      {Icon ? <Icon size={15} strokeWidth={1.75} aria-hidden="true" /> : a.label[0]}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="relative flex justify-end">
                                <button
                                  type="button"
                                  aria-label="Row actions"
                                  aria-haspopup="menu"
                                  aria-expanded={openMenuRow === key}
                                  onClick={() => setOpenMenuRow((v) => (v === key ? null : key))}
                                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-(--radius-sm) text-(--color-text-secondary) hover:bg-(--color-surface-alt)"
                                >
                                  <MoreHorizontal size={16} strokeWidth={1.75} aria-hidden="true" />
                                </button>
                                {openMenuRow === key && (
                                  <div role="menu" className="card absolute right-0 top-8 z-10 min-w-36 p-1 shadow-(--shadow-elevated)">
                                    {visibleActions.map((a) => {
                                      const Icon = a.icon;
                                      return (
                                        <button
                                          key={a.id}
                                          type="button"
                                          role="menuitem"
                                          disabled={a.disabled?.(row)}
                                          onClick={() => {
                                            setOpenMenuRow(null);
                                            a.onSelect(row);
                                          }}
                                          className="nav-item flex w-full items-center gap-2 text-left disabled:cursor-not-allowed disabled:opacity-40"
                                          style={{ color: a.tone === "danger" ? "var(--color-error)" : undefined }}
                                        >
                                          {Icon && <Icon size={14} strokeWidth={1.75} aria-hidden="true" />}
                                          {a.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      )}

      {!error && total > 0 && <DataPager total={total} query={query} onQueryChange={onQueryChange} />}
    </div>
  );
}
