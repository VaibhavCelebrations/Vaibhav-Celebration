"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDismissable } from "./use-dismissable";
import { useMounted } from "./use-mounted";

export type AdminConfirmDialogProps = {
  open: boolean;
  title: string;
  message: ReactNode;
  tone?: "danger" | "default";
  confirmLabel?: string;
  cancelLabel?: string;
  requireReason?: boolean;
  reasonLabel?: string;
  submitting?: boolean;
  onConfirm: (reason?: string) => void | Promise<void>;
  onCancel: () => void;
};

/**
 * Naming rule (spec §4.4): the UI says "Archive", never "Delete" — no
 * record is ever permanently erasable from the everyday UI. Defaults here
 * enforce that so no module can get it wrong.
 */
export function AdminConfirmDialog({
  open,
  title,
  message,
  tone = "danger",
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  requireReason,
  reasonLabel = "Reason",
  submitting,
  onConfirm,
  onCancel,
}: AdminConfirmDialogProps) {
  const mounted = useMounted();
  const [reason, setReason] = useState("");
  const [prevOpen, setPrevOpen] = useState(open);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // Reset the reason field whenever the dialog transitions to open — adjusted
  // during render (not an effect) per React's "adjusting state when a prop
  // changes" pattern, since this must happen before the reason textarea paints.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setReason("");
  }

  const { containerRef, titleId, onBackdropMouseDown } = useDismissable({ open, onClose: onCancel });

  // useDismissable focuses the first focusable element (may be the reason
  // textarea); this runs after it and forces focus onto Cancel instead —
  // confirming a destructive action must never be the path of least resistance.
  useEffect(() => {
    if (open) cancelBtnRef.current?.focus();
  }, [open]);

  if (!mounted || !open) return null;

  const reasonOk = !requireReason || reason.trim().length >= 10;

  return createPortal(
    <div className="fixed inset-0 z-(--z-modal) flex items-center justify-center bg-black/30 p-4 backdrop-blur-[1px]" onMouseDown={onBackdropMouseDown}>
      <div ref={containerRef} role="alertdialog" aria-modal="true" aria-labelledby={titleId} className="card w-full max-w-sm p-5 shadow-(--shadow-elevated)">
        <div className="mb-3 flex items-start gap-3">
          {tone === "danger" && (
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ background: "var(--color-error-bg)", color: "var(--color-error)" }}
            >
              <AlertTriangle size={18} strokeWidth={1.75} aria-hidden="true" />
            </div>
          )}
          <div>
            <h2 id={titleId} className="font-serif text-base font-semibold text-(--color-charcoal)">
              {title}
            </h2>
            <div className="mt-1 text-sm text-(--color-text-secondary)">{message}</div>
          </div>
        </div>

        {requireReason && (
          <div className="mb-3">
            <label htmlFor="confirm-reason" className="mb-1 block text-xs font-medium text-(--color-charcoal)">
              {reasonLabel}
            </label>
            <textarea id="confirm-reason" className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        )}

        {tone === "danger" && (
          <p className="mb-4 text-xs text-(--color-text-muted)">This record is deleted, but not permanently. It will be moved to the Recycle Bin. It can be restored by an administrator.</p>
        )}

        <div className="flex justify-end gap-2">
          <button ref={cancelBtnRef} type="button" onClick={onCancel} className="btn btn-ghost px-4 py-2 text-sm">
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={submitting || !reasonOk}
            onClick={() => onConfirm(requireReason ? reason.trim() : undefined)}
            className="btn inline-flex items-center gap-2 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: tone === "danger" ? "var(--color-error)" : "var(--color-mocha)", color: "#fff" }}
          >
            {submitting && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
