"use client";

import { History, Pencil, Scale } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AdminApiError, adminFetch } from "@/lib/admin-api-client";
import { useListQuery } from "@/lib/use-list-query";
import { formatDate } from "@/lib/format";
import { AdminDataTable, type Column } from "@/components/ui/AdminDataTable";
import { AdminModalForm } from "@/components/ui/AdminModalForm";
import { FormField } from "@/components/ui/FormField";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { DateInput, TextInput } from "@/components/ui/fields";
import type { LegalPage, LegalPageType, LegalPageVersion } from "@/types/cms";

const TYPE_LABELS: Record<LegalPageType, string> = {
  PRIVACY_POLICY: "Privacy Policy",
  TERMS_OF_SERVICE: "Terms of Service",
  REFUND_POLICY: "Refund Policy",
  // Stored under this type for historical reasons; the public page is "Shipping & Delivery".
  CANCELLATION_POLICY: "Shipping & Delivery Policy",
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

  // Every saved version of the page being edited, newest first, and the one being looked at.
  const [versions, setVersions] = useState<LegalPageVersion[]>([]);
  const [versionsError, setVersionsError] = useState(false);
  const [viewing, setViewing] = useState<LegalPageVersion | null>(null);
  const [loadingVersion, setLoadingVersion] = useState<number | null>(null);

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
    setVersions([]);
    setVersionsError(false);
    setViewing(null);
    adminFetch<LegalPageVersion[]>(`/admin/legal/${row.type}/versions`)
      .then(setVersions)
      .catch(() => setVersionsError(true));
  }

  async function viewVersion(v: LegalPageVersion) {
    if (!editing) return;
    if (viewing?.version === v.version) {
      setViewing(null);
      return;
    }
    setLoadingVersion(v.version);
    try {
      setViewing(await adminFetch<LegalPageVersion>(`/admin/legal/${editing.type}/versions/${v.version}`));
    } catch (err) {
      toast({ tone: "error", title: err instanceof AdminApiError ? err.message : "Could not load that version." });
    } finally {
      setLoadingVersion(null);
    }
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
    { key: "version", header: "Version", hideBelow: "sm", cell: (r) => `v${r.version ?? 1}` },
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
        description="Privacy policy, terms, refund, and shipping pages shown on the public site. Every saved change is kept as a version."
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
      <AdminModalForm
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? `Edit — ${TYPE_LABELS[editing.type]}` : "Edit Legal Page"}
        description="Edit the content of this legal document. Plain text only — no images. Saving a change to the text creates a new version; earlier versions are kept below."
        onSubmit={onSubmit}
        submitting={submitting}
        error={formError}
        dirty={dirty}
        size="xl"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Title" htmlFor="legal-title" required>
            <TextInput id="legal-title" value={form.title} onChange={(e) => patch({ title: e.target.value })} required />
          </FormField>
          <FormField label="Published date" htmlFor="legal-published">
            <DateInput id="legal-published" value={form.publishedAt} onChange={(e) => patch({ publishedAt: e.target.value })} />
          </FormField>
        </div>
        <FormField label="Content" htmlFor="legal-body" required hint="Use headings, bold, lists, and links to format the document.">
          <RichTextEditor
            id="legal-body"
            value={form.bodyHtml}
            onChange={(html) => patch({ bodyHtml: html })}
            placeholder="Start writing the legal document…"
            minHeight={400}
          />
        </FormField>

        <section className="mt-6 border-t border-(--color-border) pt-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-(--color-charcoal)">
            <History size={15} aria-hidden="true" /> Version history
          </h3>
          <p className="mt-1 text-xs text-(--color-text-muted)">
            Each order records which version the customer accepted at checkout.
          </p>
          {versionsError ? (
            <p className="mt-3 text-sm text-red-600">Could not load the version history.</p>
          ) : versions.length === 0 ? (
            <p className="mt-3 text-sm text-(--color-text-muted)">No earlier versions yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-(--color-border) rounded-lg border border-(--color-border)">
              {versions.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span>
                    <span className="font-medium text-(--color-charcoal)">Version {v.version}</span>
                    {editing && v.version === (editing.version ?? 1) && (
                      <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Current</span>
                    )}
                    <span className="ml-2 text-(--color-text-muted)">saved {formatDate(v.createdAt)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void viewVersion(v)}
                    disabled={loadingVersion === v.version}
                    className="text-sm font-medium text-(--color-mocha) underline underline-offset-2 disabled:opacity-50"
                  >
                    {viewing?.version === v.version ? "Hide" : loadingVersion === v.version ? "Loading…" : "View"}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {viewing && (
            <div className="mt-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-(--color-charcoal)">
                  Version {viewing.version} — {viewing.title}
                </p>
                <button
                  type="button"
                  onClick={() => patch({ title: viewing.title, bodyHtml: viewing.bodyHtml ?? "" })}
                  className="text-xs font-medium text-(--color-mocha) underline underline-offset-2"
                >
                  Copy this version into the editor
                </button>
              </div>
              {/* Sandboxed so stored HTML is only ever displayed, never run. */}
              <iframe
                title={`Version ${viewing.version}`}
                sandbox=""
                srcDoc={`<body style="font-family:system-ui,sans-serif;font-size:13px;line-height:1.5;color:#333;padding:8px">${viewing.bodyHtml ?? ""}</body>`}
                className="mt-2 h-72 w-full rounded-lg border border-(--color-border) bg-white"
              />
            </div>
          )}
        </section>
      </AdminModalForm>
    </div>
  );
}
