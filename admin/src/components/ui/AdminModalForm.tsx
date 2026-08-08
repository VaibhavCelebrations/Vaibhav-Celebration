"use client";

import { Loader2, X } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDismissable } from "./use-dismissable";
import { useMounted } from "./use-mounted";

export type AdminModalFormProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: "md" | "lg" | "xl" | "full";
  onSubmit: (e: FormEvent<HTMLFormElement>) => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  error?: string | null;
  dirty?: boolean;
  footerExtra?: ReactNode;
  children: ReactNode;
};

export function AdminModalForm({
  open,
  onClose,
  title,
  description,
  size = "lg",
  onSubmit,
  submitting,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  error,
  dirty,
  footerExtra,
  children,
}: AdminModalFormProps) {
  const mounted = useMounted();

  function requestClose() {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    onClose();
  }

  const { containerRef, titleId, onBackdropMouseDown } = useDismissable({ open, onClose: requestClose });

  if (!mounted || !open) return null;

  const sizeClass = {
    md: "w-full max-w-lg",
    lg: "w-full max-w-3xl",
    xl: "w-full max-w-5xl",
    full: "w-full max-w-[90vw]",
  }[size];

  return createPortal(
    <div
      className="fixed inset-0 z-(--z-modal) flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
      onMouseDown={onBackdropMouseDown}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`${sizeClass} flex max-h-[90vh] flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-black/5`}
        style={{ animation: "modal-in 0.18s ease" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border-soft px-6 py-5">
          <div>
            <h2 id={titleId} className="font-serif text-xl font-semibold text-(--color-charcoal)">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-(--color-text-muted)">{description}</p>}
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-sm text-(--color-text-muted) hover:bg-(--color-surface-alt) transition-colors"
          >
            <X size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={onSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {error && (
              <p
                role="alert"
                className="mb-4 rounded-md border p-3 text-sm"
                style={{ background: "var(--color-error-bg)", color: "var(--color-error)", borderColor: "var(--color-error)" }}
              >
                {error}
              </p>
            )}
            <div className="flex flex-col gap-5">{children}</div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border-soft px-6 py-4 bg-surface">
            <div>{footerExtra}</div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={requestClose} className="btn btn-ghost px-4 py-2 text-sm">
                {cancelLabel}
              </button>
              <button type="submit" disabled={submitting} className="btn btn-primary inline-flex items-center gap-2 px-5 py-2 text-sm">
                {submitting && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                {submitLabel}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
