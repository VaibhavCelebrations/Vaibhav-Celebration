"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gift, Plus, Loader2, ChevronRight, X } from "lucide-react";
import * as shopApi from "@/lib/shop-api";
import { useToast } from "@/components/ui/Toast";
import { friendlyAuthError } from "@/lib/customer-auth-api";
import type { GiftRegistryDto, RegistryStatus } from "@/lib/shop-types";

const STATUS_STYLES: Record<RegistryStatus, string> = {
  ACTIVE: "bg-green-50 text-green-700",
  EXPIRED: "bg-amber-50 text-amber-700",
  CLOSED: "bg-red-50 text-red-600",
};

function CreateRegistryModal({ onClose, onCreated }: { onClose: () => void; onCreated: (r: GiftRegistryDto) => void }) {
  const [childOrPersonName, setChildOrPersonName] = useState("");
  const [celebrationDetails, setCelebrationDetails] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      const registry = await shopApi.createRegistry({
        password,
        childOrPersonName: childOrPersonName.trim() || undefined,
        celebrationDetails: celebrationDetails.trim() || undefined,
      });
      onCreated(registry);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-border-light bg-surface text-charcoal text-sm placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-mocha/30 focus:border-mocha transition-all";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-charcoal/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-md bg-surface rounded-[2rem] shadow-2xl p-8" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-cream hover:bg-blush flex items-center justify-center text-charcoal cursor-pointer">
          <X size={16} />
        </button>
        <h2 className="font-display text-2xl font-bold text-charcoal mb-1">Create Gift Registry</h2>
        <p className="text-text-muted text-sm mb-6">Set a password so only invited guests can view and gift items.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">{error}</div>}
          <div>
            <label className="text-xs font-semibold text-charcoal mb-1 block">Child / Person&apos;s Name</label>
            <input className={inputClass} value={childOrPersonName} onChange={(e) => setChildOrPersonName(e.target.value)} placeholder="e.g. Aarav's 5th Birthday" />
          </div>
          <div>
            <label className="text-xs font-semibold text-charcoal mb-1 block">Celebration Details</label>
            <textarea className={inputClass} rows={3} value={celebrationDetails} onChange={(e) => setCelebrationDetails(e.target.value)} placeholder="Tell guests about the celebration" />
          </div>
          <div>
            <label className="text-xs font-semibold text-charcoal mb-1 block">Registry Password</label>
            <input type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Share this with your guests" />
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
    void (async () => {
      await load();
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-charcoal">Gift Registry</h1>
          <p className="text-text-muted text-sm mt-1">Create a wishlist for your celebration and share it with guests.</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary px-6 py-3 text-sm font-semibold gap-2 cursor-pointer">
          <Plus size={16} /> New Registry
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-mocha" />
        </div>
      ) : registries.length === 0 ? (
        <div className="text-center py-20 bg-surface rounded-2xl border border-dashed border-border-light">
          <Gift size={40} className="mx-auto text-text-light mb-4" />
          <h3 className="font-display text-xl font-semibold text-charcoal mb-2">No gift registries yet</h3>
          <p className="text-text-muted text-sm mb-6">Create one to share a wishlist with friends and family.</p>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary px-8 py-3 text-sm cursor-pointer">Create Registry</button>
        </div>
      ) : (
        <div className="space-y-4">
          {registries.map((r) => (
            <Link
              key={r.id}
              href={`/account/registry/${r.id}`}
              className="flex items-center gap-4 bg-surface rounded-2xl border border-border-light p-5 shadow-soft hover:shadow-md transition-shadow"
            >
              <div className="w-14 h-14 rounded-xl bg-mocha/10 flex items-center justify-center shrink-0">
                <Gift size={22} className="text-mocha" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-charcoal">{r.childOrPersonName || `Registry ${r.registryCode}`}</p>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                </div>
                <p className="text-xs text-text-muted mt-1 font-mono">{r.registryCode} · Expires {new Date(r.expiresAt).toLocaleDateString("en-IN")}</p>
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
            push("Registry created successfully", "success");
          }}
        />
      )}
    </div>
  );
}
