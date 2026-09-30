"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** How many overlays currently hold the scroll lock, so closing one never unlocks the page under another. */
let locks = 0;
let overflowBeforeLock = "";

/**
 * Standard behaviour for anything that covers the page (modal, drawer, menu): Esc closes it, the
 * page behind does not scroll, Tab stays inside it, and focus returns to whatever opened it.
 * Attach the returned ref to the overlay's panel.
 */
export function useOverlay<T extends HTMLElement>(open: boolean, onClose: () => void): RefObject<T | null> {
  const panelRef = useRef<T>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (locks === 0) {
      overflowBeforeLock = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    locks += 1;

    // Move focus in, unless something inside already has it (e.g. an autofocused field).
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) {
      (panel.querySelector<HTMLElement>(FOCUSABLE) ?? panel).focus({ preventScroll: true });
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      locks -= 1;
      if (locks === 0) document.body.style.overflow = overflowBeforeLock;
      opener?.focus({ preventScroll: true });
    };
  }, [open]);

  return panelRef;
}
