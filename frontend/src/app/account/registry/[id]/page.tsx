"use client";

import { use, useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Gift, Trash2, Copy, Check, Plus, X, Search, Link as LinkIcon, Package,
  Share2, Lock, Globe, Eye, Archive, UploadCloud
} from "lucide-react";
import * as shopApi from "@/lib/shop-api";
import { useToast } from "@/components/ui/Toast";
import { friendlyAuthError } from "@/lib/customer-auth-api";
import { formatPaise } from "@/lib/shop-types";
import type {
  ExtractedProductDto, GiftRegistryDetailDto, GiftRegistryItemDto, Product, RegistryVisibility, ShippingAddress,
} from "@/lib/shop-types";
import { SafeGiftImage } from "@/components/registry/SafeGiftImage";
import { PublishPanel } from "@/components/registry/PublishPanel";

interface Props {
  params: Promise<{ id: string }>;
}

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-border-light bg-surface text-charcoal text-sm placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-mocha/30 focus:border-mocha transition-all";

function shareMessage(registry: GiftRegistryDetailDto) {
  return `You're invited to ${registry.ownerDisplayName || registry.title}'s gift registry${registry.occasion ? ` for their ${registry.occasion}` : ""}. ${registry.celebrationDetails ? `${registry.celebrationDetails.slice(0, 120)} ` : ""}View gifts: ${registry.shareUrl}`;
}

function CoverImageEditor({ url, onChange, disabled }: { url: string; onChange: (url: string | null) => void; disabled: boolean }) {
  const [val, setVal] = useState(url);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync prop changes
  useEffect(() => setVal(url), [url]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("File is too large. Maximum size is 5MB.");
      return;
    }
    setError("");
    setIsUploading(true);
    try {
      const result = await shopApi.uploadRegistryCoverImage(file);
      setVal(result.url);
      onChange(result.url);
    } catch (err: any) {
      // The backend will return a RATE_LIMITED error if they upload more than 3 per day
      setError(err.message || friendlyAuthError(err) || "Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="md:col-span-2 space-y-2">
      {error && <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg font-medium">{error}</div>}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            className={`${inputClass} pr-24`}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={() => val !== url && onChange(val || null)}
            placeholder="Cover Image URL (or upload a file)"
            disabled={disabled || isUploading}
          />
          <button
            type="button"
            onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="absolute right-2 top-2 bottom-2 px-3 bg-cream hover:bg-mocha/10 text-charcoal text-xs font-bold uppercase rounded-lg transition-colors flex items-center gap-1.5"
            title="Upload image"
          >
            {isUploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
            <span className="hidden sm:inline">{isUploading ? "Uploading..." : "Upload"}</span>
          </button>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => void handleFileUpload(e)}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
        />
      </div>
    </div>
  );
}

function AddItemForm({ registryId, onAdded }: { registryId: string; onAdded: () => void }) {
  const [sourceType, setSourceType] = useState<"INTERNAL_PRODUCT" | "EXTERNAL_LINK">("INTERNAL_PRODUCT");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedProductDto | null>(null);
  const [manualTitle, setManualTitle] = useState("");
  const [manualImageUrl, setManualImageUrl] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [qty, setQty] = useState("1");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { push } = useToast();

  useEffect(() => {
    if (sourceType !== "INTERNAL_PRODUCT") return;
    const timer = setTimeout(async () => {
      if (!search.trim()) {
        setSearchResults([]);
        return;
      }
      try {
        const result = await shopApi.listProducts({ search: search.trim(), pageSize: 6 });
        setSearchResults(result.items);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, sourceType]);

  const handleExtract = async () => {
    if (!externalUrl.trim()) return;
    setExtracting(true);
    setError("");
    try {
      const data = await shopApi.extractRegistryProduct(externalUrl.trim(), true);
      setExtracted(data);
      if (data.title) setManualTitle(data.title);
      if (data.image) setManualImageUrl(data.image);
      if (data.priceInPaise) setManualPrice(String(data.priceInPaise / 100));
      if (data.storeName) setStoreName(data.storeName);
      if (data.description) setDescription(data.description);
      if (!data.image) {
        setError(
          data.extractionError ??
            "This store blocked automatic product photos. Open the product page, copy the image address, and paste it in Image URL.",
        );
      } else if (data.extractionStatus === "FAILED") {
        setError("We couldn't automatically retrieve this product information. You can add the product details manually.");
      } else {
        push(data.extractionStatus === "SUCCESS" ? "Product found ✓" : "Some details were found — review before saving", "success");
      }
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (sourceType === "INTERNAL_PRODUCT" && !selectedProduct) {
      setError("Please search and select a Vaibhav Celebrations product");
      return;
    }
    if (sourceType === "EXTERNAL_LINK" && !manualTitle.trim() && !externalUrl.trim()) {
      setError("Provide at least a title or a product URL");
      return;
    }
    setIsSubmitting(true);
    try {
      await shopApi.addRegistryItem(registryId, {
        sourceType,
        internalProductId: sourceType === "INTERNAL_PRODUCT" ? selectedProduct?.id : undefined,
        manualTitle: sourceType === "EXTERNAL_LINK" ? manualTitle.trim() || undefined : undefined,
        externalUrl: sourceType === "EXTERNAL_LINK" ? externalUrl.trim() || undefined : undefined,
        manualImageUrl: sourceType === "EXTERNAL_LINK" ? manualImageUrl.trim() || undefined : undefined,
        manualPriceInPaise: sourceType === "EXTERNAL_LINK" && manualPrice ? Math.round(parseFloat(manualPrice) * 100) : undefined,
        storeName: sourceType === "EXTERNAL_LINK" ? storeName || undefined : undefined,
        description: sourceType === "EXTERNAL_LINK" ? description || undefined : undefined,
        notes: notes.trim() || undefined,
        quantityDesired: Math.max(1, Number(qty) || 1),
      });
      push("Gift added to registry", "success");
      onAdded();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-cream/50 rounded-2xl border border-border-light p-5 space-y-4">
      <div className="flex gap-2 bg-surface p-1 rounded-xl w-fit">
        <button type="button" onClick={() => setSourceType("INTERNAL_PRODUCT")} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer ${sourceType === "INTERNAL_PRODUCT" ? "bg-mocha text-white" : "text-text-muted"}`}>
          <Package size={12} className="inline mr-1.5 -mt-0.5" /> Our shop
        </button>
        <button type="button" onClick={() => setSourceType("EXTERNAL_LINK")} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer ${sourceType === "EXTERNAL_LINK" ? "bg-mocha text-white" : "text-text-muted"}`}>
          <LinkIcon size={12} className="inline mr-1.5 -mt-0.5" /> External URL
        </button>
      </div>
      {error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">{error}</div>}

      {sourceType === "INTERNAL_PRODUCT" ? (
        selectedProduct ? (
          <div className="flex items-center gap-3 p-3 bg-surface rounded-xl">
            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
              <SafeGiftImage src={selectedProduct.images[0]?.media.url} alt={selectedProduct.title} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-charcoal line-clamp-1">{selectedProduct.title}</p>
              <p className="text-xs text-text-muted">{formatPaise(selectedProduct.priceInPaise)}</p>
            </div>
            <button type="button" onClick={() => setSelectedProduct(null)} className="text-text-light hover:text-red-500 cursor-pointer" aria-label="Clear product"><X size={16} /></button>
          </div>
        ) : (
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light" />
            <input className={`${inputClass} pl-11`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Vaibhav Celebrations products…" />
            {searchResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-surface border border-border-light rounded-xl shadow-lg max-h-64 overflow-y-auto">
                {searchResults.map((p) => (
                  <button key={p.id} type="button" onClick={() => { setSelectedProduct(p); setSearchResults([]); }} className="w-full flex items-center gap-3 p-3 hover:bg-cream text-left cursor-pointer">
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0"><SafeGiftImage src={p.images[0]?.media.url} alt={p.title} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-charcoal line-clamp-1">{p.title}</p>
                      <p className="text-xs text-text-muted">{formatPaise(p.priceInPaise)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input className={inputClass} value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="Paste a product URL" />
            <button type="button" onClick={() => void handleExtract()} disabled={extracting} className="btn-outline px-4 py-2 text-xs font-bold uppercase shrink-0 disabled:opacity-60">
              {extracting ? <Loader2 size={14} className="animate-spin" /> : "Fetch"}
            </button>
          </div>
          {extracting && <p className="text-xs text-mocha font-medium">Fetching product information…</p>}
          {(manualImageUrl || extracted?.image) && (
            <div className="w-28 h-28 rounded-xl overflow-hidden border border-border-light">
              <SafeGiftImage src={manualImageUrl || extracted?.image} alt={manualTitle || "Preview"} />
            </div>
          )}
          <input className={inputClass} value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} placeholder="Product title" />
          <input
            className={inputClass}
            value={manualImageUrl}
            onChange={(e) => setManualImageUrl(e.target.value)}
            placeholder="Image URL — right-click the product photo → Copy image address"
          />
          <div className="grid grid-cols-2 gap-3">
            <input className={inputClass} value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Store name" />
            <input type="number" className={inputClass} value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} placeholder="Price in ₹" />
          </div>
          <textarea className={inputClass} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-charcoal mb-1 block">Quantity wanted</label>
          <input type="number" min={1} className={inputClass} value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold text-charcoal mb-1 block">Note for guests</label>
          <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Colour, size…" />
        </div>
      </div>
      <button type="submit" disabled={isSubmitting} className="btn-primary px-6 py-3 text-sm font-semibold gap-2 disabled:opacity-60">
        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Add gift
      </button>
    </form>
  );
}

function PasswordSetupDialog({
  isOpen,
  onClose,
  onConfirm,
  isChanging,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
  isChanging: boolean;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setConfirm("");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 4) return setError("Password must be at least 4 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setError("");
    setSaving(true);
    try {
      await onConfirm(password);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to set password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface w-full max-w-sm rounded-3xl shadow-xl overflow-hidden animate-scale-up">
        <div className="p-6 border-b border-border-light flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-charcoal">{isChanging ? "Change Password" : "Set Password"}</h3>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-charcoal transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-text-muted">
            {isChanging ? "Enter a new password for this registry." : "Guests will need this password to view your registry."}
          </p>
          {error && <div className="text-xs font-medium text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">{error}</div>}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-charcoal mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border-light bg-cream/50 text-charcoal text-sm placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-mocha/30 focus:border-mocha transition-all"
              placeholder="Enter password"
              disabled={saving}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-charcoal mb-1.5">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border-light bg-cream/50 text-charcoal text-sm placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-mocha/30 focus:border-mocha transition-all"
              placeholder="Confirm password"
              disabled={saving}
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs text-text-muted hover:bg-cream transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary py-2.5 px-6 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RegistryDetailPage({ params }: Props) {
  const { id } = use(params);
  const [registry, setRegistry] = useState<GiftRegistryDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState<"link" | "address" | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  const load = useCallback(async () => {
    try {
      setRegistry(await shopApi.getMyRegistry(id));
    } catch {
      setRegistry(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const copy = async (text: string, kind: "link" | "address") => {
    await navigator.clipboard?.writeText(text);
    setCopied(kind);
    push(kind === "address" ? "Address copied!" : "Registry link copied", "success");
    setTimeout(() => setCopied(null), 2000);
  };

  const share = async () => {
    if (!registry) return;
    const text = shareMessage(registry);
    if (navigator.share) {
      try {
        await navigator.share({ title: registry.title, text, url: registry.shareUrl });
        return;
      } catch {
        /* fall through */
      }
    }
    await copy(registry.shareUrl, "link");
  };

  const jumpToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const saveField = async (patch: Parameters<typeof shopApi.updateMyRegistry>[1]) => {
    if (!registry) return;
    setSaving(true);
    try {
      const updated = await shopApi.updateMyRegistry(registry.id, patch);
      setRegistry({ ...registry, ...updated });
      push("Registry updated", "success");
    } catch (err) {
      push(friendlyAuthError(err), "error");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className="h-32 rounded-2xl bg-surface animate-pulse" />)}</div>;
  }
  if (!registry) {
    return (
      <div className="text-center py-20">
        <h2 className="font-display text-xl font-bold text-charcoal mb-4">Registry not found</h2>
        <Link href="/account/orders" className="btn-primary px-8 py-3 text-sm">Back to Orders</Link>
      </div>
    );
  }

  const address = registry.shippingAddress;
  const stats = registry.stats;

  return (
    <div className="space-y-6">
      <Link href="/account/orders" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-mocha font-semibold">
        <ArrowLeft size={14} /> Back to Orders
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-mocha mb-1">{registry.status} · {registry.visibility}</p>
          <h1 className="font-display text-2xl font-bold text-charcoal">{registry.title}</h1>
          <p className="text-text-muted text-sm mt-1 font-mono">{registry.registryCode} · {registry.viewCount} views</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {registry.status !== "ACTIVE" && (
            <Link
              href={`/account/registry/${registry.id}/setup`}
              className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm font-semibold"
            >
              Guided setup
            </Link>
          )}
          <button type="button" onClick={() => void share()} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border-light text-sm font-semibold cursor-pointer">
            <Share2 size={14} /> Share
          </button>
          <button type="button" onClick={() => void copy(registry.shareUrl, "link")} className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border-light text-sm font-semibold cursor-pointer">
            {copied === "link" ? <Check size={14} className="text-green-600" /> : <Copy size={14} />} Copy link
          </button>
          <a className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border-light text-sm font-semibold" href={`https://wa.me/?text=${encodeURIComponent(shareMessage(registry))}`} target="_blank" rel="noreferrer">WhatsApp</a>
          <a className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border-light text-sm font-semibold" href={`mailto:?subject=${encodeURIComponent(registry.title)}&body=${encodeURIComponent(shareMessage(registry))}`}>Email</a>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ["Gifts", stats.totalGifts],
            ["Wanted", stats.quantityDesired],
            ["Purchased", stats.quantityPurchased],
            ["Remaining", stats.quantityRemaining],
          ].map(([label, value]) => (
            <div key={String(label)} className="bg-surface rounded-2xl border border-border-light p-4">
              <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold">{label}</p>
              <p className="font-display text-2xl font-bold text-charcoal mt-1">{value}</p>
            </div>
          ))}
        </div>
      )}

      <PublishPanel registry={registry} onUpdated={setRegistry} onJumpTo={jumpToSection} />

      <section id="details" className="bg-surface rounded-2xl border border-border-light p-6 shadow-soft space-y-4">
        <h3 className="font-display text-lg font-bold text-charcoal">Registry details</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <input className={inputClass} defaultValue={registry.title} onBlur={(e) => void saveField({ title: e.target.value })} placeholder="Title" />
          <input className={inputClass} defaultValue={registry.occasion ?? ""} onBlur={(e) => void saveField({ occasion: e.target.value })} placeholder="Occasion" />
          <input className={inputClass} defaultValue={registry.ownerDisplayName ?? ""} onBlur={(e) => void saveField({ ownerDisplayName: e.target.value, childOrPersonName: e.target.value })} placeholder="Recipient name" />
          <input type="date" className={inputClass} defaultValue={registry.eventDate?.slice(0, 10) ?? ""} onBlur={(e) => void saveField({ eventDate: e.target.value || null })} />
          <CoverImageEditor 
            url={registry.coverImageUrl ?? ""} 
            onChange={(url) => void saveField({ coverImageUrl: url })} 
            disabled={saving} 
          />
        </div>
        <textarea className={inputClass} rows={3} defaultValue={registry.celebrationDetails ?? ""} onBlur={(e) => void saveField({ celebrationDetails: e.target.value })} placeholder="Message to guests" />
        <div>
          <p className="text-sm font-bold text-charcoal mb-3">Who can open this registry?</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { v: "UNLISTED" as RegistryVisibility, label: "Unlisted", icon: Eye, desc: "Anyone with the link can view" },
              { v: "PUBLIC" as RegistryVisibility, label: "Public", icon: Globe, desc: "Visible to everyone on the site" },
              { v: "PRIVATE" as RegistryVisibility, label: "Private", icon: Lock, desc: "Requires a password to view" },
            ].map(({ v, label, icon: Icon, desc }) => (
              <button
                key={v}
                type="button"
                disabled={saving}
                onClick={() => {
                  if (v === "PRIVATE" && registry.visibility !== "PRIVATE") {
                    setIsChangingPassword(false);
                    setPasswordDialogOpen(true);
                  } else {
                    void saveField({ visibility: v });
                  }
                }}
                className={`relative flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-200 focus:outline-none ${
                  registry.visibility === v 
                    ? "bg-mocha/5 border-mocha ring-1 ring-mocha" 
                    : "bg-surface border-border-light hover:border-mocha/50 hover:bg-cream"
                } ${saving ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div className="flex items-center gap-2">
                    <Icon size={14} className={registry.visibility === v ? "text-mocha" : "text-text-muted"} />
                    <span className={`text-xs font-bold uppercase tracking-wider ${registry.visibility === v ? "text-mocha" : "text-charcoal"}`}>
                      {label}
                    </span>
                  </div>
                  {registry.visibility === v && (
                    <div className="text-mocha">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}
                </div>
                <p className={`text-[11px] leading-tight ${registry.visibility === v ? "text-mocha/80" : "text-text-muted"}`}>
                  {desc}
                </p>
                {registry.visibility === v && v === "PRIVATE" && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsChangingPassword(true);
                      setPasswordDialogOpen(true);
                    }}
                    className="mt-2 text-[10px] font-bold text-mocha hover:underline cursor-pointer"
                  >
                    CHANGE PASSWORD
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
        {registry.status !== "CLOSED" && registry.status !== "ARCHIVED" && (
          <button
            type="button"
            onClick={() => void saveField({ status: registry.status === "CLOSED" ? "ACTIVE" : "CLOSED" })}
            className="text-xs font-semibold text-text-muted hover:text-red-600 cursor-pointer"
          >
            Close registry (stop accepting new gifts)
          </button>
        )}
      </section>

      <PasswordSetupDialog
        isOpen={passwordDialogOpen}
        isChanging={isChangingPassword}
        onClose={() => setPasswordDialogOpen(false)}
        onConfirm={async (password) => {
          await saveField({ visibility: "PRIVATE", password });
          push(isChangingPassword ? "Password updated" : "Registry is now private", "success");
        }}
      />

      <section id="address" className="bg-surface rounded-2xl border border-border-light p-6 shadow-soft">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg font-bold text-charcoal">Delivery address</h3>
          {address && (
            <button type="button" onClick={() => void copy(address.formatted, "address")} className="text-sm font-semibold text-mocha cursor-pointer">
              {copied === "address" ? "Address copied!" : "Copy Address"}
            </button>
          )}
        </div>
        {address ? (
          <pre className="whitespace-pre-wrap text-sm text-charcoal bg-cream/60 rounded-xl p-4 font-sans">{address.formatted}</pre>
        ) : (
          <p className="text-sm text-text-muted">Add a delivery address so guests know where gifts will go.</p>
        )}
        <AddressEditor
          initial={address}
          onSave={(shippingAddress) => void saveField({ shippingAddress })}
        />
      </section>

      <section id="gifts" className="bg-surface rounded-2xl border border-border-light p-6 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold text-charcoal">Gifts ({registry.items.length})</h3>
          <button type="button" onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-1.5 text-sm text-mocha font-semibold cursor-pointer">
            {showAddForm ? <X size={14} /> : <Plus size={14} />} {showAddForm ? "Cancel" : "Add gift"}
          </button>
        </div>
        {showAddForm && <div className="mb-6"><AddItemForm registryId={registry.id} onAdded={() => { setShowAddForm(false); void load(); }} /></div>}
        {registry.items.length === 0 ? (
          <div className="text-center py-12">
            <Gift size={32} className="mx-auto text-text-light mb-3" />
            <p className="text-text-muted text-sm">No gifts yet. Add shop products or paste an external URL.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {registry.items.map((item) => (
              <GiftRow key={item.id} item={item} registryId={registry.id} onChanged={() => void load()} onDelete={async () => {
                if (!confirm("Remove this gift from the registry?")) return;
                try {
                  await shopApi.deleteRegistryItem(registry.id, item.id);
                  await load();
                } catch (err) {
                  push(friendlyAuthError(err), "error");
                }
              }} />
            ))}
          </div>
        )}
      </section>

      {registry.orders && registry.orders.length > 0 && (
        <section className="bg-surface rounded-2xl border border-border-light p-6 shadow-soft">
          <h3 className="font-display text-lg font-bold text-charcoal mb-3">Registry orders</h3>
          <ul className="space-y-2 text-sm">
            {registry.orders.map((o) => (
              <li key={o.id} className="flex justify-between gap-3 border-b border-border-light pb-2">
                <span className="font-mono">{o.orderCode}</span>
                <span>{o.user?.name ?? "Guest"} · {formatPaise(o.totalInPaise)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div>
        {confirmArchive ? (
          <div className="flex items-center gap-3">
            <p className="text-sm text-red-700">Archive this registry? Guests will no longer see it.</p>
            <button type="button" onClick={async () => {
              try {
                await shopApi.archiveMyRegistry(registry.id);
                push("Registry archived", "success");
                window.location.href = "/account/orders";
              } catch (err) {
                push(friendlyAuthError(err), "error");
              }
            }} className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold cursor-pointer">Confirm archive</button>
            <button type="button" onClick={() => setConfirmArchive(false)} className="text-xs font-semibold cursor-pointer">Cancel</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmArchive(true)} className="text-sm text-red-600 font-semibold inline-flex items-center gap-2 cursor-pointer">
            <Archive size={14} /> Archive registry
          </button>
        )}
      </div>
    </div>
  );
}

function GiftRow({ item, registryId, onChanged, onDelete }: { item: GiftRegistryItemDto; registryId: string; onChanged: () => void; onDelete: () => void }) {
  const { push } = useToast();
  return (
    <div className="flex gap-4 p-3 bg-cream/50 rounded-xl border border-border-light">
      <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-white">
        <SafeGiftImage src={item.image?.url} alt={item.title} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-charcoal line-clamp-1">{item.title}</p>
        <p className="text-xs text-text-muted mt-0.5">
          {item.sourceType === "EXTERNAL_LINK" ? item.storeName || "External store" : "Vaibhav Celebrations"}
          {item.priceInPaise ? ` · ${formatPaise(item.priceInPaise)}` : ""}
        </p>
        <p className="text-xs text-charcoal mt-1">Requested {item.quantityDesired} · Purchased {item.quantityPurchased} · Remaining {item.remaining}</p>
        {item.contributions?.filter((c) => c.status === "CONFIRMED_EXTERNAL").map((c) => (
          <button
            key={c.id}
            type="button"
            className="mt-1 text-[11px] text-mocha font-semibold cursor-pointer"
            onClick={async () => {
              if (!confirm("Reverse this guest confirmation?")) return;
              try {
                await shopApi.reverseRegistryContribution(registryId, c.id);
                onChanged();
              } catch (err) {
                push(friendlyAuthError(err), "error");
              }
            }}
          >
            Reverse {c.guestName ?? "guest"} confirmation
          </button>
        ))}
      </div>
      <button type="button" onClick={onDelete} className="text-text-light hover:text-red-500 cursor-pointer self-start" aria-label="Remove gift">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function AddressEditor({
  initial,
  onSave,
}: {
  initial: GiftRegistryDetailDto["shippingAddress"];
  onSave: (address: ShippingAddress) => void;
}) {
  const [open, setOpen] = useState(!initial);
  const [form, setForm] = useState<ShippingAddress>({
    fullName: initial?.recipientName ?? "",
    line1: initial?.line1 ?? "",
    line2: initial?.line2 ?? "",
    city: initial?.city ?? "",
    state: initial?.state ?? "",
    pincode: initial?.pincode ?? "",
    country: initial?.country ?? "India",
  });
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-3 text-sm font-semibold text-mocha cursor-pointer">
        Edit address
      </button>
    );
  }
  return (
    <form
      className="mt-4 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
        setOpen(false);
      }}
    >
      <input className={inputClass} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Recipient name" />
      <input className={inputClass} value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} placeholder="House / flat, building" />
      <input className={inputClass} value={form.line2 ?? ""} onChange={(e) => setForm({ ...form, line2: e.target.value })} placeholder="Street / area" />
      <div className="grid grid-cols-2 gap-2">
        <input className={inputClass} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" />
        <input className={inputClass} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="State" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input className={inputClass} value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} placeholder="PIN" />
        <input className={inputClass} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Country" />
      </div>
      <button type="submit" className="btn-primary px-4 py-2 text-xs">Save address</button>
    </form>
  );
}
