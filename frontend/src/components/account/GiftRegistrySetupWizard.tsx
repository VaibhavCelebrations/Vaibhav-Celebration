"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import * as shopApi from "@/lib/shop-api";
import { friendlyAuthError } from "@/lib/customer-auth-api";
import type { GiftRegistryDto, RegistryVisibility, ShippingAddress } from "@/lib/shop-types";

const EMPTY_ADDRESS: ShippingAddress = {
  fullName: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
};

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-border-light bg-surface text-charcoal text-sm placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-mocha/30 focus:border-mocha transition-all";

const STEPS = ["Celebration", "Delivery", "Sharing"] as const;

type Props = {
  sourceOrderCode: string;
  defaultTitle?: string;
  defaultOwnerName?: string;
  defaultEventDate?: string;
  defaultAddress?: ShippingAddress | null;
  onCreated: (registry: GiftRegistryDto) => void;
};

export function GiftRegistrySetupWizard({
  sourceOrderCode,
  defaultTitle = "",
  defaultOwnerName = "",
  defaultEventDate = "",
  defaultAddress,
  onCreated,
}: Props) {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState(defaultTitle);
  const [ownerDisplayName, setOwnerDisplayName] = useState(defaultOwnerName);
  const [occasion, setOccasion] = useState("Birthday");
  const [eventDate, setEventDate] = useState(defaultEventDate);
  const [celebrationDetails, setCelebrationDetails] = useState("");
  const [visibility, setVisibility] = useState<RegistryVisibility>("UNLISTED");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState<ShippingAddress>(defaultAddress ?? EMPTY_ADDRESS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const validateStep = () => {
    if (step === 0 && !title.trim() && !ownerDisplayName.trim()) {
      setError("Add a registry title or the recipient's name");
      return false;
    }
    if (step === 1) {
      if (!address.fullName.trim() || !address.line1.trim() || !address.city.trim() || !address.state.trim() || !address.pincode.trim()) {
        setError("Delivery address is required so guests know where gifts should go");
        return false;
      }
    }
    if (step === 2 && visibility === "PRIVATE" && password.length < 4) {
      setError("Private registries need a password of at least 4 characters");
      return false;
    }
    setError("");
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setIsSubmitting(true);
    try {
      const registry = await shopApi.createRegistry({
        sourceOrderCode,
        title: title.trim() || undefined,
        ownerDisplayName: ownerDisplayName.trim() || undefined,
        childOrPersonName: ownerDisplayName.trim() || undefined,
        occasion: occasion.trim() || undefined,
        eventDate: eventDate || undefined,
        celebrationDetails: celebrationDetails.trim() || undefined,
        visibility,
        password: visibility === "PRIVATE" ? password : undefined,
        shippingAddress: address,
      });
      onCreated(registry);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border-light bg-cream/60 p-5 space-y-5">
      <ol className="flex gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex-1">
            <p className={`text-[10px] font-bold uppercase tracking-wider ${i === step ? "text-mocha" : i < step ? "text-charcoal" : "text-text-light"}`}>
              {i + 1}. {label}
            </p>
            <div className={`mt-1 h-1 rounded-full ${i <= step ? "bg-mocha" : "bg-border-light"}`} />
          </li>
        ))}
      </ol>

      {error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">{error}</div>}

      {step === 0 && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-charcoal mb-1 block" htmlFor="wiz-title">Registry title</label>
            <input id="wiz-title" className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Aarav's 5th Birthday" />
          </div>
          <div>
            <label className="text-xs font-semibold text-charcoal mb-1 block" htmlFor="wiz-owner">Recipient / host name</label>
            <input id="wiz-owner" className={inputClass} value={ownerDisplayName} onChange={(e) => setOwnerDisplayName(e.target.value)} placeholder="Aarav Sharma" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-charcoal mb-1 block" htmlFor="wiz-occasion">Occasion</label>
              <input id="wiz-occasion" className={inputClass} value={occasion} onChange={(e) => setOccasion(e.target.value)} placeholder="Birthday" />
            </div>
            <div>
              <label className="text-xs font-semibold text-charcoal mb-1 block" htmlFor="wiz-date">Event date</label>
              <input id="wiz-date" type="date" className={inputClass} value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-charcoal mb-1 block" htmlFor="wiz-msg">Message to guests</label>
            <textarea id="wiz-msg" className={inputClass} rows={3} value={celebrationDetails} onChange={(e) => setCelebrationDetails(e.target.value)} placeholder="We would love your presence — and a little something from this list if you wish to gift." />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-xs text-text-muted">Gifts purchased from your registry will be sent to this address.</p>
          <input className={inputClass} value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} placeholder="Recipient name" />
          <input className={inputClass} value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} placeholder="House / flat, building" />
          <input className={inputClass} value={address.line2 ?? ""} onChange={(e) => setAddress({ ...address, line2: e.target.value })} placeholder="Street / area" />
          <div className="grid grid-cols-2 gap-3">
            <input className={inputClass} value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} placeholder="City" />
            <input className={inputClass} value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} placeholder="State" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className={inputClass} value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value })} placeholder="PIN code" />
            <input className={inputClass} value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })} placeholder="Country" />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-charcoal">Who can open this registry?</p>
          <div className="grid grid-cols-3 gap-2">
            {(["UNLISTED", "PUBLIC", "PRIVATE"] as RegistryVisibility[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVisibility(v)}
                className={`px-2 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer ${visibility === v ? "bg-mocha text-white" : "bg-cream text-text-muted"}`}
              >
                {v === "UNLISTED" ? "Link only" : v.toLowerCase()}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-text-muted">
            {visibility === "UNLISTED" && "Anyone with the link can view it. It will not appear in public search."}
            {visibility === "PUBLIC" && "Guests can find this registry if they search for it."}
            {visibility === "PRIVATE" && "Guests will need the password you share with them."}
          </p>
          {visibility === "PRIVATE" && (
            <input type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Share this with guests" />
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => { setError(""); setStep((s) => Math.max(0, s - 1)); }}
          className="text-sm font-semibold text-text-muted disabled:opacity-30"
        >
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={handleNext} className="btn-primary px-6 py-2.5 text-sm font-semibold">
            Continue
          </button>
        ) : (
          <button type="button" disabled={isSubmitting} onClick={() => void handleSubmit()} className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-60">
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Create registry"}
          </button>
        )}
      </div>
    </div>
  );
}
