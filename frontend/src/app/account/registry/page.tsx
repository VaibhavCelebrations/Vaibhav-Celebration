"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gift, Plus, Loader2, ChevronRight, X } from "lucide-react";
import * as shopApi from "@/lib/shop-api";
import { useToast } from "@/components/ui/Toast";
import { friendlyAuthError } from "@/lib/customer-auth-api";
import type { GiftRegistryDto, RegistryStatus, RegistryVisibility, ShippingAddress } from "@/lib/shop-types";

const STATUS_STYLES: Record<RegistryStatus, string> = {
  DRAFT: "bg-cream text-text-muted",
  ACTIVE: "bg-green-50 text-green-700",
  EXPIRED: "bg-amber-50 text-amber-700",
  CLOSED: "bg-red-50 text-red-600",
  ARCHIVED: "bg-charcoal/10 text-charcoal",
};

const EMPTY_ADDRESS: ShippingAddress = { fullName: "", line1: "", line2: "", city: "", state: "", pincode: "", country: "India" };
const inputClass =
  "w-full px-4 py-3 rounded-xl border border-border-light bg-surface text-charcoal text-sm placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-mocha/30 focus:border-mocha transition-all";

function CreateRegistryModal({ onClose, onCreated }: { onClose: () => void; onCreated: (r: GiftRegistryDto) => void }) {
  const [title, setTitle] = useState("");
  const [ownerDisplayName, setOwnerDisplayName] = useState("");
  const [occasion, setOccasion] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [celebrationDetails, setCelebrationDetails] = useState("");
  const [visibility, setVisibility] = useState<RegistryVisibility>("UNLISTED");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState<ShippingAddress>(EMPTY_ADDRESS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !ownerDisplayName.trim()) {
      setError("Add a registry title or the recipient's name");
      return;
    }
    if (!address.fullName.trim() || !address.line1.trim() || !address.city.trim() || !address.state.trim() || !address.pincode.trim()) {
      setError("Delivery address is required so guests know where gifts should go");
      return;
    }
    if (visibility === "PRIVATE" && password.length < 4) {
      setError("Private registries need a password of at least 4 characters");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      const registry = await shopApi.createRegistry({
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
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center bg-charcoal/60 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-surface rounded-t-[2rem] md:rounded-[2rem] shadow-2xl p-6 md:p-8" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-cream hover:bg-blush flex items-center justify-center text-charcoal cursor-pointer" aria-label="Close">
          <X size={16} />
        </button>
        <h2 className="font-display text-2xl font-bold text-charcoal mb-1">Create Gift Registry</h2>
        <p className="text-text-muted text-sm mb-6">Tell guests who this is for, when the celebration is, and where gifts should be delivered.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">{error}</div>}
          <div>
            <label className="text-xs font-semibold text-charcoal mb-1 block" htmlFor="reg-title">Registry title</label>
            <input id="reg-title" className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Aarav's 5th Birthday" />
          </div>
          <div>
            <label className="text-xs font-semibold text-charcoal mb-1 block" htmlFor="reg-owner">Recipient / host name</label>
            <input id="reg-owner" className={inputClass} value={ownerDisplayName} onChange={(e) => setOwnerDisplayName(e.target.value)} placeholder="Aarav Sharma" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-charcoal mb-1 block" htmlFor="reg-occasion">Occasion</label>
              <input id="reg-occasion" className={inputClass} value={occasion} onChange={(e) => setOccasion(e.target.value)} placeholder="Birthday" />
            </div>
            <div>
              <label className="text-xs font-semibold text-charcoal mb-1 block" htmlFor="reg-date">Event date</label>
              <input id="reg-date" type="date" className={inputClass} value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-charcoal mb-1 block" htmlFor="reg-msg">Message to guests</label>
            <textarea id="reg-msg" className={inputClass} rows={3} value={celebrationDetails} onChange={(e) => setCelebrationDetails(e.target.value)} placeholder="We would love your presence — and a little something from this list if you wish to gift." />
          </div>
          <div>
            <p className="text-xs font-semibold text-charcoal mb-2">Visibility</p>
            <div className="grid grid-cols-3 gap-2">
              {(["UNLISTED", "PUBLIC", "PRIVATE"] as RegistryVisibility[]).map((v) => (
                <button key={v} type="button" onClick={() => setVisibility(v)} className={`px-2 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer ${visibility === v ? "bg-mocha text-white" : "bg-cream text-text-muted"}`}>
                  {v === "UNLISTED" ? "Link only" : v.toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          {visibility === "PRIVATE" && (
            <div>
              <label className="text-xs font-semibold text-charcoal mb-1 block" htmlFor="reg-pass">Registry password</label>
              <input id="reg-pass" type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Share this with guests" />
            </div>
          )}
          <div className="pt-2 border-t border-border-light space-y-3">
            <p className="text-xs font-semibold text-charcoal">Delivery address</p>
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
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3.5 text-sm font-bold uppercase tracking-wider gap-2 disabled:opacity-60">
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Create Registry"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function RegistryListPage() {
  const [registries, setRegistries] = useState<GiftRegistryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { push } = useToast();

  const load = async () => {
    setIsLoading(true);
    try {
      setRegistries(await shopApi.listMyRegistries());
    } catch {
      setRegistries([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-charcoal">Gift Registry</h1>
          <p className="text-text-muted text-sm mt-1">Create a beautiful wishlist, share it with guests, and receive gifts at your celebration address.</p>
        </div>
        <button type="button" onClick={() => setShowCreateModal(true)} className="btn-primary px-6 py-3 text-sm font-semibold gap-2 cursor-pointer">
          <Plus size={16} /> New Registry
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-busy>
          {[0, 1].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-surface border border-border-light animate-pulse" />
          ))}
        </div>
      ) : registries.length === 0 ? (
        <div className="text-center py-20 bg-surface rounded-2xl border border-dashed border-border-light">
          <Gift size={40} className="mx-auto text-text-light mb-4" />
          <h3 className="font-display text-xl font-semibold text-charcoal mb-2">No gift registries yet</h3>
          <p className="text-text-muted text-sm mb-6">Start with a title, delivery address, and a few gifts your guests can choose from.</p>
          <button type="button" onClick={() => setShowCreateModal(true)} className="btn-primary px-8 py-3 text-sm cursor-pointer">Create Registry</button>
        </div>
      ) : (
        <div className="space-y-4">
          {registries.map((r) => (
            <Link
              key={r.id}
              href={`/account/registry/${r.id}`}
              className="flex items-center gap-4 bg-surface rounded-2xl border border-border-light p-5 shadow-soft hover:shadow-md transition-shadow"
            >
              <div className="w-14 h-14 rounded-xl bg-mocha/10 flex items-center justify-center shrink-0 overflow-hidden">
                {r.coverImageUrl ? <img src={r.coverImageUrl} alt="" className="w-full h-full object-cover" /> : <Gift size={22} className="text-mocha" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-charcoal">{r.title}</p>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                </div>
                <p className="text-xs text-text-muted mt-1">
                  {r.stats ? `${r.stats.quantityPurchased}/${r.stats.quantityDesired} gifted` : r.registryCode}
                  {r.eventDate ? ` · ${new Date(r.eventDate).toLocaleDateString("en-IN")}` : ""}
                </p>
              </div>
              <ChevronRight size={18} className="text-text-light shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateRegistryModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(r) => {
            setShowCreateModal(false);
            setRegistries((prev) => [r, ...prev]);
            push("Registry created — add gifts next", "success");
          }}
        />
      )}
    </div>
  );
}
