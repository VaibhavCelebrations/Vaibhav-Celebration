"use client";

import { Images, Search, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdminApiError, adminFetch } from "@/lib/admin-api-client";
import { AdminConfirmDialog } from "@/components/ui/AdminConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { TextInput } from "@/components/ui/fields";
import type { MediaRef } from "@/types/common";

type MediaItem = MediaRef & { id: string; type?: string; createdAt?: string };

export function MediaLibraryScreen() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: "1", pageSize: "48" });
      if (debouncedSearch) params.set("search", debouncedSearch);
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
  }, [debouncedSearch, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", "media");
      const token = window.localStorage.getItem("vbc_admin_access");
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1"}/admin/media/upload`,
        { method: "POST", body, credentials: "include", headers },
      );
      const json = (await response.json()) as {
        success: boolean;
        data?: MediaItem;
        error?: { message?: string };
      };
      if (!response.ok || !json.success) throw new Error(json.error?.message ?? "Upload failed");
      toast({ tone: "success", title: "Media uploaded" });
      void load();
    } catch (err) {
      toast({
        tone: "error",
        title: "Could not upload",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setUploading(false);
    }
  }

  async function onDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminFetch(`/admin/media/${deleteTarget.id}`, { method: "DELETE" });
      toast({ tone: "success", title: "Media deleted" });
      setDeleteTarget(null);
      void load();
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

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Content"
        title="Media Library"
        description="Browse, search, upload, and remove media assets."
        actions={
          <>
            <input
              ref={fileInput}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInput.current?.click()}
              className="btn btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm"
            >
              <Upload size={16} /> {uploading ? "Uploading…" : "Upload"}
            </button>
          </>
        }
      />

      <div className="mb-4 flex max-w-md items-center gap-2">
        <Search size={16} className="shrink-0 text-(--color-text-muted)" aria-hidden="true" />
        <TextInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by alt text or filename…"
          aria-label="Search media"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton aspect-video rounded-(--radius-md)" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Images}
          title="No media found"
          description={debouncedSearch ? "Try a different search term." : "Upload the first image to get started."}
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-(--color-text-muted)">{total} asset{total === 1 ? "" : "s"}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {items.map((item) => (
              <div key={item.id} className="group relative overflow-hidden rounded-(--radius-md) border border-(--color-border-soft)">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.altText ?? ""} className="aspect-video w-full object-cover" />
                <div className="p-2">
                  <p className="truncate text-xs text-(--color-charcoal)">{item.altText || item.id}</p>
                </div>
                <button
                  type="button"
                  aria-label="Delete media"
                  onClick={() => setDeleteTarget(item)}
                  className="absolute right-2 top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/90 text-(--color-error) opacity-0 shadow transition-opacity group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

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
