"use client";

import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type ToastTone = "success" | "error" | "warning" | "info";

type Toast = {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
};

type PushToast = (toast: Omit<Toast, "id">) => void;

const ToastCtx = createContext<PushToast | null>(null);

const TONE_ICON: Record<ToastTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const TONE_COLOR: Record<ToastTone, string> = {
  success: "var(--color-success)",
  error: "var(--color-error)",
  warning: "var(--color-warning)",
  info: "var(--color-info)",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const push = useCallback<PushToast>((toast) => {
    counter.current += 1;
    const id = `toast_${counter.current}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div
        className="fixed bottom-4 right-4 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
        style={{ zIndex: "var(--z-toast)" as string }}
      >
        {toasts.map((t) => {
          const Icon = TONE_ICON[t.tone];
          return (
            <div
              key={t.id}
              role="status"
              className="card flex items-start gap-2.5 p-3 shadow-(--shadow-elevated)"
            >
              <Icon size={18} strokeWidth={1.75} style={{ color: TONE_COLOR[t.tone], flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-(--color-charcoal)">{t.title}</p>
                {t.description && <p className="mt-0.5 text-xs text-(--color-text-muted)">{t.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="shrink-0 cursor-pointer text-(--color-text-muted) hover:text-(--color-charcoal)"
              >
                <X size={14} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(): PushToast {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
