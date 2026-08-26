"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2, Globe, Loader2, Lock, Rocket, Sparkles, X, ExternalLink, EyeOff,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as shopApi from "@/lib/shop-api";
import { friendlyAuthError } from "@/lib/customer-auth-api";
import { useToast } from "@/components/ui/Toast";
import { ReadinessChecklist } from "./ReadinessChecklist";
import type { GiftRegistryDetailDto } from "@/lib/shop-types";
import { ApiClientError } from "@/lib/api-client";

type Props = {
  registry: GiftRegistryDetailDto;
  onUpdated: (registry: GiftRegistryDetailDto) => void;
  /** Scrolls/focuses the relevant section for a checklist item that isn't done yet. */
  onJumpTo?: (key: string) => void;
};

const SECTION_ROUTES: Record<string, string> = {
  details: "details",
  eventDate: "details",
  message: "details",
  address: "address",
  items: "gifts",
};

export function PublishPanel({ registry, onUpdated, onJumpTo }: Props) {
  const router = useRouter();
  const { push } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [unpublishOpen, setUnpublishOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [justPublished, setJustPublished] = useState(false);
  const [copied, setCopied] = useState(false);

  const readiness = registry.readiness;
  const isPublished = registry.status === "ACTIVE";
  const isClosed = registry.status === "CLOSED";
  const isExpired = registry.status === "EXPIRED";
  const isReady = readiness?.isReady ?? false;

  const jump = (key: string) => {
    if (onJumpTo) onJumpTo(SECTION_ROUTES[key] ?? key);
  };

  const doPublish = async () => {
    setIsPublishing(true);
    setPublishError("");
    try {
      const updated = await shopApi.updateMyRegistry(registry.id, { status: "ACTIVE" });
      onUpdated({ ...registry, ...updated });
      setConfirmOpen(false);
      setJustPublished(true);
      push("Your Gift Registry is live 🎉", "success");
    } catch (err) {
      const message =
        err instanceof ApiClientError && Array.isArray((err.details as { missing?: string[] })?.missing)
          ? `Almost there — ${(err.details as { missing: string[] }).missing.join(", ")} still ${
              (err.details as { missing: string[] }).missing.length === 1 ? "needs" : "need"
            } your attention.`
          : friendlyAuthError(err);
      setPublishError(message);
    } finally {
      setIsPublishing(false);
    }
  };

  const doUnpublish = async () => {
    setIsUnpublishing(true);
    try {
      const updated = await shopApi.updateMyRegistry(registry.id, { status: "DRAFT" });
      onUpdated({ ...registry, ...updated });
      setUnpublishOpen(false);
      push("Registry moved back to draft — guests can no longer view it", "default");
    } catch (err) {
      push(friendlyAuthError(err), "error");
    } finally {
      setIsUnpublishing(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard?.writeText(registry.shareUrl);
    setCopied(true);
    push("Registry link copied", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── Published state ─────────────────────────────────────────────── */
  if (isPublished) {
    return (
      <section
        id="publish"
        aria-labelledby="publish-heading"
        className="relative overflow-hidden rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-6 shadow-soft"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-100 text-green-700">
            <CheckCircle2 size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-green-700">Published</p>
            <h3 id="publish-heading" className="font-display text-xl font-bold text-charcoal mt-0.5">
              Your Gift Registry is live{justPublished ? " 🎉" : ""}
            </h3>
            <p className="text-sm text-text-muted mt-1">
              {registry.publishedAt
                ? `Live since ${new Date(registry.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}. `
                : ""}
              Guests with the link can view and gift from it now.
            </p>

            <div className="mt-4 flex items-center gap-2 rounded-xl border border-border-light bg-surface px-4 py-3">
              <code className="min-w-0 flex-1 truncate text-xs text-charcoal">{registry.shareUrl}</code>
              <button
                type="button"
                onClick={() => void copyLink()}
                className="shrink-0 text-xs font-bold uppercase tracking-wider text-mocha hover:text-mocha-dark cursor-pointer"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={registry.shareUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-light bg-surface px-4 py-2 text-xs font-bold uppercase tracking-wider text-charcoal hover:border-mocha cursor-pointer"
              >
                <ExternalLink size={13} /> View live registry
              </a>
              <button
                type="button"
                onClick={() => setUnpublishOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-light px-4 py-2 text-xs font-bold uppercase tracking-wider text-text-muted hover:border-red-300 hover:text-red-600 cursor-pointer"
              >
                <EyeOff size={13} /> Unpublish
              </button>
            </div>
          </div>
        </div>

        {unpublishOpen && (
          <ConfirmDialog
            title="Unpublish this registry?"
            tone="warning"
            confirmLabel={isUnpublishing ? "Unpublishing…" : "Yes, unpublish"}
            busy={isUnpublishing}
            onConfirm={() => void doUnpublish()}
            onCancel={() => setUnpublishOpen(false)}
          >
            <p>
              Guests will immediately lose access to <span className="font-semibold text-charcoal">{registry.shareUrl}</span> — the link will
              stop working until you publish again. Gifts already purchased are not affected.
            </p>
          </ConfirmDialog>
        )}
      </section>
    );
  }

  if (isClosed || isExpired) {
    return (
      <section className="rounded-2xl border border-border-light bg-surface p-6 shadow-soft">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-muted">{isExpired ? "Expired" : "Closed"}</p>
        <h3 className="font-display text-xl font-bold text-charcoal mt-0.5">
          {isExpired ? "This registry has expired" : "This registry is closed"}
        </h3>
        <p className="text-sm text-text-muted mt-1">
          {isExpired
            ? "Registries are open for a limited time after your celebration. Contact us if you need it reopened."
            : "It's no longer visible to guests. You can still review gifts and orders below."}
        </p>
      </section>
    );
  }

  /* ── Draft / not-yet-published state ─────────────────────────────── */
  return (
    <section id="publish" aria-labelledby="publish-heading" className="rounded-2xl border border-border-light bg-surface p-6 shadow-soft">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
            isReady ? "bg-mocha text-white" : "bg-mocha/10 text-mocha"
          }`}
        >
          <Rocket size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-mocha">Draft · Not published</p>
          <h3 id="publish-heading" className="font-display text-xl font-bold text-charcoal mt-0.5">
            {isReady ? "Your Gift Registry is ready to publish" : "Let's finish setting up your registry"}
          </h3>
          <p className="text-sm text-text-muted mt-1">
            {isReady
              ? "Publishing makes your registry available at its link so you can share it with guests."
              : "Complete the steps below, then publish to make your registry available to guests."}
          </p>
        </div>
      </div>

      {readiness && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Readiness · {readiness.completedRequired}/{readiness.totalRequired} required
            </p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-cream-dark overflow-hidden mb-4">
            <div
              className="h-full rounded-full bg-mocha transition-all duration-500"
              style={{ width: `${(readiness.completedRequired / Math.max(1, readiness.totalRequired)) * 100}%` }}
            />
          </div>
          <ReadinessChecklist readiness={readiness} onJumpTo={jump} />
        </div>
      )}

      {publishError && (
        <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
          {publishError}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {isReady ? (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wider"
          >
            <Sparkles size={16} /> Publish Gift Registry
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push(`/account/registry/${registry.id}/setup`)}
            className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wider"
          >
            Continue guided setup
          </button>
        )}
        <Link
          href={`/account/registry/${registry.id}/setup?step=preview`}
          className="text-sm font-semibold text-mocha hover:text-mocha-dark"
        >
          Preview as a guest
        </Link>
      </div>

      {confirmOpen && (
        <ConfirmDialog
          title="Publish your Gift Registry?"
          tone="primary"
          confirmLabel={isPublishing ? "Publishing…" : "Yes, publish now"}
          busy={isPublishing}
          onConfirm={() => void doPublish()}
          onCancel={() => setConfirmOpen(false)}
        >
          <p>
            Your registry link (<span className="font-semibold text-charcoal">{registry.shareUrl}</span>) will become viewable by anyone you
            share it with. You can unpublish or keep editing at any time.
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}

function ConfirmDialog({
  title,
  children,
  confirmLabel,
  busy,
  tone = "primary",
  onConfirm,
  onCancel,
}: {
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  busy: boolean;
  tone?: "primary" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-charcoal/50 p-4" onClick={onCancel} role="presentation">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-card motion-safe:animate-[fadeIn_0.15s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="absolute right-4 top-4 text-text-light hover:text-charcoal cursor-pointer"
        >
          <X size={18} />
        </button>
        <div
          className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${
            tone === "primary" ? "bg-mocha/10 text-mocha" : "bg-amber-50 text-amber-700"
          }`}
        >
          {tone === "primary" ? <Globe size={18} /> : <Lock size={18} />}
        </div>
        <h2 id="confirm-dialog-title" className="font-display text-lg font-bold text-charcoal mb-2">
          {title}
        </h2>
        <div className="text-sm text-text-muted leading-relaxed">{children}</div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button type="button" onClick={onCancel} className="text-sm font-semibold text-text-muted cursor-pointer">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold disabled:opacity-60"
          >
            {busy && <Loader2 size={14} className="animate-spin" />} {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

