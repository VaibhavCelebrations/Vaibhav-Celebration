"use client";

import {
  Copy,
  FolderOpen,
  Images,
  LayoutGrid,
  Pencil,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AdminApiError, adminFetch } from "@/lib/admin-api-client";
import { AdminConfirmDialog } from "@/components/ui/AdminConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { TextInput } from "@/components/ui/fields";
import { MediaCategoryBadge } from "@/components/ui/MediaCategoryBadge";
import { UploadDialog, type MediaPrefixKind, type UploadedMediaAsset, MEDIA_CATEGORY_OPTIONS } from "@/components/ui/UploadDialog";

type MediaItem = {
  id: string;
  url: string;
  cdnKey: string;
  type: string;
  altText: string | null;
  category: string | null;
  folder: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  createdAt: string;
};

type CategoryCount = { counts: Record<string, number>; total: number };

const ALL_CATEGORIES = [
  { value: "", label: "All Media", icon: LayoutGrid },
  ...MEDIA_CATEGORY_OPTIONS.map((o) => ({ value: o.value, label: o.label, icon: FolderOpen })),
];

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaLibraryScreen() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Inline edit state
  const [editTarget, setEditTarget] = useState<MediaItem | null>(null);
  const [editAltText, setEditAltText] = useState("");
  const [editCategory, setEditCategory] = useState<MediaPrefixKind>("gallery");
  const [editFolder, setEditFolder] = useState("");
  const [saving, setSaving] = useState(false);

  const toast = useToast();

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Load category counts for sidebar badges
  const loadCounts = useCallback(async () => {
    try {
      const data = await adminFetch<CategoryCount>("/admin/media/categories");
      setCategoryCounts(data.counts ?? {});
      setGrandTotal(data.total ?? 0);
    } catch {
      // non-critical
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: "1", pageSize: "60" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (activeCategory) params.set("category", activeCategory);
      const data = await adminFetch<{ items: MediaItem[]; total: number }>(`/admin/media?${params}`);
      setItems(data.items ?? []);
      setTotal(data.total ?? data.items?.length ?? 0);
    } catch (err) {
      toast({
        tone: "error",
        title: "Could not load media",
        description: err instanceof AdminApiError ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, activeCategory, toast]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadCounts(); }, [loadCounts]);

  async function onDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminFetch(`/admin/media/${deleteTarget.id}`, { method: "DELETE" });
      toast({ tone: "success", title: "Media deleted" });
      setDeleteTarget(null);
      void load();
      void loadCounts();
    } catch (err) {
      toast({
        tone: "error",
        title: "Could not delete media",
        description: err instanceof AdminApiError ? err.message : undefined,
      });
    } finally {
      setDeleting(false);
    }
  }

  function openEdit(item: MediaItem) {
    setEditTarget(item);
    setEditAltText(item.altText ?? "");
    setEditCategory((item.category as MediaPrefixKind) ?? "gallery");
    setEditFolder(item.folder ?? "");
  }

  async function saveEdit() {
    if (!editTarget) return;
    setSaving(true);
    try {
      await adminFetch(`/admin/media/${editTarget.id}`, {
        method: "PATCH",
        body: {
          altText: editAltText.trim() || null,
          category: editCategory,
          folder: editFolder.trim() || null,
        },
      });

      toast({ tone: "success", title: "Media asset updated" });
      setEditTarget(null);
      void load();
    } catch (err) {
      toast({
        tone: "error",
        title: "Could not update",
        description: err instanceof AdminApiError ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  function copyUrl(url: string) {
    void navigator.clipboard.writeText(url);
    toast({ tone: "success", title: "URL copied to clipboard" });
  }

  const currentCategoryLabel =
    ALL_CATEGORIES.find((c) => c.value === activeCategory)?.label ?? "All Media";

  return (
    <div className="flex w-full gap-0">
      {/* ── Category Sidebar ─────────────────────────────────────── */}
      <aside className="hidden w-52 shrink-0 flex-col gap-0.5 border-r border-[var(--color-border-soft)] pr-4 lg:flex">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
          Folders
        </p>
        {ALL_CATEGORIES.map((cat) => {
          const count = cat.value === "" ? grandTotal : (categoryCounts[cat.value] ?? 0);
          const active = cat.value === activeCategory;
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => { setActiveCategory(cat.value); setSearch(""); }}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                active
                  ? "bg-[var(--color-blush-light)] font-semibold text-[var(--color-mocha-dark)]"
                  : "text-[var(--color-charcoal)] hover:bg-[var(--color-surface-alt)]"
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <cat.icon size={15} className={active ? "text-[var(--color-mocha)]" : "text-[var(--color-text-muted)]"} />
                {cat.label}
              </span>
              {count > 0 && (
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${active ? "bg-[var(--color-mocha)] text-white" : "bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </aside>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <div className="min-w-0 flex-1 pl-0 lg:pl-6">
        <PageHeader
          eyebrow="Content"
          title={currentCategoryLabel}
          description="Browse, organize, and upload media assets. ALT text is required on every image for SEO."
          actions={
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="btn btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm"
            >
              <Upload size={16} /> Upload
            </button>
          }
        />

        {/* Mobile category strip */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
          {ALL_CATEGORIES.slice(0, 6).map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setActiveCategory(cat.value)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                cat.value === activeCategory
                  ? "bg-[var(--color-mocha)] text-white"
                  : "bg-[var(--color-surface-alt)] text-[var(--color-charcoal)]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="mb-4 flex max-w-sm items-center gap-2">
          <Search size={15} className="shrink-0 text-[var(--color-text-muted)]" />
          <TextInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alt text, filename, folder…"
            aria-label="Search media"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-charcoal)]">
              <X size={15} />
            </button>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="skeleton aspect-video rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Images}
            title={debouncedSearch ? "No results" : "No media in this folder"}
            description={debouncedSearch ? "Try a different search term." : "Upload the first file to this folder."}
          />
        ) : (
          <>
            <p className="mb-3 text-sm text-[var(--color-text-muted)]">
              {total} asset{total === 1 ? "" : "s"} · {currentCategoryLabel}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group relative flex flex-col overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video overflow-hidden bg-[var(--color-surface-alt)]">
                    {item.type?.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.url}
                        alt={item.altText ?? ""}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Images size={28} className="text-[var(--color-text-muted)]" />
                      </div>
                    )}

                    {/* Hover action overlay */}
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <button
                        type="button"
                        aria-label="Edit ALT text and metadata"
                        onClick={() => openEdit(item)}
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/90 text-[var(--color-charcoal)] shadow hover:bg-white"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label="Copy URL"
                        onClick={() => copyUrl(item.url)}
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/90 text-[var(--color-charcoal)] shadow hover:bg-white"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete media"
                        onClick={() => setDeleteTarget(item)}
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/90 text-[var(--color-error)] shadow hover:bg-white"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Missing ALT warning badge */}
                    {!item.altText && (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
                        NO ALT
                      </span>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="flex flex-col gap-1 p-2">
                    <p className="truncate text-xs font-medium text-[var(--color-charcoal)]">
                      {item.altText || <span className="italic text-[var(--color-text-muted)]">No ALT text</span>}
                    </p>
                    <div className="flex items-center justify-between gap-1">
                      <MediaCategoryBadge category={item.category} />
                      {item.sizeBytes ? (
                        <span className="text-[10px] text-[var(--color-text-muted)]">{formatBytes(item.sizeBytes)}</span>
                      ) : null}
                    </div>
                    {item.folder && (
                      <p className="truncate text-[10px] text-[var(--color-text-muted)]">📁 {item.folder}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Upload Dialog ──────────────────────────────────────── */}
      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        defaultCategory={(activeCategory as MediaPrefixKind) || "gallery"}
        onUploaded={(assets: UploadedMediaAsset[]) => {
          toast({ tone: "success", title: `${assets.length} file${assets.length === 1 ? "" : "s"} uploaded` });
          void load();
          void loadCounts();
        }}
      />

      {/* ── Inline Edit Panel ─────────────────────────────────── */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setEditTarget(null); }}
        >
          <div className="card w-full max-w-md p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-lg text-[var(--color-charcoal)]">Edit Asset</h3>
              <button type="button" onClick={() => setEditTarget(null)} className="cursor-pointer rounded p-1 hover:bg-[var(--color-surface-alt)]">
                <X size={18} />
              </button>
            </div>

            {/* Preview */}
            <div className="mb-4 overflow-hidden rounded-lg border border-[var(--color-border-soft)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={editTarget.url} alt={editTarget.altText ?? ""} className="aspect-video w-full object-cover" />
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--color-charcoal)]">
                  ALT Text <span className="text-red-500">*</span>
                  <span className="ml-1 font-normal text-[var(--color-text-muted)]">— for SEO &amp; accessibility</span>
                </label>
                <TextInput
                  value={editAltText}
                  onChange={(e) => setEditAltText(e.target.value)}
                  placeholder="Describe the image…"
                  maxLength={250}
                />
                <p className="mt-0.5 text-right text-[10px] text-[var(--color-text-muted)]">{editAltText.length}/250</p>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-semibold text-[var(--color-charcoal)]">Category</label>
                  <select
                    className="input w-full text-sm"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as MediaPrefixKind)}
                  >
                    {MEDIA_CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-semibold text-[var(--color-charcoal)]">Folder</label>
                  <TextInput
                    value={editFolder}
                    onChange={(e) => setEditFolder(e.target.value)}
                    placeholder="e.g. royal-mandap"
                    maxLength={80}
                  />
                </div>
              </div>

              <div className="pt-1">
                <p className="text-[10px] text-[var(--color-text-muted)] truncate">
                  Key: <code className="font-mono">{editTarget.cdnKey}</code>
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="btn btn-ghost px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={saveEdit}
                className="btn btn-primary px-4 py-2 text-sm disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ────────────────────────────────────── */}
      <AdminConfirmDialog
        open={!!deleteTarget}
        title="Delete this media asset?"
        message={
          <>
            Delete <strong>{deleteTarget?.altText || deleteTarget?.id}</strong>? This cannot be undone if the asset is in use.
          </>
        }
        submitting={deleting}
        onConfirm={onDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
