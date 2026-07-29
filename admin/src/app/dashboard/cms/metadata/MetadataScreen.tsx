"use client";

import { Pencil, SearchCheck } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AdminApiError, adminFetch } from "@/lib/admin-api-client";
import { useListQuery } from "@/lib/use-list-query";
import { AdminDataTable, type Column } from "@/components/ui/AdminDataTable";
import { AdminDrawerForm } from "@/components/ui/AdminDrawerForm";
import { FormField } from "@/components/ui/FormField";
import { MediaPicker } from "@/components/ui/MediaPicker";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { TextArea, TextInput } from "@/components/ui/fields";
import type { MediaRef } from "@/types/common";
import type { SiteMetadata, SiteMetadataInput } from "@/types/cms";

const EMPTY: SiteMetadataInput = {
  metaTitle: "",
  metaDescription: "",
  canonicalUrl: "",
  ogImageId: null,
};

export function MetadataScreen() {
  const { query, setQuery } = useListQuery();
  const [rows, setRows] = useState<SiteMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<SiteMetadata | null>(null);
  const [form, setForm] = useState<SiteMetadataInput>(EMPTY);
  const [ogImage, setOgImage] = useState<MediaRef | null>(null);
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const toast = useToast();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch<{ items: SiteMetadata[] }>("/admin/metadata");
      setRows(data.items ?? []);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Could not load metadata.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openEdit(row: SiteMetadata) {
    setEditing(row);
    setForm({
      metaTitle: row.metaTitle ?? "",
      metaDescription: row.metaDescription ?? "",
      canonicalUrl: row.canonicalUrl ?? "",
      ogImageId: row.ogImage?.id ?? null,
    });
    setOgImage(row.ogImage);
    setFormError(null);
    setDirty(false);
    setDrawerOpen(true);
  }

  function patch(patch: Partial<SiteMetadataInput>) {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await adminFetch(`/admin/metadata/${editing.pageKey}`, {
        method: "PUT",
        body: {
          metaTitle: form.metaTitle || null,
          metaDescription: form.metaDescription || null,
          canonicalUrl: form.canonicalUrl || null,
          ogImageId: ogImage?.id ?? null,
        },
      });
      toast({ tone: "success", title: "Metadata updated" });
      setDrawerOpen(false);
      setDirty(false);
      void load();
    } catch (err) {
      setFormError(err instanceof AdminApiError ? err.message : "Could not save metadata.");
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.search?.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.pageKey.toLowerCase().includes(q) ||
        (r.metaTitle ?? "").toLowerCase().includes(q) ||
        (r.metaDescription ?? "").toLowerCase().includes(q),
    );
  }, [rows, query.search]);

  const columns: Column<SiteMetadata>[] = [
    {
      key: "pageKey",
      header: "Page",
      cell: (r) => <span className="font-medium capitalize text-(--color-charcoal)">{r.pageKey.replace(/-/g, " ")}</span>,
    },
    {
      key: "metaTitle",
      header: "Meta title",
      hideBelow: "md",
      cell: (r) => r.metaTitle ?? "—",
    },
    {
      key: "metaDescription",
      header: "Description",
      hideBelow: "lg",
      cell: (r) => (
        <span className="line-clamp-2 max-w-md text-(--color-text-muted)">{r.metaDescription ?? "—"}</span>
      ),
    },
    {
      key: "ogImage",
      header: "OG image",
      hideBelow: "sm",
      cell: (r) =>
        r.ogImage?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.ogImage.url} alt="" className="h-8 w-12 rounded object-cover" />
        ) : (
          "—"
        ),
    },
  ];

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Content"
        title="Site Metadata (SEO)"
        description="Per-page search and social metadata for the public site."
      />
      <AdminDataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.pageKey}
        total={filtered.length}
        query={query}
        onQueryChange={setQuery}
        loading={loading}
        error={error}
        onRetry={load}
        searchPlaceholder="Search pages…"
        rowActions={[{ id: "edit", label: "Edit", icon: Pencil, onSelect: openEdit }]}
        empty={{
          icon: SearchCheck,
          title: "No metadata configured",
          description: "Page metadata will appear here once seeded in the database.",
        }}
      />
      <AdminDrawerForm
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={`Edit SEO — ${editing?.pageKey ?? ""}`}
        onSubmit={onSubmit}
        submitting={submitting}
        error={formError}
        dirty={dirty}
        width="lg"
      >
        <FormField label="Meta title" htmlFor="meta-title">
          <TextInput
            id="meta-title"
            value={form.metaTitle ?? ""}
            onChange={(e) => patch({ metaTitle: e.target.value })}
          />
        </FormField>
        <FormField label="Meta description" htmlFor="meta-description">
          <TextArea
            id="meta-description"
            value={form.metaDescription ?? ""}
            onChange={(e) => patch({ metaDescription: e.target.value })}
          />
        </FormField>
        <FormField label="Canonical URL" htmlFor="canonical-url" hint="Optional absolute URL for this page.">
          <TextInput
            id="canonical-url"
            value={form.canonicalUrl ?? ""}
            onChange={(e) => patch({ canonicalUrl: e.target.value })}
            placeholder="https://vaibhavcelebrations.in/..."
          />
        </FormField>
        <FormField label="Open Graph image" htmlFor="og-image">
          <MediaPicker
            kind="media"
            value={ogImage}
            onChange={(media) => {
              setOgImage(media);
              patch({ ogImageId: media?.id ?? null });
            }}
          />
        </FormField>
      </AdminDrawerForm>
    </div>
  );
}
