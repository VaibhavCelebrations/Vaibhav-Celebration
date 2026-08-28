"use client";

import { ImagePlus, Search, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AdminApiError, adminFetch } from "@/lib/admin-api-client";
import type { MediaRef } from "@/types/common";
import { useToast } from "./Toast";
import { MediaCategoryBadge } from "./MediaCategoryBadge";
import { MEDIA_CATEGORY_OPTIONS, type MediaPrefixKind } from "./UploadDialog";

type MediaPickerProps = {
  value?: MediaRef | null;
  onChange: (media: MediaRef | null) => void;
  kind: MediaPrefixKind;
  scope?: string;
};

type MediaItem = MediaRef & {
  id: string;
  category?: string | null;
  folder?: string | null;
  sizeBytes?: number | null;
};

const API_BASE =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1")
    : "http://localhost:4000/api/v1";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem("vbc_admin_access");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function MediaPicker({ value, onChange, kind, scope }: MediaPickerProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>(kind);

  // Per-upload ALT text state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [altDraft, setAltDraft] = useState("");
  const [showAltPrompt, setShowAltPrompt] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => { setMounted(true); }, []);
  // Keep filter in sync with kind prop
  useEffect(() => { setFilterCategory(kind); }, [kind]);

  const load = async (cat?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: "1", pageSize: "60" });
      const activeCat = cat ?? filterCategory;
      if (activeCat) params.set("category", activeCat);
      if (search.trim()) params.set("search", search.trim());
      const result = await adminFetch<{ items: MediaItem[] }>(`/admin/media?${params}`);
      setItems(result.items ?? []);
    } catch (error) {
      toast({
        tone: "error",
        title: "Could not load media",
        description: error instanceof AdminApiError ? error.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filterCategory, search]);

  // Step 1: user picks a file → show ALT text prompt
  const onFileSelected = (file: File) => {
    setPendingFile(file);
    setAltDraft("");
    setShowAltPrompt(true);
  };

  // Step 2: user confirms ALT text → upload
  const confirmUpload = async () => {
    if (!pendingFile) return;
    if (!altDraft.trim()) {
      toast({ tone: "error", title: "ALT text is required", description: "Describe the image for SEO and screen readers." });
      return;
    }
    setUploading(true);
    setShowAltPrompt(false);
    try {
      // Use proxy upload via backend
      const form = new FormData();
      form.append("file", pendingFile);
      form.append("kind", kind);
      form.append("scope", scope ?? "general");
      form.append("role", "photo");
      form.append("category", kind);
      if (scope) form.append("folder", scope);
      if (altDraft.trim()) form.append("altText", altDraft.trim());

      const res = await fetch(`${API_BASE}/admin/media/upload`, {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: form,
      });

      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      const completeResJson = (await res.json()) as ApiSuccess<UploadedMediaAsset>;
      if (!completeResJson.success) throw new Error("Upload failed");

      const asset = completeResJson.data;
      onChange(asset);
      setOpen(false);
      toast({ tone: "success", title: "Media uploaded" });
    } catch (error) {
      toast({
        tone: "error",
        title: "Could not upload media",
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setUploading(false);
      setPendingFile(null);
    }
  };

  const dialog =
    open && mounted
      ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Media library"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          >
            <div className="card flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] px-5 py-4">
                <div>
                  <h2 className="font-serif text-xl">Media Library</h2>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Select an existing asset or upload a new one with ALT text.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  className="cursor-pointer rounded-lg p-1.5 hover:bg-[var(--color-surface-alt)]"
                  onClick={() => setOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>

              {/* ALT Text Prompt overlay (shown after file pick) */}
              {showAltPrompt && pendingFile && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
                  <div className="card w-full max-w-sm p-6 shadow-2xl">
                    <h3 className="mb-1 font-serif text-lg">Add ALT Text</h3>
                    <p className="mb-3 text-xs text-[var(--color-text-muted)]">
                      Required for SEO and accessibility. Describe what's in <strong>{pendingFile.name}</strong>.
                    </p>
                    <textarea
                      className="input w-full resize-none text-sm"
                      rows={3}
                      placeholder="e.g. Bride and groom cutting a three-tier wedding cake…"
                      value={altDraft}
                      onChange={(e) => setAltDraft(e.target.value)}
                      maxLength={250}
                      autoFocus
                    />
                    <p className="mt-0.5 text-right text-[10px] text-[var(--color-text-muted)]">{altDraft.length}/250</p>
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => { setShowAltPrompt(false); setPendingFile(null); }}
                        className="btn btn-ghost px-4 py-2 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={confirmUpload}
                        disabled={!altDraft.trim()}
                        className="btn btn-primary px-4 py-2 text-sm disabled:opacity-50"
                      >
                        Upload
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border-soft)] px-5 py-3">
                {/* Upload button */}
                <input
                  ref={fileInput}
                  type="file"
                  className="hidden"
                  accept="image/*,video/*,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onFileSelected(file);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  className="btn btn-primary px-3 py-1.5 text-xs"
                  disabled={uploading}
                  onClick={() => fileInput.current?.click()}
                >
                  <Upload size={13} /> {uploading ? "Uploading…" : "Upload new"}
                </button>

                {/* Search */}
                <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-[var(--color-border-soft)] px-2.5 py-1.5">
                  <Search size={13} className="shrink-0 text-[var(--color-text-muted)]" />
                  <input
                    type="text"
                    className="flex-1 bg-transparent text-sm outline-none"
                    placeholder="Search alt text or filename…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button type="button" onClick={() => setSearch("")}>
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Category tabs */}
              <div className="flex gap-1 overflow-x-auto border-b border-[var(--color-border-soft)] px-5 py-2">
                <button
                  type="button"
                  onClick={() => setFilterCategory("")}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterCategory === "" ? "bg-[var(--color-mocha)] text-white" : "bg-[var(--color-surface-alt)] text-[var(--color-charcoal)]"}`}
                >
                  All
                </button>
                {MEDIA_CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFilterCategory(opt.value)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterCategory === opt.value ? "bg-[var(--color-mocha)] text-white" : "bg-[var(--color-surface-alt)] text-[var(--color-charcoal)]"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-y-auto p-5">
                {loading ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="skeleton aspect-video rounded-lg" />
                    ))}
                  </div>
                ) : items.length === 0 ? (
                  <p className="text-center text-sm text-[var(--color-text-muted)]">
                    No media found. Upload the first file.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {items.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => { onChange(item); setOpen(false); }}
                        className="group overflow-hidden rounded-lg border border-[var(--color-border-soft)] text-left transition-all hover:border-[var(--color-mocha)] hover:shadow-md cursor-pointer"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.url}
                          alt={item.altText ?? ""}
                          className="aspect-video w-full object-cover transition-transform duration-200 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="p-2 space-y-1">
                          <span className="block truncate text-xs font-medium text-[var(--color-charcoal)]">
                            {item.altText || <span className="italic text-amber-600">No ALT</span>}
                          </span>
                          <MediaCategoryBadge category={item.category} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="input flex min-h-10 w-full items-center gap-2 text-left cursor-pointer"
      >
        {value?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.url} alt={value.altText ?? ""} className="h-7 w-10 rounded object-cover" />
        ) : (
          <ImagePlus size={16} />
        )}
        <span className="truncate">
          {value?.url
            ? value.altText
              ? `${value.altText.slice(0, 40)}${value.altText.length > 40 ? "…" : ""}`
              : "Change image"
            : "Choose from media library"}
        </span>
      </button>
      {dialog}
    </>
  );
}
