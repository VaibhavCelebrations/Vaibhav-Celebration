"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Eye,
  Info,
} from "lucide-react";
import {
  fetchRecycleBinItems,
  restoreRecycleBinItem,
  hardDeleteRecycleBinItem,
  RECYCLE_BIN_ENTITY_TYPES,
  ENTITY_LABELS,
  type RecycleBinItem,
  type RecycleBinEntityType,
} from "@/lib/data/recycle-bin";
import { AdminApiError } from "@/lib/admin-api-client";

// ─── Entity type color badges ─────────────────────────────────────────────────

const ENTITY_COLORS: Record<RecycleBinEntityType, { bg: string; text: string }> = {
  Theme:             { bg: "bg-purple-100",  text: "text-purple-700"  },
  Package:           { bg: "bg-blue-100",    text: "text-blue-700"    },
  ExtraService:      { bg: "bg-cyan-100",    text: "text-cyan-700"    },
  GalleryImage:      { bg: "bg-pink-100",    text: "text-pink-700"    },
  BlogPost:          { bg: "bg-amber-100",   text: "text-amber-700"   },
  Event:             { bg: "bg-green-100",   text: "text-green-700"   },
  Testimonial:       { bg: "bg-yellow-100",  text: "text-yellow-700"  },
  FAQ:               { bg: "bg-teal-100",    text: "text-teal-700"    },
  Popup:             { bg: "bg-orange-100",  text: "text-orange-700"  },
  Product:           { bg: "bg-indigo-100",  text: "text-indigo-700"  },
  MediaAsset:        { bg: "bg-rose-100",    text: "text-rose-700"    },
  Customer:          { bg: "bg-sky-100",     text: "text-sky-700"     },
  Lead:              { bg: "bg-lime-100",    text: "text-lime-700"    },
  ConsultationRequest:{ bg: "bg-violet-100", text: "text-violet-700"  },
  AdminUser:         { bg: "bg-red-100",     text: "text-red-700"     },
  Invoice:           { bg: "bg-stone-100",   text: "text-stone-700"   },
  ThemeSampleAsset:  { bg: "bg-fuchsia-100", text: "text-fuchsia-700" },
  EventRegistration: { bg: "bg-emerald-100", text: "text-emerald-700" },
};

// ─── Utility ──────────────────────────────────────────────────────────────────

function formatRelative(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

function formatAbsolute(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// ─── Password Confirmation Modal ─────────────────────────────────────────────

type ModalAction = "restore" | "hardDelete";

type ConfirmModalProps = {
  action: ModalAction;
  item: RecycleBinItem;
  onConfirm: (password: string) => Promise<void>;
  onCancel: () => void;
};

function ConfirmModal({ action, item, onConfirm, onCancel }: ConfirmModalProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    passwordRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) {
      setError("Password is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onConfirm(password);
    } catch (err) {
      const msg = err instanceof AdminApiError ? err.message : "Something went wrong";
      setError(msg);
      setLoading(false);
    }
  }

  const isHardDelete = action === "hardDelete";
  const color = ENTITY_COLORS[item.entityType];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(30,20,15,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl"
        style={{ border: "1px solid var(--color-border-soft)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                isHardDelete ? "bg-red-100" : "bg-green-100"
              }`}
            >
              {isHardDelete ? (
                <Trash2 size={18} className="text-red-600" />
              ) : (
                <RotateCcw size={18} className="text-green-600" />
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold text-(--color-charcoal)">
                {isHardDelete ? "Delete Permanently" : "Restore Item"}
              </h2>
              <p className="text-xs text-(--color-text-muted)">
                Super Admin authentication required
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md p-1.5 text-(--color-text-muted) transition-colors hover:bg-gray-100 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Item card */}
        <div
          className="mx-6 mb-4 rounded-xl p-3"
          style={{ background: "var(--color-surface-alt)", border: "1px solid var(--color-border-soft)" }}
        >
          <div className="flex items-start gap-2">
            <span
              className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${color.bg} ${color.text}`}
            >
              {ENTITY_LABELS[item.entityType]}
            </span>
          </div>
          <p className="mt-1.5 text-sm font-medium text-(--color-charcoal)">
            {item.displayName}
          </p>
          <p className="mt-0.5 text-xs text-(--color-text-muted)">
            Deleted {formatAbsolute(item.deletedAt)}
          </p>
        </div>

        {/* Warnings */}
        {isHardDelete && (
          <div className="mx-6 mb-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-500" />
            <p className="text-xs text-red-700">
              This action is <strong>permanent and irreversible</strong>. The record will be
              removed from the database and cannot be recovered.
            </p>
          </div>
        )}

        {item.entityType === "MediaAsset" && !isHardDelete && (
          <div className="mx-6 mb-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <Info size={15} className="mt-0.5 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-700">
              Restoring a media asset makes it visible in the Media Library again, but it
              will not automatically re-appear in any content that was updated after it was deleted.
            </p>
          </div>
        )}

        {/* Password form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6">
          <label
            htmlFor="rb-password"
            className="mb-1.5 block text-xs font-medium text-(--color-charcoal)"
          >
            Enter your Super Admin password to confirm
          </label>
          <input
            id="rb-password"
            ref={passwordRef}
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
            placeholder="Your password"
            autoComplete="current-password"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
            style={{
              borderColor: error ? "#ef4444" : "var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-charcoal)",
            }}
          />
          {error && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
              <AlertTriangle size={12} />
              {error}
            </p>
          )}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50 cursor-pointer disabled:opacity-50"
              style={{ borderColor: "var(--color-border)", color: "var(--color-charcoal-soft)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors cursor-pointer disabled:opacity-50 ${
                isHardDelete
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {isHardDelete ? "Delete Forever" : "Restore"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export function RecycleBinClient() {
  const [items, setItems] = useState<RecycleBinItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [entityFilter, setEntityFilter] = useState<RecycleBinEntityType | "">("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionResult, setActionResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal state
  const [modal, setModal] = useState<{
    action: ModalAction;
    item: RecycleBinItem;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setActionResult(null);
    try {
      const result = await fetchRecycleBinItems({
        entityType: entityFilter || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setItems(result.items);
      setTotalItems(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (err) {
      const msg = err instanceof AdminApiError ? err.message : "Failed to load recycle bin";
      setActionResult({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  }, [entityFilter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  // Client-side search filter (over loaded page)
  const displayed = search.trim()
    ? items.filter((item) =>
        item.displayName.toLowerCase().includes(search.toLowerCase()) ||
        item.entityType.toLowerCase().includes(search.toLowerCase()),
      )
    : items;

  async function handleAction(password: string) {
    if (!modal) return;
    if (modal.action === "restore") {
      await restoreRecycleBinItem(modal.item.entityType, modal.item.id, password);
      setActionResult({ type: "success", message: `"${modal.item.displayName}" has been restored successfully.` });
    } else {
      await hardDeleteRecycleBinItem(modal.item.entityType, modal.item.id, password);
      setActionResult({ type: "success", message: `"${modal.item.displayName}" has been permanently deleted.` });
    }
    setModal(null);
    void load();
  }

  return (
    <>
      {/* Modal */}
      {modal && (
        <ConfirmModal
          action={modal.action}
          item={modal.item}
          onConfirm={handleAction}
          onCancel={() => setModal(null)}
        />
      )}

      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: "var(--color-surface-alt)", border: "1px solid var(--color-border-soft)" }}
            >
              <Trash2 size={17} style={{ color: "var(--color-mocha)" }} />
            </div>
            <h1 className="text-xl font-semibold text-(--color-charcoal)">Recycle Bin</h1>
          </div>
          <p className="mt-1 text-sm text-(--color-text-muted)">
            Soft-deleted records across all entity types. Restore or permanently delete — both actions require your Super Admin password.
          </p>
        </div>

        <div
          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm"
          style={{ background: "var(--color-surface-alt)", border: "1px solid var(--color-border-soft)" }}
        >
          <Trash2 size={13} style={{ color: "var(--color-text-muted)" }} />
          <span className="font-medium text-(--color-charcoal)">{totalItems}</span>
          <span className="text-(--color-text-muted)">deleted items</span>
        </div>
      </div>

      {/* Action result banner */}
      {actionResult && (
        <div
          className={`mb-4 flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm ${
            actionResult.type === "success"
              ? "border border-green-200 bg-green-50 text-green-800"
              : "border border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <span>{actionResult.message}</span>
          <button
            type="button"
            onClick={() => setActionResult(null)}
            className="shrink-0 cursor-pointer rounded p-0.5 hover:bg-black/10"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter bar */}
      <div
        className="mb-4 flex flex-wrap gap-3 rounded-xl p-3"
        style={{ background: "var(--color-surface-alt)", border: "1px solid var(--color-border-soft)" }}
      >
        {/* Search */}
        <div className="relative flex-1" style={{ minWidth: 200 }}>
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="w-full rounded-lg border bg-white py-2 pl-8 pr-3 text-sm outline-none transition-colors focus:ring-1"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-charcoal)",
            }}
          />
        </div>

        {/* Type filter */}
        <div className="relative flex items-center gap-1.5">
          <Filter size={14} style={{ color: "var(--color-text-muted)" }} />
          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value as RecycleBinEntityType | "");
              setPage(1);
            }}
            className="rounded-lg border bg-white py-2 pl-3 pr-7 text-sm outline-none transition-colors focus:ring-1 cursor-pointer"
            style={{ borderColor: "var(--color-border)", color: "var(--color-charcoal)" }}
          >
            <option value="">All types</option>
            {RECYCLE_BIN_ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {ENTITY_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div
        className="overflow-hidden rounded-xl"
        style={{ border: "1px solid var(--color-border-soft)" }}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-(--color-text-muted)">
            <Loader2 size={18} className="animate-spin" />
            Loading…
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-(--color-text-muted)">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: "var(--color-surface-alt)", border: "1px solid var(--color-border-soft)" }}
            >
              <Trash2 size={22} style={{ color: "var(--color-text-muted)" }} />
            </div>
            <p className="text-sm font-medium">Recycle bin is empty</p>
            <p className="text-xs">
              {entityFilter
                ? `No deleted ${ENTITY_LABELS[entityFilter as RecycleBinEntityType]} items found.`
                : "No soft-deleted records found across all entity types."}
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border-soft)", background: "var(--color-surface-alt)" }}>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">
                  Name / Item
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-(--color-text-muted) md:table-cell">
                  Deleted
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((item, i) => {
                const color = ENTITY_COLORS[item.entityType];
                const isMediaAsset = item.entityType === "MediaAsset";
                return (
                  <tr
                    key={`${item.entityType}-${item.id}`}
                    className="transition-colors hover:bg-gray-50/60"
                    style={{
                      borderBottom:
                        i < displayed.length - 1
                          ? "1px solid var(--color-border-soft)"
                          : "none",
                    }}
                  >
                    {/* Type badge */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${color.bg} ${color.text}`}
                      >
                        {ENTITY_LABELS[item.entityType]}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="max-w-xs px-4 py-3">
                      <p className="truncate text-sm font-medium text-(--color-charcoal)">
                        {item.displayName}
                      </p>
                      {Object.keys(item.meta).length > 0 && (
                        <p className="truncate text-xs text-(--color-text-muted)">
                          {Object.values(item.meta)
                            .filter(Boolean)
                            .slice(0, 2)
                            .join(" · ")}
                        </p>
                      )}
                    </td>

                    {/* Deleted at */}
                    <td className="hidden px-4 py-3 md:table-cell">
                      <p
                        className="text-sm text-(--color-charcoal)"
                        title={formatAbsolute(item.deletedAt)}
                      >
                        {formatRelative(item.deletedAt)}
                      </p>
                      <p className="text-xs text-(--color-text-muted)">
                        {formatAbsolute(item.deletedAt)}
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Restore */}
                        <button
                          type="button"
                          title="Restore"
                          onClick={() => setModal({ action: "restore", item })}
                          className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-green-50 cursor-pointer"
                          style={{
                            borderColor: "var(--color-border)",
                            color: "var(--color-charcoal-soft)",
                          }}
                        >
                          <RotateCcw size={12} className="text-green-600" />
                          <span className="hidden sm:inline">Restore</span>
                        </button>

                        {/* Hard delete — disabled + tooltip for MediaAsset */}
                        {isMediaAsset ? (
                          <span
                            title="Media assets cannot be hard-deleted here. Remove all references first in the Media Library."
                            className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium opacity-40 cursor-not-allowed"
                            style={{
                              borderColor: "var(--color-border)",
                              color: "var(--color-charcoal-soft)",
                            }}
                          >
                            <Trash2 size={12} className="text-red-500" />
                            <span className="hidden sm:inline">Delete</span>
                            <Eye size={10} className="ml-0.5 text-(--color-text-muted)" />
                          </span>
                        ) : (
                          <button
                            type="button"
                            title="Delete permanently"
                            onClick={() => setModal({ action: "hardDelete", item })}
                            className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-red-50 cursor-pointer"
                            style={{
                              borderColor: "var(--color-border)",
                              color: "var(--color-charcoal-soft)",
                            }}
                          >
                            <Trash2 size={12} className="text-red-500" />
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-4 text-sm text-(--color-text-muted)">
          <span>
            Page {page} of {totalPages} · {totalItems} items
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-gray-50 disabled:opacity-40 cursor-pointer disabled:cursor-default"
              style={{ borderColor: "var(--color-border)" }}
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-gray-50 disabled:opacity-40 cursor-pointer disabled:cursor-default"
              style={{ borderColor: "var(--color-border)" }}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Media Asset info banner at bottom */}
      {(entityFilter === "MediaAsset" || entityFilter === "") && displayed.some((i) => i.entityType === "MediaAsset") && (
        <div
          className="mt-4 flex gap-2 rounded-xl p-3 text-xs text-(--color-text-muted)"
          style={{ background: "var(--color-surface-alt)", border: "1px solid var(--color-border-soft)" }}
        >
          <Info size={13} className="mt-0.5 shrink-0" />
          <span>
            <strong className="text-(--color-charcoal)">Media Assets</strong> cannot be permanently deleted from here because they may be referenced by content across the site. To permanently delete a media asset, first remove all references to it in Blog, Events, Themes, etc., then delete it from the Media Library.
          </span>
        </div>
      )}
    </>
  );
}
