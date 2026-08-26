"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileEdit, Gift, Loader2, Sparkles } from "lucide-react";
import * as shopApi from "@/lib/shop-api";
import { friendlyAuthError } from "@/lib/customer-auth-api";
import { notifyRegistryAccessChanged } from "@/hooks/useRegistryAccess";
import type { GiftRegistryUpgradeState, OrderDto, ShippingAddress } from "@/lib/shop-types";

type Props = {
  order: OrderDto;
};

function eventChildName(order: OrderDto): string {
  const details = order.eventDetails;
  if (!details || typeof details !== "object") return "";
  const name = details.childName;
  return typeof name === "string" ? name : "";
}

export function GiftRegistryOrderCard({ order }: Props) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const state: GiftRegistryUpgradeState | null | undefined = order.giftRegistry;

  if (!state?.eligible) return null;

  /* ── Registry already exists ─────────────────────────────────────── */
  if (state.registryId) {
    const status = state.registryStatus;
    const isPublished = status === "ACTIVE";
    const isDraft = status === "DRAFT" || !status;

    return (
      <div className="bg-surface rounded-2xl border border-border-light p-6 shadow-soft">
        <div className="flex items-start gap-3">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              isPublished ? "bg-green-100 text-green-700" : "bg-mocha/10 text-mocha"
            }`}
          >
            {isPublished ? <CheckCircle2 size={20} /> : <Gift size={20} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display text-lg font-bold text-charcoal">Gift Registry</h3>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                  isPublished ? "bg-green-100 text-green-700" : isDraft ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-600"
                }`}
              >
                {isPublished ? "Published" : isDraft ? "Draft" : status}
              </span>
            </div>
            <p className="text-sm text-text-muted mt-1">
              {isPublished
                ? state.registryTitle
                  ? `${state.registryTitle} is live and ready to share with guests.`
                  : "Your registry is live and ready to share with guests."
                : "Your registry is saved as a draft. Finish setup to share it with guests."}
            </p>
            <button
              type="button"
              onClick={() => router.push(isDraft ? `/account/registry/${state.registryId}/setup` : `/account/registry/${state.registryId}`)}
              className="btn-primary mt-4 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold"
            >
              {isDraft ? <><FileEdit size={15} /> Continue Setup</> : "Manage Registry"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Not created yet — guided entry point ────────────────────────── */
  const address = order.shippingAddress as ShippingAddress;

  const startGuidedSetup = async () => {
    setIsCreating(true);
    setError("");
    try {
      const childName = eventChildName(order);
      const registry = await shopApi.createRegistry({
        sourceOrderCode: order.orderCode,
        title: childName ? `${childName}'s ${order.package?.themeTitle ?? "celebration"}` : order.package ? `${order.package.themeTitle} registry` : undefined,
        ownerDisplayName: childName || address?.fullName || undefined,
        childOrPersonName: childName || address?.fullName || undefined,
        eventDate: order.eventDate ?? undefined,
        shippingAddress: address,
        visibility: "UNLISTED",
      });
      notifyRegistryAccessChanged();
      router.push(`/account/registry/${registry.id}/setup`);
    } catch (err) {
      setError(friendlyAuthError(err));
      setIsCreating(false);
    }
  };

  return (
    <div className="relative overflow-hidden bg-surface rounded-2xl border border-mocha/25 p-6 shadow-soft">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-mocha/10 flex items-center justify-center shrink-0">
          <Gift size={20} className="text-mocha" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-mocha">Included with this package</p>
          <h3 className="font-display text-lg font-bold text-charcoal mt-1">Your Gift Registry is included</h3>
          <p className="text-sm text-text-muted mt-1">
            Gift Registry comes with this Signature or Grand celebration. We&apos;ll guide you through telling us who it&apos;s for, adding
            gifts, and sharing it with your guests — takes about 3–5 minutes.
          </p>
          {error && <p className="text-xs text-red-600 font-medium mt-2">{error}</p>}
          <button
            type="button"
            disabled={isCreating}
            onClick={() => void startGuidedSetup()}
            className="btn-primary mt-4 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {isCreating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {isCreating ? "Setting up…" : "Start Guided Setup"}
          </button>
        </div>
      </div>
    </div>
  );
}
