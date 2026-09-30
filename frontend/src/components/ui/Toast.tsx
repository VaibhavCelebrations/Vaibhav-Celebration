"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type ToastTone = "default" | "success" | "error";
type ToastItem = { id: string; message: string; tone: ToastTone };

type ToastContextValue = {
  push: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_CLASS: Record<ToastTone, string> = {
  default: "bg-ink text-white",
  success: "bg-success text-white",
  error: "bg-danger text-white",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, tone: ToastTone = "default") => {
    const text = typeof message === "string" && message.trim() ? message : "Something went wrong. Please try again.";
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setItems((prev) => [...prev, { id, message: text, tone }]);
    // Errors stay longer: they usually need to be read, not just noticed.
    window.setTimeout(
      () => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      },
      tone === "error" ? 6000 : 3500,
    );
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Top of the screen, above every drawer and modal: the cart drawer opens at the same moment
          many toasts fire, and the bottom corners belong to the floating buttons and sticky bars. */}
      <div
        className="pointer-events-none fixed inset-x-4 top-24 z-[600] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:w-full sm:max-w-sm sm:items-stretch"
        aria-live="polite"
        aria-atomic="false"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role={item.tone === "error" ? "alert" : "status"}
            className={`pointer-events-auto w-full max-w-sm rounded-xl px-4 py-3 text-sm font-medium shadow-lift animate-slide-up ${TONE_CLASS[item.tone]}`}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
