"use client";

import { CheckCircle2, CloudUpload, FileImage, Loader2, X, XCircle } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "./Toast";

export type MediaPrefixKind =
  | "gallery"
  | "themes"
  | "blog"
  | "events"
  | "products"
  | "popups"
  | "media"
  | "users"
  | "invoices";

export const MEDIA_CATEGORY_OPTIONS: { value: MediaPrefixKind; label: string }[] = [
  { value: "gallery", label: "Gallery" },
  { value: "themes", label: "Themes" },
  { value: "blog", label: "Blog" },
  { value: "events", label: "Events" },
  { value: "products", label: "Products" },
  { value: "popups", label: "Popups" },
  { value: "media", label: "General Media" },
  { value: "users", label: "Users" },
  { value: "invoices", label: "Invoices" },
];

export type UploadedMediaAsset = {
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

type FileEntry = {
  id: string;
  file: File;
  preview: string;
  altText: string;
  category: MediaPrefixKind;
  folder: string;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
  result?: UploadedMediaAsset;
};

type Props = {
  open: boolean;
  onClose: () => void;
  defaultCategory?: MediaPrefixKind;
  onUploaded: (assets: UploadedMediaAsset[]) => void;
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

async function presignAndUpload(entry: FileEntry, onProgress: (p: number) => void): Promise<UploadedMediaAsset> {
  // Step 1: Presign
  onProgress(5);
  const presignRes = await fetch(`${API_BASE}/admin/media/presign`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({
      kind: entry.category,
      scope: entry.folder || "general",
      role: "photo",
      fileName: entry.file.name,
      contentType: entry.file.type,
      altText: entry.altText.trim() || null,
      category: entry.category,
      folder: entry.folder || null,
    }),
  });
  if (!presignRes.ok) {
    const err = (await presignRes.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? "Failed to get upload URL");
  }
  const presign = (await presignRes.json()) as {
    data: {
      uploadUrl: string;
      cdnKey: string;
      publicUrl: string;
      headers: Record<string, string>;
      r2Enabled: boolean;
    };
  };
  const { uploadUrl, cdnKey, publicUrl, headers: putHeaders } = presign.data;
  onProgress(15);

  // Step 2: PUT directly to R2 (or local fallback endpoint)
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { ...putHeaders, ...getAuthHeaders() },
    body: entry.file,
  });
  if (!putRes.ok) throw new Error(`Upload to storage failed (${putRes.status})`);
  onProgress(80);

  // Step 3: Register with backend
  const completeRes = await fetch(`${API_BASE}/admin/media/complete`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({
      cdnKey,
      contentType: entry.file.type,
      altText: entry.altText.trim() || null,
      category: entry.category,
      folder: entry.folder || null,
      sizeBytes: entry.file.size,
      url: publicUrl,
    }),
  });
  if (!completeRes.ok) {
    const err = (await completeRes.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? "Failed to register asset");
  }
  const complete = (await completeRes.json()) as { data: UploadedMediaAsset };
  onProgress(100);
  return complete.data;
}

export function UploadDialog({ open, onClose, defaultCategory = "gallery", onUploaded }: Props) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files).filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/") || f.type === "application/pdf");
      if (arr.length === 0) {
        toast({ tone: "error", title: "Only images, video, and PDF files are allowed" });
        return;
      }
      setEntries((prev) => [
        ...prev,
        ...arr.map((file) => ({
          id: crypto.randomUUID(),
          file,
          preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
          altText: "",
          category: defaultCategory,
          folder: "",
          status: "pending" as const,
          progress: 0,
        })),
      ]);
    },
    [defaultCategory, toast],
  );

  const removeEntry = (id: string) => {
    setEntries((prev) => {
      const e = prev.find((x) => x.id === id);
      if (e?.preview) URL.revokeObjectURL(e.preview);
      return prev.filter((x) => x.id !== id);
    });
  };

  const patchEntry = (id: string, patch: Partial<FileEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const pendingEntries = entries.filter((e) => e.status === "pending");
  const allDone = entries.length > 0 && entries.every((e) => e.status === "done" || e.status === "error");
  const anyUploading = entries.some((e) => e.status === "uploading");

  const hasUnfilledAlt = pendingEntries.some((e) => !e.altText.trim());

  const startUpload = async () => {
    const toUpload = entries.filter((e) => e.status === "pending");
    for (const entry of toUpload) {
      patchEntry(entry.id, { status: "uploading", progress: 0 });
      try {
        const result = await presignAndUpload(entry, (p) => patchEntry(entry.id, { progress: p }));
        patchEntry(entry.id, { status: "done", progress: 100, result });
      } catch (err) {
        patchEntry(entry.id, {
          status: "error",
          error: err instanceof Error ? err.message : "Upload failed",
        });
      }
    }
  };

  const handleConfirm = async () => {
    if (hasUnfilledAlt) {
      toast({ tone: "error", title: "ALT text is required for all images", description: "Fill in ALT text for every file before uploading." });
      return;
    }
    await startUpload();
  };

  const handleDone = () => {
    const uploaded = entries.filter((e) => e.status === "done" && e.result).map((e) => e.result!);
    onUploaded(uploaded);
    setEntries([]);
    onClose();
  };

  const handleClose = () => {
    if (anyUploading) return;
    entries.forEach((e) => { if (e.preview) URL.revokeObjectURL(e.preview); });
    setEntries([]);
    onClose();
  };

  if (!open) return null;

  const dialog = createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Upload media"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !anyUploading) handleClose(); }}
    >
      <div className="card flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] px-6 py-4">
          <div>
            <h2 className="font-serif text-xl text-[var(--color-charcoal)]">Upload Media</h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Fill in ALT text for every file — required for SEO and accessibility.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            disabled={anyUploading}
            onClick={handleClose}
            className="cursor-pointer rounded-lg p-1.5 hover:bg-[var(--color-surface-alt)] disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Drop zone */}
          {!allDone && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                addFiles(e.dataTransfer.files);
              }}
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 transition-colors ${
                dragOver
                  ? "border-[var(--color-mocha)] bg-[var(--color-blush-light)]"
                  : "border-[var(--color-border-soft)] hover:border-[var(--color-mocha)] hover:bg-[var(--color-surface-alt)]"
              }`}
              onClick={() => fileInput.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInput.current?.click(); }}
            >
              <CloudUpload size={32} className="text-[var(--color-mocha)]" />
              <div className="text-center">
                <p className="text-sm font-medium text-[var(--color-charcoal)]">
                  Drag &amp; drop files or <span className="text-[var(--color-mocha)] underline">browse</span>
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  JPG, PNG, WebP, GIF, PDF, MP4 · Max 25 MB per file
                </p>
              </div>
              <input
                ref={fileInput}
                type="file"
                multiple
                className="hidden"
                accept="image/*,video/*,application/pdf"
                onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
              />
            </div>
          )}

          {/* File entries */}
          {entries.length > 0 && (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex gap-3 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-3"
                >
                  {/* Thumbnail */}
                  <div className="flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--color-surface-alt)]">
                    {entry.preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={entry.preview} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <FileImage size={24} className="text-[var(--color-text-muted)]" />
                    )}
                  </div>

                  {/* Fields */}
                  <div className="flex flex-1 flex-col gap-2 min-w-0">
                    <p className="truncate text-xs font-medium text-[var(--color-charcoal)]">{entry.file.name}</p>

                    {entry.status === "pending" && (
                      <>
                        {/* ALT text */}
                        <div>
                          <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                            ALT Text <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            className="input w-full text-sm"
                            placeholder="Describe the image for screen readers &amp; SEO…"
                            value={entry.altText}
                            onChange={(e) => patchEntry(entry.id, { altText: e.target.value })}
                            maxLength={250}
                          />
                          <p className="mt-0.5 text-right text-[10px] text-[var(--color-text-muted)]">
                            {entry.altText.length}/250
                          </p>
                        </div>

                        {/* Category + Folder row */}
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                              Category
                            </label>
                            <select
                              className="input w-full text-sm"
                              value={entry.category}
                              onChange={(e) => patchEntry(entry.id, { category: e.target.value as MediaPrefixKind })}
                            >
                              {MEDIA_CATEGORY_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex-1">
                            <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                              Folder <span className="font-normal normal-case">(optional)</span>
                            </label>
                            <input
                              type="text"
                              className="input w-full text-sm"
                              placeholder="e.g. royal-mandap, 2024-diwali…"
                              value={entry.folder}
                              onChange={(e) => patchEntry(entry.id, { folder: e.target.value })}
                              maxLength={80}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Progress bar */}
                    {entry.status === "uploading" && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Loader2 size={14} className="animate-spin text-[var(--color-mocha)]" />
                          <span className="text-xs text-[var(--color-text-muted)]">Uploading… {entry.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-border-soft)]">
                          <div
                            className="h-full rounded-full bg-[var(--color-mocha)] transition-all duration-200"
                            style={{ width: `${entry.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Done */}
                    {entry.status === "done" && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                        <CheckCircle2 size={14} />
                        <span>Uploaded · {entry.result?.altText ?? "no ALT"}</span>
                      </div>
                    )}

                    {/* Error */}
                    {entry.status === "error" && (
                      <div className="flex items-center gap-1.5 text-xs text-red-600">
                        <XCircle size={14} />
                        <span>{entry.error}</span>
                      </div>
                    )}
                  </div>

                  {/* Remove button (only on pending) */}
                  {(entry.status === "pending" || entry.status === "error") && (
                    <button
                      type="button"
                      aria-label="Remove"
                      onClick={() => removeEntry(entry.id)}
                      className="cursor-pointer self-start rounded-lg p-1 hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--color-border-soft)] px-6 py-4">
          <p className="text-xs text-[var(--color-text-muted)]">
            {entries.filter((e) => e.status === "done").length}/{entries.length} uploaded
          </p>
          <div className="flex gap-2">
            {!allDone ? (
              <>
                <button
                  type="button"
                  disabled={anyUploading}
                  onClick={handleClose}
                  className="btn btn-ghost px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={entries.length === 0 || anyUploading}
                  onClick={handleConfirm}
                  className="btn btn-primary px-4 py-2 text-sm disabled:opacity-50"
                >
                  {anyUploading ? (
                    <><Loader2 size={14} className="animate-spin" /> Uploading…</>
                  ) : (
                    `Upload ${entries.filter((e) => e.status === "pending").length} file${entries.filter((e) => e.status === "pending").length === 1 ? "" : "s"}`
                  )}
                </button>
              </>
            ) : (
              <button type="button" onClick={handleDone} className="btn btn-primary px-5 py-2 text-sm">
                Done — add more or close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );

  return dialog;
}
