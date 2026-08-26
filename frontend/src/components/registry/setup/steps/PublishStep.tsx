"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, CheckCircle2, Copy, ExternalLink, Loader2, PartyPopper, Sparkles } from "lucide-react";
import * as shopApi from "@/lib/shop-api";
import { friendlyAuthError } from "@/lib/customer-auth-api";
import { useToast } from "@/components/ui/Toast";
import { ApiClientError } from "@/lib/api-client";
import { ReadinessChecklist } from "@/components/registry/ReadinessChecklist";
import type { StepProps } from "../types";

export function PublishStep({ registry, onUpdated, goBack, goTo }: StepProps) {
  const { push } = useToast();
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const readiness = registry.readiness;
  const isReady = readiness?.isReady ?? false;
  const isPublished = registry.status === "ACTIVE";

  const publish = async () => {
    setIsPublishing(true);
    setError("");
    try {
      const updated = await shopApi.updateMyRegistry(registry.id, { status: "ACTIVE" });
      onUpdated({ ...registry, ...updated });
      push("Your Gift Registry is live 🎉", "success");
    } catch (err) {
      const missing =
        err instanceof ApiClientError && Array.isArray((err.details as { missing?: string[] })?.missing)
          ? (err.details as { missing: string[] }).missing
          : null;
      setError(missing ? `Almost there — ${missing.join(", ")}.` : friendlyAuthError(err));
    } finally {
      setIsPublishing(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard?.writeText(registry.shareUrl);
    setCopied(true);
    push("Registry link copied", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  if (isPublished) {
    return (
      <div className="animate-step-in space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-green-100 text-green-700">
          <PartyPopper size={28} />
        </div>
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-charcoal">Your Gift Registry is Live 🎉</h1>
          <p className="text-text-muted text-sm mt-2 max-w-md mx-auto">
            Share the link below with your guests — they can view it and send gifts straight to your door.
          </p>
        </div>

        <div className="max-w-md mx-auto flex items-center gap-2 rounded-xl border border-border-light bg-surface px-4 py-3">
          <code className="min-w-0 flex-1 truncate text-xs text-charcoal">{registry.shareUrl}</code>
          <button type="button" onClick={() => void copyLink()} className="shrink-0 text-mocha hover:text-mocha-dark cursor-pointer" aria-label="Copy link">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <a href={registry.shareUrl} target="_blank" rel="noreferrer" className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wider">
            <ExternalLink size={15} /> View Registry
          </a>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`You're invited to ${registry.title}'s gift registry! ${registry.shareUrl}`)}`}
            target="_blank"
            rel="noreferrer"
            className="btn-outline inline-flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wider"
          >
            Share on WhatsApp
          </a>
        </div>
        <Link href={`/account/registry/${registry.id}`} className="inline-block text-sm font-semibold text-mocha hover:text-mocha-dark">
          Manage registry
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-step-in space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-mocha">Step 6 of 6</p>
        <h1 className="font-display text-2xl font-bold text-charcoal mt-1">
          {isReady ? "Your Gift Registry is ready" : "A few things still need attention"}
        </h1>
        <p className="text-text-muted text-sm mt-1">
          Publishing makes your registry available at its link so you can share it with the people you choose.
        </p>
      </div>

      {readiness && <ReadinessChecklist readiness={readiness} onJumpTo={(key) => goTo(key === "items" ? "products" : "details")} />}

      {error && (
        <div role="alert" className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button type="button" onClick={goBack} className="text-sm font-semibold text-text-muted hover:text-charcoal cursor-pointer">
          Back
        </button>
        <button
          type="button"
          disabled={!isReady || isPublishing}
          onClick={() => void publish()}
          className="btn-primary inline-flex items-center gap-2 px-8 py-3.5 text-sm font-bold uppercase tracking-wider disabled:opacity-50"
        >
          {isPublishing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {isPublishing ? "Publishing…" : "Publish Gift Registry"}
        </button>
      </div>
      {!isReady && (
        <p className="text-xs text-text-light flex items-center gap-1.5">
          <CheckCircle2 size={13} /> Complete the required items above to unlock publishing.
        </p>
      )}
    </div>
  );
}
