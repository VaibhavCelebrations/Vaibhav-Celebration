"use client";

import { Pencil, Scale } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AdminApiError, adminFetch } from "@/lib/admin-api-client";
import { useListQuery } from "@/lib/use-list-query";
import { formatDate } from "@/lib/format";
import { AdminDataTable, type Column } from "@/components/ui/AdminDataTable";
import { AdminDrawerForm } from "@/components/ui/AdminDrawerForm";
import { FormField } from "@/components/ui/FormField";
import { HtmlEditor } from "@/components/ui/HtmlEditor";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { DateInput, TextInput } from "@/components/ui/fields";
import type { LegalPage, LegalPageType } from "@/types/cms";

const TYPE_LABELS: Record<LegalPageType, string> = {
  PRIVACY_POLICY: "Privacy Policy",
  TERMS_OF_SERVICE: "Terms of Service",
  REFUND_POLICY: "Refund Policy",
  CANCELLATION_POLICY: "Cancellation Policy",
};

type LegalForm = {
  title: string;
  bodyHtml: string;
  publishedAt: string;
};

const EMPTY: LegalForm = { title: "", bodyHtml: "", publishedAt: "" };

function toDateInput(iso: string | null | undefined) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function LegalPagesScreen() {
  const { query, setQuery } = useListQuery();
  const [rows, setRows] = useState<LegalPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<LegalPage | null>(null);
  const [form, setForm] = useState<LegalForm>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const toast = useToast();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch<{ items: LegalPage[] }>("/admin/legal");
      setRows(data.items ?? []);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Could not load legal pages.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openEdit(row: LegalPage) {
    setEditing(row);
    setForm({
      title: row.title,
      bodyHtml: row.bodyHtml,
      publishedAt: toDateInput(row.publishedAt),
    });
    setFormError(null);
    setDirty(false);
    setDrawerOpen(true);
  }

  function patch(patch: Partial<LegalForm>) {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await adminFetch(`/admin/legal/${editing.type}`, {
        method: "PUT",
        body: {
          title: form.title,
          bodyHtml: form.bodyHtml,
          publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null,
        },
      });
      toast({ tone: "success", title: "Legal page updated" });
      setDrawerOpen(false);
      setDirty(false);
      void load();
    } catch (err) {
      setFormError(err instanceof AdminApiError ? err.message : "Could not save legal page.");
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.search?.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (TYPE_LABELS[r.type] ?? r.type).toLowerCase().includes(q),
    );
  }, [rows, query.search]);

  const columns: Column<LegalPage>[] = [
    {
      key: "type",
      header: "Page",
      cell: (r) => (
        <span className="font-medium text-(--color-charcoal)">{TYPE_LABELS[r.type] ?? r.type}</span>
      ),
    },
    { key: "title", header: "Title", hideBelow: "md", cell: (r) => r.title },
    {
      key: "publishedAt",
      header: "Published",
      hideBelow: "sm",
      cell: (r) => formatDate(r.publishedAt),
    },
  ];

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Content"
        title="Legal Pages"
        description="Privacy policy, terms, refund, and cancellation pages shown on the public site."
      />
      <AdminDataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.type}
        total={filtered.length}
        query={query}
        onQueryChange={setQuery}
        loading={loading}
        error={error}
        onRetry={load}
        rowActions={[{ id: "edit", label: "Edit", icon: Pencil, onSelect: openEdit }]}
        empty={{
          icon: Scale,
          title: "No legal pages",
          description: "Legal pages will appear here once seeded in the database.",
        }}
      />
      <AdminDrawerForm
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? `Edit — ${TYPE_LABELS[editing.type]}` : "Edit Legal Page"}
        onSubmit={onSubmit}
        submitting={submitting}
        error={formError}
        dirty={dirty}
        width="lg"
      >
        <FormField label="Title" htmlFor="legal-title" required>
          <TextInput id="legal-title" value={form.title} onChange={(e) => patch({ title: e.target.value })} required />
        </FormField>
        <FormField label="Published date" htmlFor="legal-published">
          <DateInput id="legal-published" value={form.publishedAt} onChange={(e) => patch({ publishedAt: e.target.value })} />
        </FormField>
        <FormField label="Body" htmlFor="legal-body" required>
          <HtmlEditor id="legal-body" value={form.bodyHtml} onChange={(html) => patch({ bodyHtml: html })} minHeight={320} />
        </FormField>
      </AdminDrawerForm>
    </div>
  );
}
