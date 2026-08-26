"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Eye, Loader2 } from "lucide-react";
import * as shopApi from "@/lib/shop-api";
import { RegistryPreviewCard } from "@/components/registry/RegistryPreviewCard";
import type { PublicRegistryDto } from "@/lib/shop-types";
import type { StepProps } from "../types";

export function PreviewStep({ registry, goNext, goBack }: StepProps) {
  const [preview, setPreview] = useState<PublicRegistryDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await shopApi.getMyRegistryPreview(registry.id);
        if (!cancelled) setPreview(data);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [registry.id]);

  return (
    <div className="animate-step-in space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-mocha">Step 5 of 6</p>
        <h1 className="font-display text-2xl font-bold text-charcoal mt-1">Preview your registry</h1>
        <p className="text-text-muted text-sm mt-1">This is exactly what guests will see once you publish.</p>
      </div>

      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 flex items-center gap-2 text-xs font-semibold text-amber-800">
        <Eye size={14} /> Preview only — this registry is not live yet.
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-mocha" />
        </div>
      ) : error || !preview ? (
        <div className="text-center py-16 bg-surface rounded-2xl border border-dashed border-border-light">
          <AlertTriangle size={28} className="mx-auto text-text-light mb-3" />
          <p className="text-sm text-text-muted">Couldn&apos;t load the preview right now. You can still continue to publish.</p>
        </div>
      ) : (
        <RegistryPreviewCard registry={preview} />
      )}

      <div className="flex items-center justify-between pt-2">
        <button type="button" onClick={goBack} className="text-sm font-semibold text-text-muted hover:text-charcoal cursor-pointer">
          Back
        </button>
        <button type="button" onClick={goNext} className="btn-primary px-8 py-3 text-sm font-bold uppercase tracking-wider">
          Looks good — continue
        </button>
      </div>
    </div>
  );
}
