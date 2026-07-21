"use client";

import { useEffect, useState } from "react";
import { AdminApiError, adminFetch } from "@/lib/admin-api-client";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { TextArea, TextInput } from "@/components/ui/fields";

export default function MetadataPage() {
  const [form, setForm] = useState({ seoTitle: "", seoDescription: "" });
  const toast = useToast();
  useEffect(() => { adminFetch<typeof form>("/admin/settings").then((data) => setForm({ seoTitle: data.seoTitle ?? "", seoDescription: data.seoDescription ?? "" })).catch((error) => toast({ tone: "error", title: "Could not load site metadata", description: error instanceof AdminApiError ? error.message : undefined })); }, [toast]);
  async function save() { try { await adminFetch("/admin/settings", { method: "PUT", body: form }); toast({ tone: "success", title: "Site metadata saved" }); } catch (error) { toast({ tone: "error", title: "Could not save metadata", description: error instanceof AdminApiError ? error.message : undefined }); } }
  return <div className="max-w-3xl"><PageHeader eyebrow="Content" title="Site Metadata (SEO)" description="Set the default search and social metadata for the public site." /><div className="card space-y-4 p-5"><div><label className="mb-1 block text-sm font-medium">Default SEO title</label><TextInput value={form.seoTitle} onChange={(event) => setForm({ ...form, seoTitle: event.target.value })} /></div><div><label className="mb-1 block text-sm font-medium">Default SEO description</label><TextArea value={form.seoDescription} onChange={(event) => setForm({ ...form, seoDescription: event.target.value })} /></div><button type="button" onClick={save} className="btn btn-primary px-4 py-2 text-sm">Save metadata</button></div></div>;
}
