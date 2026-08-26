"use client";

import { useState, useRef } from "react";
import { Loader2, Image as ImageIcon, Link as LinkIcon, UploadCloud, CheckCircle2 } from "lucide-react";
import * as shopApi from "@/lib/shop-api";
import { friendlyAuthError } from "@/lib/customer-auth-api";
import type { StepProps } from "../types";

export function CoverImageStep({ registry, onUpdated, goNext, goBack }: StepProps) {
  const [url, setUrl] = useState<string>(registry.coverImageUrl || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleContinue = async () => {
    if (!url.trim()) {
      setError("Please provide a cover image URL for your registry.");
      return;
    }
    setError("");
    setIsSaving(true);
    try {
      const updated = await shopApi.updateMyRegistry(registry.id, {
        coverImageUrl: url.trim(),
      });
      onUpdated({ ...registry, ...updated });
      goNext();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setIsSaving(false);
    }
  };
  
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
      setUrl(result.url);
      setImageError(false);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setIsUploading(false);
      // Reset input so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const hasUrl = url.trim().length > 0;

  return (
    <div className="animate-step-in space-y-8">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-mocha">Step 2 of 4</p>
        <h1 className="font-display text-2xl font-bold text-charcoal mt-1">Choose a cover image</h1>
        <p className="text-text-muted text-sm mt-1">
          Make your registry beautiful. This image will be shown to guests at the top of your page.
        </p>
      </div>

      {error && (
        <div role="alert" className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
          {/* Link Section */}
          <div className="bg-surface rounded-2xl border border-border-light p-6 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold text-charcoal flex items-center gap-2">
              <LinkIcon size={16} className="text-mocha" /> Image Link
            </h2>
            <p className="text-xs text-text-muted leading-relaxed">Paste a link to any image online. We recommend a high-quality landscape photo.</p>
            <input 
              className="w-full px-4 py-3 rounded-xl border border-border-light bg-cream/50 text-charcoal text-sm placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-mocha/30 focus:border-mocha transition-all"
              value={url} 
              onChange={(e) => {
                setUrl(e.target.value);
                setImageError(false);
              }} 
              placeholder="https://example.com/image.jpg" 
              disabled={isUploading || isSaving}
            />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="h-px bg-border-light flex-1" />
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider">OR</p>
            <div className="h-px bg-border-light flex-1" />
          </div>

          {/* Upload Section */}
          <div 
            className="bg-surface rounded-2xl border border-dashed border-border-light p-6 text-center hover:bg-cream/50 hover:border-mocha/50 transition-colors cursor-pointer group"
            onClick={() => !isUploading && !isSaving && fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={(e) => void handleFileUpload(e)}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
            {isUploading ? (
               <Loader2 size={24} className="mx-auto text-mocha mb-2 animate-spin" />
            ) : (
               <UploadCloud size={24} className="mx-auto text-text-light mb-2 group-hover:text-mocha transition-colors" />
            )}
            <h3 className="text-sm font-bold text-charcoal mb-1">Upload from device</h3>
            <p className="text-[11px] text-text-muted">JPEG, PNG, or WebP up to 5MB.</p>
          </div>
        </div>

        {/* Preview Section */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal mb-3 flex items-center justify-between">
            Preview
            {hasUrl && !imageError && <span className="text-green-600 flex items-center gap-1"><CheckCircle2 size={12} /> Image valid</span>}
          </h3>
          <div className="w-full aspect-video md:aspect-[4/3] rounded-2xl overflow-hidden bg-cream border border-border-light flex flex-col items-center justify-center relative text-center p-6 shadow-inner">
            {!hasUrl ? (
              <>
                <ImageIcon size={32} className="text-text-light mb-3" />
                <p className="text-xs text-text-muted font-medium">Add an image to see preview</p>
              </>
            ) : imageError ? (
              <>
                <ImageIcon size={32} className="text-red-300 mb-3" />
                <p className="text-xs text-red-500 font-medium">Unable to load image. Check the link.</p>
              </>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={url} 
                alt="Cover Preview" 
                className="w-full h-full object-cover absolute inset-0"
                onError={() => setImageError(true)}
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border-light">
        <button type="button" onClick={goBack} className="text-sm font-semibold text-text-muted hover:text-charcoal cursor-pointer" disabled={isUploading || isSaving}>
          Back
        </button>
        <button
          type="button"
          disabled={isSaving || isUploading || (hasUrl && imageError)}
          onClick={() => void handleContinue()}
          className="btn-primary px-8 py-3 text-sm font-bold uppercase tracking-wider disabled:opacity-60"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : "Continue"}
        </button>
      </div>
    </div>
  );
}
