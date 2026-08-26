"use client";

import { useState } from "react";
import { Check, CheckCircle2, Circle, ExternalLink, Loader2, Sparkles } from "lucide-react";
import * as shopApi from "@/lib/shop-api";
import { friendlyAuthError } from "@/lib/customer-auth-api";
import { SafeGiftImage } from "@/components/registry/SafeGiftImage";
import type { StepProps } from "../types";

export function ReviewStep({ registry, onUpdated, goBack, goTo }: StepProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState("");

  const checklist = registry.readiness?.checklist || [];
  const checklistItems = [
    { key: "details", label: "Registry title and details", done: checklist.find(c => c.key === "details")?.done ?? false, step: "details" },
    { key: "eventDate", label: "Event date", done: checklist.find(c => c.key === "eventDate")?.done ?? false, step: "details" },
    { key: "address", label: "Delivery address", done: checklist.find(c => c.key === "address")?.done ?? false, step: "details" },
    { key: "image", label: "Cover image", done: !!registry.coverImageUrl, step: "cover" },
    { key: "products", label: "Added at least one gift", done: registry.items.length > 0, step: "products" },
  ] as const;

  const isReady = checklistItems.every(c => c.done);

  const handlePublish = async () => {
    if (!isReady) return;
    setIsPublishing(true);
    setError("");
    try {
      const updated = await shopApi.updateMyRegistry(registry.id, {
        visibility: "PUBLIC",
        status: "ACTIVE",
      });
      // The backend should technically mark status as ACTIVE when it goes PUBLIC if it passes validation.
      onUpdated({ ...registry, ...updated, status: "ACTIVE" });
      
      // Redirect to public registry page or success state
      // window.location.href = `/registry/${registry.registryCode}`;
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setIsPublishing(false);
    }
  };

  if (registry.status === "ACTIVE") {
    return (
      <div className="animate-step-in text-center py-16 space-y-6">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
          <Check size={40} strokeWidth={3} />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-charcoal">Your registry is live!</h1>
          <p className="text-text-muted mt-2">Guests can now view and purchase gifts for your celebration.</p>
        </div>
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a href={`/registry/${registry.registryCode}`} target="_blank" rel="noreferrer" className="btn-outline px-6 py-3 text-sm flex items-center gap-2">
            View as guest <ExternalLink size={14} />
          </a>
          <button type="button" onClick={() => {
            if (typeof window !== "undefined") window.location.href = `/account/registry/${registry.id}`;
          }} className="btn-primary px-6 py-3 text-sm">
            Registry Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-step-in space-y-8">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-mocha">Step 4 of 4</p>
        <h1 className="font-display text-2xl font-bold text-charcoal mt-1">Review & Publish</h1>
        <p className="text-text-muted text-sm mt-1">
          Review your registry details. Once published, you can share it with guests.
        </p>
      </div>

      {error && (
        <div role="alert" className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-[1fr_280px] gap-6">
        <div className="space-y-6">
          {/* Cover Image & Details Summary */}
          <section className="bg-surface rounded-2xl border border-border-light overflow-hidden group">
            <div className="h-40 bg-cream relative">
              {registry.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={registry.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-text-light"><Sparkles size={24} /></div>
              )}
              <button 
                type="button" 
                onClick={() => goTo("cover")}
                className="absolute top-4 right-4 bg-white/90 backdrop-blur text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Edit Cover
              </button>
            </div>
            <div className="p-5 relative">
               <button 
                type="button" 
                onClick={() => goTo("details")}
                className="absolute top-5 right-5 text-[10px] font-bold uppercase tracking-wider text-mocha hover:text-mocha-dark transition-colors"
              >
                Edit Details
              </button>
              <h2 className="text-xl font-bold text-charcoal pr-16">{registry.title || "Untitled Registry"}</h2>
              {registry.ownerDisplayName && <p className="text-sm font-medium text-text-muted mt-0.5">By {registry.ownerDisplayName}</p>}
              
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border-light">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-light font-bold mb-1">Event Date</p>
                  <p className="text-sm font-medium text-charcoal">{registry.eventDate ? new Date(registry.eventDate).toLocaleDateString() : "Not set"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-light font-bold mb-1">Occasion</p>
                  <p className="text-sm font-medium text-charcoal">{registry.occasion || "Not set"}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Products Summary */}
          <section className="bg-surface rounded-2xl border border-border-light p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-charcoal">Selected Gifts ({registry.items.length})</h3>
              <button 
                type="button" 
                onClick={() => goTo("products")}
                className="text-[10px] font-bold uppercase tracking-wider text-mocha hover:text-mocha-dark transition-colors"
              >
                Edit Gifts
              </button>
            </div>
            
            {registry.items.length === 0 ? (
              <p className="text-xs text-text-muted py-6 text-center border border-dashed border-border-light rounded-xl">No gifts added yet.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {registry.items.slice(0, 10).map((item) => (
                  <div key={item.id} className="w-14 h-14 rounded-xl overflow-hidden border border-border-light bg-cream shrink-0" title={item.title}>
                    <SafeGiftImage src={item.image?.url} alt={item.title} />
                  </div>
                ))}
                {registry.items.length > 10 && (
                  <div className="w-14 h-14 rounded-xl border border-border-light bg-cream/50 flex items-center justify-center text-xs font-bold text-text-muted">
                    +{registry.items.length - 10}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Readiness Sidebar */}
        <div className="space-y-4">
          <div className="bg-cream/50 rounded-2xl border border-border-light p-5 sticky top-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal mb-4">Readiness Checklist</h3>
            <ul className="space-y-3">
              {checklistItems.map(item => (
                <li key={item.key} className="flex items-start gap-2.5">
                  {item.done ? (
                    <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <Circle size={16} className="text-text-light shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`text-xs font-medium ${item.done ? "text-charcoal" : "text-text-muted"}`}>{item.label}</p>
                    {!item.done && (
                      <button type="button" onClick={() => goTo(item.step)} className="text-[10px] font-bold text-mocha hover:underline mt-0.5">
                        Fix now
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-6 pt-6 border-t border-border-light">
              <button
                type="button"
                disabled={!isReady || isPublishing}
                onClick={() => void handlePublish()}
                className={`w-full py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center ${
                  isReady 
                    ? "bg-mocha text-white shadow-lg shadow-mocha/20 hover:bg-mocha-dark hover:-translate-y-0.5" 
                    : "bg-border-light text-text-muted cursor-not-allowed"
                }`}
              >
                {isPublishing ? <Loader2 size={16} className="animate-spin" /> : "Publish Registry"}
              </button>
              {!isReady && <p className="text-[10px] text-center text-text-muted mt-2">Complete the checklist to publish.</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border-light">
        <button type="button" onClick={goBack} className="text-sm font-semibold text-text-muted hover:text-charcoal cursor-pointer">
          Back
        </button>
      </div>
    </div>
  );
}
