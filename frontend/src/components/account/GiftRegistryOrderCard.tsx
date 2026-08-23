"use client";

import { useRouter } from "next/navigation";
import { Gift } from "lucide-react";
import { notifyRegistryAccessChanged } from "@/hooks/useRegistryAccess";
import { GiftRegistrySetupWizard } from "./GiftRegistrySetupWizard";
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
  const state: GiftRegistryUpgradeState | null | undefined = order.giftRegistry;

  if (!state?.eligible) return null;

  if (state.registryId) {
    return (
      <div className="bg-surface rounded-2xl border border-border-light p-6 shadow-soft">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-mocha/10 flex items-center justify-center shrink-0">
            <Gift size={20} className="text-mocha" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-bold text-charcoal">Gift Registry</h3>
            <p className="text-sm text-text-muted mt-1">
              {state.registryTitle || "Your registry is ready. Add gifts and share the link with guests."}
            </p>
            <button
              type="button"
              onClick={() => router.push(`/account/registry/${state.registryId}`)}
              className="btn-primary mt-4 px-5 py-2.5 text-sm font-semibold"
            >
              Manage registry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const address = order.shippingAddress as ShippingAddress;
  return (
    <div className="bg-surface rounded-2xl border border-mocha/20 p-6 shadow-soft space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-mocha/10 flex items-center justify-center shrink-0">
          <Gift size={20} className="text-mocha" />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-mocha">Included with this package</p>
          <h3 className="font-display text-lg font-bold text-charcoal mt-1">Set up Gift Registry</h3>
          <p className="text-sm text-text-muted mt-1">
            Gift Registry comes with this Signature or Grand celebration. Tell us who it is for, where gifts should go, and how guests will open the list.
          </p>
        </div>
      </div>
      <GiftRegistrySetupWizard
        sourceOrderCode={order.orderCode}
        defaultTitle={
          eventChildName(order)
            ? `${eventChildName(order)}'s ${order.package?.themeTitle ?? "celebration"}`
            : order.package
              ? `${order.package.themeTitle} registry`
              : ""
        }
        defaultOwnerName={eventChildName(order) || address.fullName || ""}
        defaultEventDate={order.eventDate ?? ""}
        defaultAddress={address}
        onCreated={(registry) => {
          notifyRegistryAccessChanged();
          router.push(`/account/registry/${registry.id}`);
        }}
      />
    </div>
  );
}
