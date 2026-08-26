"use client";

import { Check } from "lucide-react";
import type { RegistryReadiness } from "@/lib/shop-types";

/**
 * Shared readiness checklist used by both the Publish panel and the guided
 * setup Review/Publish steps, so "what's left" always means the same thing
 * everywhere in the product.
 */
export function ReadinessChecklist({
  readiness,
  onJumpTo,
}: {
  readiness: RegistryReadiness;
  onJumpTo?: (key: string) => void;
}) {
  return (
    <ul className="space-y-2.5" role="list">
      {readiness.checklist.map((item) => (
        <li
          key={item.key}
          className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
            item.done
              ? "border-green-200 bg-green-50/60"
              : item.required
                ? "border-mocha/25 bg-mocha/5"
                : "border-border-light bg-cream/50"
          }`}
        >
          <span
            aria-hidden="true"
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
              item.done ? "bg-green-600 text-white" : "border-2 border-text-light/40 text-transparent"
            }`}
          >
            {item.done ? <Check size={12} strokeWidth={3} /> : ""}
          </span>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold ${item.done ? "text-charcoal" : "text-charcoal"}`}>
              {item.label}
              {!item.required && <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-text-light">Optional</span>}
            </p>
            <p className="text-xs text-text-muted mt-0.5">{item.description}</p>
          </div>
          {!item.done && onJumpTo && (
            <button
              type="button"
              onClick={() => onJumpTo(item.key)}
              className="shrink-0 text-xs font-bold text-mocha hover:text-mocha-dark cursor-pointer self-center"
            >
              Fix
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
