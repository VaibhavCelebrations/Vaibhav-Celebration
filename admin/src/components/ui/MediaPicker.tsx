"use client";

import { ImagePlus, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AdminApiError, adminFetch } from "@/lib/admin-api-client";
import type { MediaRef } from "@/types/common";
import { useToast } from "./Toast";

type MediaPickerProps = {
  value?: MediaRef | null;
  onChange: (media: MediaRef | null) => void;
  kind: "themes" | "events" | "gallery" | "blog" | "popups" | "invoices" | "users" | "media";
  scope?: string;
};

type MediaItem = MediaRef & { id: string };

export function MediaPicker({ value, onChange, kind, scope }: MediaPickerProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const result = await adminFetch<{ items: MediaItem[] }>("/admin/media?page=1&pageSize=48");
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
  }, [open]);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", kind);
      if (scope) body.append("scope", scope);
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
      if (!response.ok || !json.success || !json.data)
        throw new Error(json.error?.message ?? "Upload failed");
      onChange(json.data);
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
    }
  };

  const dialog =
    open && mounted
      ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Media library"
            className="fixed inset-0 flex items-center justify-center bg-black/30 p-4"
            style={{ zIndex: 60 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div className="card max-h-[80vh] w-full max-w-4xl overflow-auto p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-xl">Media Library</h2>
                  <p className="text-sm text-(--color-text-muted)">
                    Select an asset or upload a new one.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  className="cursor-pointer p-1 rounded hover:bg-(--color-surface-alt)"
                  onClick={() => setOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-4 flex gap-2">
                <input
                  ref={fileInput}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void upload(file);
                  }}
                />
                <button
                  type="button"
                  className="btn btn-primary px-3 py-2 text-sm"
                  disabled={uploading}
                  onClick={() => fileInput.current?.click()}
                >
                  <Upload size={15} /> {uploading ? "Uploading…" : "Upload image"}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {loading ? (
                  <p className="col-span-full text-sm text-(--color-text-muted)">Loading media…</p>
                ) : items.length === 0 ? (
                  <p className="col-span-full text-sm text-(--color-text-muted)">
                    No media yet. Upload the first image.
                  </p>
                ) : (
                  items.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        onChange(item);
                        setOpen(false);
                      }}
                      className="overflow-hidden rounded border text-left hover:border-(--color-mocha) transition-colors cursor-pointer"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt={item.altText ?? ""}
                        className="aspect-video w-full object-cover"
                      />
                      <span className="block truncate p-2 text-xs">{item.altText || item.id}</span>
                    </button>
                  ))
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
        <span className="truncate">{value?.url ? "Change image" : "Choose from media library"}</span>
      </button>
      {dialog}
    </>
  );
}
