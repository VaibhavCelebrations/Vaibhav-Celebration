"use client";

import { useEffect, useState } from "react";
import { Check, Truck } from "lucide-react";
import { formatPaise } from "@/lib/shop-types";

export type DeliveryProgressProps = {
  subtotalInPaise: number;
  freeShippingThresholdInPaise: number;
  shippingFeeInPaise: number;
  shippingWaived?: boolean;
  compact?: boolean;
  className?: string;
};

export function FreeDeliveryProgress({
  subtotalInPaise,
  freeShippingThresholdInPaise,
  shippingFeeInPaise,
  shippingWaived,
  compact = false,
  className = "",
}: DeliveryProgressProps) {
  const waived = shippingWaived ?? subtotalInPaise >= freeShippingThresholdInPaise;
  const remaining = Math.max(0, freeShippingThresholdInPaise - subtotalInPaise);
  const progress = freeShippingThresholdInPaise
    ? Math.min(100, Math.round((subtotalInPaise / freeShippingThresholdInPaise) * 100))
    : 100;
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    if (waived) {
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 2400);
      return () => clearTimeout(t);
    }
    setCelebrate(false);
  }, [waived]);

  if (compact) {
    return (
      <p className={`text-[10px] font-semibold uppercase tracking-wider text-mocha ${className}`}>
        <Truck size={12} className="inline mr-1 -mt-0.5" />
        {waived
          ? "Free delivery unlocked"
          : `Free delivery on orders above ${formatPaise(freeShippingThresholdInPaise)}`}
      </p>
    );
  }

  return (
    <div
      className={`rounded-xl border p-3 transition-all duration-500 ${
        waived
          ? "border-green-200 bg-green-50/80 shadow-sm"
          : "border-border-light bg-surface"
      } ${celebrate ? "ring-2 ring-green-300/60 scale-[1.01]" : ""} ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            waived ? "bg-green-600 text-white" : "bg-mocha/10 text-mocha"
          }`}
        >
          {waived ? <Check size={16} strokeWidth={3} /> : <Truck size={16} />}
        </div>
        <div className="min-w-0 flex-1">
          {waived ? (
            <p className="text-sm font-bold text-green-800">Free delivery unlocked!</p>
          ) : (
            <>
              <p className="text-sm font-semibold text-charcoal">
                Add {formatPaise(remaining)} more for <span className="text-green-700">FREE delivery</span>
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                Otherwise {formatPaise(shippingFeeInPaise)} shipping applies
              </p>
            </>
          )}
          {!waived && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream-dark">
              <div
                className="h-full rounded-full bg-mocha transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
