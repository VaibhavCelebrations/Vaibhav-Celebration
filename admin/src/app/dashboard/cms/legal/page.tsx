"use client";

import { useEffect, useState } from "react";
import { AdminApiError, adminFetch } from "@/lib/admin-api-client";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { TextArea } from "@/components/ui/fields";

export default function LegalPage() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  useEffect(() => {
    adminFetch<{ contentHtml?: string }>("/admin/legal").then((data) => setContent(data.contentHtml ?? "")).catch((error) => toast({ tone: "error", title: "Could not load legal pages", description: error instanceof AdminApiError ? error.message : undefined })).finally(() => setLoading(false));
  }, [toast]);
  async function save() {
    setSaving(true);
    try { await adminFetch("/admin/legal", { method: "PUT", body: { contentHtml: content } }); toast({ tone: "success", title: "Legal pages saved" }); }
    catch (error) { toast({ tone: "error", title: "Could not save legal pages", description: error instanceof AdminApiError ? error.message : undefined }); }
    finally { setSaving(false); }
  }
  return <div className="max-w-4xl"><PageHeader eyebrow="Content" title="Legal Pages" description="Maintain the public legal copy supplied by the site." /><div className="card p-5"><label className="mb-2 block text-sm font-medium">Legal content</label><TextArea value={content} onChange={(event) => setContent(event.target.value)} disabled={loading} rows={16} /><button type="button" className="btn btn-primary mt-4 px-4 py-2 text-sm" disabled={loading || saving} onClick={save}>{saving ? "Saving…" : "Save legal pages"}</button></div></div>;
}
