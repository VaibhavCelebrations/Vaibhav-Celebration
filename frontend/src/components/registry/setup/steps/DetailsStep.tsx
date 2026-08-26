"use client";

import { useState } from "react";
import { Loader2, Info } from "lucide-react";
import * as shopApi from "@/lib/shop-api";
import { friendlyAuthError } from "@/lib/customer-auth-api";
import type { ShippingAddress } from "@/lib/shop-types";
import type { StepProps } from "../types";

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-border-light bg-surface text-charcoal text-sm placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-mocha/30 focus:border-mocha transition-all";

const EMPTY_ADDRESS: ShippingAddress = { fullName: "", line1: "", line2: "", city: "", state: "", pincode: "", country: "India" };

function Field({
  label,
  hint,
  required,
  error,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-bold text-charcoal mb-1 flex items-center gap-1">
        {label}
        {required && <span className="text-mocha">*</span>}
      </label>
      {hint && <p className="text-[11px] text-text-muted mb-1.5">{hint}</p>}
      {children}
      {error && <p className="text-[11px] text-red-600 font-medium mt-1">{error}</p>}
    </div>
  );
}

export function DetailsStep({ registry, onUpdated, goNext, goBack }: StepProps) {
  const [title, setTitle] = useState(registry.title ?? "");
  const [ownerDisplayName, setOwnerDisplayName] = useState(registry.ownerDisplayName ?? "");
  const [occasion, setOccasion] = useState(registry.occasion ?? "Birthday");
  const [eventDate, setEventDate] = useState(registry.eventDate?.slice(0, 10) ?? "");
  const [celebrationDetails, setCelebrationDetails] = useState(registry.celebrationDetails ?? "");
  const [address, setAddress] = useState<ShippingAddress>(
    registry.shippingAddress
      ? {
          fullName: registry.shippingAddress.recipientName ?? "",
          line1: registry.shippingAddress.line1 ?? "",
          line2: registry.shippingAddress.line2 ?? "",
          city: registry.shippingAddress.city ?? "",
          state: registry.shippingAddress.state ?? "",
          pincode: registry.shippingAddress.pincode ?? "",
          country: registry.shippingAddress.country ?? "India",
        }
      : EMPTY_ADDRESS,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const validate = () => {
    const next: Record<string, string> = {};
    if (!title.trim() && !ownerDisplayName.trim()) next.title = "Add a registry title or a recipient name";
    if (!eventDate) next.eventDate = "Add the event date so guests know when to celebrate";
    if (!address.fullName.trim() || !address.line1.trim() || !address.city.trim() || !address.state.trim() || !address.pincode.trim()) {
      next.address = "Complete the delivery address so gifts reach you";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleContinue = async () => {
    if (!validate()) {
      setFormError("Please complete the required fields below before continuing.");
      return;
    }
    setFormError("");
    setIsSaving(true);
    try {
      const updated = await shopApi.updateMyRegistry(registry.id, {
        title: title.trim() || undefined,
        ownerDisplayName: ownerDisplayName.trim() || undefined,
        childOrPersonName: ownerDisplayName.trim() || undefined,
        occasion: occasion.trim() || undefined,
        eventDate: eventDate || null,
        celebrationDetails: celebrationDetails.trim() || undefined,
        shippingAddress: address,
      });
      onUpdated({ ...registry, ...updated });
      goNext();
    } catch (err) {
      setFormError(friendlyAuthError(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-step-in space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-mocha">Step 1 of 4</p>
        <h1 className="font-display text-2xl font-bold text-charcoal mt-1">Registry details</h1>
        <p className="text-text-muted text-sm mt-1">This is what guests will see first when they open your registry.</p>
      </div>

      {formError && (
        <div role="alert" className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
          {formError}
        </div>
      )}

      <section className="bg-surface rounded-2xl border border-border-light p-5 space-y-4">
        <h2 className="text-sm font-bold text-charcoal">About the celebration</h2>
        <Field label="Registry title" required error={errors.title} hint="Shown as the headline of your registry.">
          <input
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Aarav's 5th Birthday"
          />
        </Field>
        <Field label="Recipient / host name" hint="Whose celebration is this?">
          <input className={inputClass} value={ownerDisplayName} onChange={(e) => setOwnerDisplayName(e.target.value)} placeholder="e.g. Aarav Sharma" />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Occasion" hint="Helps guests understand the celebration.">
            <input className={inputClass} value={occasion} onChange={(e) => setOccasion(e.target.value)} placeholder="Birthday, Baby Shower…" />
          </Field>
          <Field label="Event date" required error={errors.eventDate}>
            <input type="date" className={inputClass} value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Message to guests" hint="A short, personal note — optional but recommended.">
          <textarea
            className={inputClass}
            rows={3}
            value={celebrationDetails}
            onChange={(e) => setCelebrationDetails(e.target.value)}
            placeholder="We'd love your presence — and a little something from this list if you wish to gift."
          />
        </Field>
      </section>

      <section id="address" className="bg-surface rounded-2xl border border-border-light p-5 space-y-4">
        <div className="flex items-start gap-2">
          <h2 className="text-sm font-bold text-charcoal">Delivery address</h2>
        </div>
        <div className="flex items-start gap-2 rounded-xl bg-mocha/5 border border-mocha/15 p-3">
          <Info size={14} className="text-mocha mt-0.5 shrink-0" />
          <p className="text-[11px] text-text-muted leading-relaxed">
            Gifts guests buy from our shop are shipped directly here — it&apos;s required before you can publish.
          </p>
        </div>
        {errors.address && <p className="text-[11px] text-red-600 font-medium">{errors.address}</p>}
        <input className={inputClass} value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} placeholder="Recipient name" aria-label="Recipient name" />
        <input className={inputClass} value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} placeholder="House / flat, building" aria-label="Address line 1" />
        <input className={inputClass} value={address.line2 ?? ""} onChange={(e) => setAddress({ ...address, line2: e.target.value })} placeholder="Street / area (optional)" aria-label="Address line 2" />
        <div className="grid grid-cols-2 gap-3">
          <input className={inputClass} value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} placeholder="City" aria-label="City" />
          <input className={inputClass} value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} placeholder="State" aria-label="State" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input className={inputClass} value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value })} placeholder="PIN code" aria-label="PIN code" />
          <input className={inputClass} value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })} placeholder="Country" aria-label="Country" />
        </div>
      </section>

      <div className="flex items-center justify-between pt-2">
        <button type="button" onClick={goBack} className="text-sm font-semibold text-text-muted hover:text-charcoal cursor-pointer">
          Back
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={() => void handleContinue()}
          className="btn-primary px-8 py-3 text-sm font-bold uppercase tracking-wider disabled:opacity-60"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : "Continue"}
        </button>
      </div>
    </div>
  );
}
