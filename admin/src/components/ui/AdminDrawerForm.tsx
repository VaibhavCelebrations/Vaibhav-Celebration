"use client";

import { Loader2, X } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDismissable } from "./use-dismissable";
import { useMounted } from "./use-mounted";

export type AdminDrawerFormProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  width?: "md" | "lg";
  onSubmit: (e: FormEvent<HTMLFormElement>) => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  error?: string | null;
  dirty?: boolean;
  footerExtra?: ReactNode;
  children: ReactNode;
};

export function AdminDrawerForm({
  open,
  onClose,
  title,
  description,
  width = "md",
  onSubmit,
  submitting,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  error,
  dirty,
  footerExtra,
  children,
}: AdminDrawerFormProps) {
  const mounted = useMounted();

  function requestClose() {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    onClose();
  }

  const { containerRef, titleId, onBackdropMouseDown } = useDismissable({ open, onClose: requestClose });

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-(--z-modal) flex justify-end bg-black/30 backdrop-blur-[1px]" onMouseDown={onBackdropMouseDown}>
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex h-full w-full flex-col bg-white shadow-(--shadow-elevated) ${width === "lg" ? "sm:w-[720px]" : "sm:w-[480px]"}`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-(--color-border-soft) px-5 py-4">
          <div>
            <h2 id={titleId} className="font-serif text-lg font-semibold text-(--color-charcoal)">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-(--color-text-muted)">{description}</p>}
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-(--radius-sm) text-(--color-text-muted) hover:bg-(--color-surface-alt)"
          >
            <X size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {error && (
              <p
                role="alert"
                className="mb-4 rounded-(--radius-md) border p-3 text-sm"
                style={{ background: "var(--color-error-bg)", color: "var(--color-error)", borderColor: "var(--color-error)" }}
              >
                {error}
              </p>
            )}
            <div className="flex flex-col gap-4">{children}</div>
          </div>
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-(--color-border-soft) px-5 py-4">
            <div>{footerExtra}</div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={requestClose} className="btn btn-ghost px-4 py-2 text-sm">
                {cancelLabel}
              </button>
              <button type="submit" disabled={submitting} className="btn btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm">
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
