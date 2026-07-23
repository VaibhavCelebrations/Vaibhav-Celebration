"use client";

import { useCallback, useEffect, useId, useRef, type MouseEventHandler, type RefObject } from "react";

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

type UseDismissableOptions = {
  open: boolean;
  onClose: () => void;
  closeOnBackdrop?: boolean;
};

type UseDismissableResult = {
  containerRef: RefObject<HTMLDivElement | null>;
  titleId: string;
  onBackdropMouseDown: MouseEventHandler;
};

/** Shared a11y engine for AdminDrawerForm + AdminConfirmDialog: ESC-close, focus trap, initial focus, focus restore, body scroll lock. */
export function useDismissable({ open, onClose, closeOnBackdrop = true }: UseDismissableOptions): UseDismissableResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Keep onClose in a ref so the effect doesn't re-run (and re-steal focus)
  // every time the callback identity changes — which happens on every render
  // because requestClose captures mutable state like `dirty`.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement;
    const container = containerRef.current;
    const focusable = container?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    focusable?.[0]?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !container) return;
      const nodes = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (nodes.length === 0) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  const onBackdropMouseDown: MouseEventHandler = useCallback((e) => {
    if (closeOnBackdrop && e.target === e.currentTarget) onCloseRef.current();
  }, [closeOnBackdrop]);

  return { containerRef, titleId, onBackdropMouseDown };
}
