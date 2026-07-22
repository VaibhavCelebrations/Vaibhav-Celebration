"use client";

import { Archive, FileText, Pencil, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AdminApiError } from "@/lib/admin-api-client";
import type { ResourceRecord, ResourceRepository } from "@/lib/data/resources";
import { useListQuery } from "@/lib/use-list-query";
import { useRepoList } from "@/lib/use-repo-list";
import { AdminConfirmDialog } from "@/components/ui/AdminConfirmDialog";
import { AdminDataTable, type Column } from "@/components/ui/AdminDataTable";
import { AdminDrawerForm } from "@/components/ui/AdminDrawerForm";
import { FormField } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { SelectInput, TextArea, TextInput, ToggleSwitch } from "@/components/ui/fields";

type TemplateOption = { value: string; label: string; description?: string };

type FieldKey = "title" | "name" | "slug" | "description" | "content" | "status" | "isActive";

type ResourceScreenProps = {
  title: string;
  description: string;
  noun: string;
  repo: ResourceRepository;
  fields?: FieldKey[];
  statusOptions?: TemplateOption[];
  statusKey?: string;
  extraColumns?: Column<ResourceRecord>[];
  /** Hide create button (e.g. CRM entities created elsewhere). */
  allowCreate?: boolean;
  allowEdit?: boolean;
  allowArchive?: boolean;
};

const defaultFields: FieldKey[] = ["title", "slug", "description", "isActive"];

function getText(row: ResourceRecord, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" || typeof value === "number") return String(value);
  }
  return "—";
}

export function ResourceScreen({
  title,
  description,
  noun,
  repo,
  fields = defaultFields,
  statusOptions,
  statusKey = "status",
  extraColumns = [],
  allowCreate = true,
  allowEdit = true,
  allowArchive = true,
}: ResourceScreenProps) {
  const visibleFields = fields;
  const { query, setQuery } = useListQuery({ sort: "createdAt", dir: "desc" });
  const { items: rows, total, loading, error, reload } = useRepoList(repo.list, query);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ResourceRecord | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({ isActive: true });
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ResourceRecord | null>(null);
  const [archiving, setArchiving] = useState(false);
  const toast = useToast();

  const patch = (value: Record<string, unknown>) => {
    setForm((current) => ({ ...current, ...value }));
    setDirty(true);
  };
  const openCreate = () => {
    setEditing(null);
    setForm({ isActive: true });
    setDirty(false);
    setFormError(null);
    setDrawerOpen(true);
  };
  const openEdit = (row: ResourceRecord) => {
    setEditing(row);
    setForm({ ...row });
    setDirty(false);
    setFormError(null);
    setDrawerOpen(true);
  };
  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) await repo.update(editing.id, form);
      else await repo.create(form);
      toast({ tone: "success", title: `${noun} ${editing ? "updated" : "created"}` });
      setDrawerOpen(false);
      reload();
    } catch (err) {
      setFormError(err instanceof AdminApiError ? err.message : `Could not save this ${noun.toLowerCase()}.`);
    } finally {
      setSubmitting(false);
    }
  };
  const archive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await repo.archive(archiveTarget.id);
      toast({ tone: "success", title: `${noun} archived` });
      setArchiveTarget(null);
      reload();
    } catch (err) {
      toast({ tone: "error", title: `Could not archive ${noun.toLowerCase()}`, description: err instanceof AdminApiError ? err.message : undefined });
    } finally {
      setArchiving(false);
    }
  };

  const columns: Column<ResourceRecord>[] = [
    { key: "title", header: "Name", sortable: true, cell: (row) => <span className="font-medium text-(--color-charcoal)">{getText(row, ["title", "name", "customerName", "fullName", "invoiceNumber", "bookingCode"])}</span> },
    { key: "slug", header: "Reference", hideBelow: "md", cell: (row) => <span className="font-mono text-xs">{getText(row, ["slug", "email", "status", "source"])}</span> },
    ...extraColumns,
    { key: "status", header: "Status", cell: (row) => {
      const value = row.status ?? row.isActive;
      const label = typeof value === "boolean" ? (value ? "Active" : "Inactive") : String(value ?? "—").replaceAll("_", " ");
      return <StatusBadge label={label} tone={value === false || value === "CANCELLED" || value === "CLOSED_LOST" ? "neutral" : "success"} />;
    } },
  ];

  const rowActions = [
    ...(allowEdit
      ? [{ id: "edit", label: "Edit", icon: Pencil, onSelect: openEdit }]
      : []),
    ...(allowArchive
      ? [{ id: "archive", label: "Archive", icon: Archive, tone: "danger" as const, onSelect: setArchiveTarget }]
      : []),
  ];

  return <div className="w-full">
    <PageHeader
      eyebrow="Administration"
      title={title}
      description={description}
      actions={
        allowCreate ? (
          <button type="button" onClick={openCreate} className="btn btn-primary px-4 py-2 text-sm">
            <Plus size={16} aria-hidden="true" /> New {noun}
          </button>
        ) : undefined
      }
    />
    <AdminDataTable
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      total={total}
      query={query}
      onQueryChange={setQuery}
      loading={loading}
      error={error}
      onRetry={reload}
      searchPlaceholder={`Search ${title.toLowerCase()}…`}
      rowActions={rowActions}
      empty={{
        icon: FileText,
        title: `No ${title.toLowerCase()} yet`,
        description: allowCreate
          ? `Create the first ${noun.toLowerCase()} to get started.`
          : `Records will appear here once they are created in the system.`,
      }}
    />
    {(allowCreate || allowEdit) && (
      <AdminDrawerForm open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editing ? `Edit ${noun}` : `New ${noun}`} onSubmit={onSubmit} submitting={submitting} error={formError} dirty={dirty}>
        {visibleFields.includes("title") && <FormField label="Title" htmlFor="resource-title" required><TextInput id="resource-title" value={String(form.title ?? "")} onChange={(event) => patch({ title: event.target.value })} required /></FormField>}
        {visibleFields.includes("name") && <FormField label="Name" htmlFor="resource-name" required><TextInput id="resource-name" value={String(form.name ?? "")} onChange={(event) => patch({ name: event.target.value })} required /></FormField>}
        {visibleFields.includes("slug") && <FormField label="Slug" htmlFor="resource-slug"><TextInput id="resource-slug" value={String(form.slug ?? "")} onChange={(event) => patch({ slug: event.target.value })} /></FormField>}
        {visibleFields.includes("description") && <FormField label="Description" htmlFor="resource-description"><TextArea id="resource-description" value={String(form.description ?? form.message ?? "")} onChange={(event) => patch({ description: event.target.value })} /></FormField>}
        {visibleFields.includes("content") && <FormField label="Content" htmlFor="resource-content"><TextArea id="resource-content" value={String(form.contentHtml ?? form.content ?? "")} onChange={(event) => patch({ contentHtml: event.target.value })} /></FormField>}
        {visibleFields.includes("status") && <FormField label={statusKey === "pageTemplate" ? "Page template" : "Status"} htmlFor="resource-status" hint={statusOptions?.find((option) => option.value === form[statusKey])?.description}><SelectInput id="resource-status" value={String(form[statusKey] ?? statusOptions?.[0]?.value ?? "")} onChange={(event) => patch({ [statusKey]: event.target.value })} options={statusOptions ?? []} /></FormField>}
        {visibleFields.includes("isActive") && <div className="flex items-center justify-between"><label htmlFor="resource-active" className="text-sm font-medium text-(--color-charcoal)">Active</label><ToggleSwitch id="resource-active" checked={Boolean(form.isActive)} onChange={(isActive) => patch({ isActive })} /></div>}
      </AdminDrawerForm>
    )}
    {allowArchive && (
      <AdminConfirmDialog open={!!archiveTarget} title={`Archive this ${noun.toLowerCase()}?`} message={<>Archive <strong>{archiveTarget ? getText(archiveTarget, ["title", "name", "customerName", "fullName"]) : ""}</strong>? This is reversible by an administrator.</>} submitting={archiving} onConfirm={archive} onCancel={() => setArchiveTarget(null)} />
    )}
  </div>;
}
