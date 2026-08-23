"use client";

import { Trash2, Pencil, Plus, Star } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { AdminApiError, adminFetchList } from "@/lib/admin-api-client";
import { testimonialsRepo } from "@/lib/data/resources";
import { useListQuery } from "@/lib/use-list-query";
import { useRepoList } from "@/lib/use-repo-list";
import { AdminConfirmDialog } from "@/components/ui/AdminConfirmDialog";
import { AdminDataTable, type Column } from "@/components/ui/AdminDataTable";
import { AdminDrawerForm } from "@/components/ui/AdminDrawerForm";
import { FormField } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { NumberInput, SelectInput, TextArea, TextInput, ToggleSwitch } from "@/components/ui/fields";
import type { Testimonial, TestimonialInput, TestimonialSubjectType } from "@/types/cms";
import { TESTIMONIAL_SUBJECT_TYPES } from "@/types/cms";

const EMPTY: TestimonialInput = {
  customerName: "",
  content: "",
  rating: null,
  subjectType: "GENERAL",
  themeId: null,
  packageId: null,
  isFeatured: false,
  isActive: true,
};

type ThemeOption = { id: string; title: string };
type PackageOption = { id: string; title: string };

export function TestimonialsScreen() {
  const { query, setQuery } = useListQuery({ sort: "createdAt", dir: "desc" });
  const { items: rows, total, loading, error, reload } = useRepoList(testimonialsRepo.list, query);

  const [themes, setThemes] = useState<ThemeOption[]>([]);
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState<TestimonialInput>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Testimonial | null>(null);
  const [archiving, setArchiving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    void adminFetchList<ThemeOption>("/admin/themes?page=1&pageSize=100", { page: 1, pageSize: 100 })
      .then((r) => setThemes(r.items))
      .catch(() => setThemes([]));
    void adminFetchList<PackageOption>("/admin/packages?page=1&pageSize=100", { page: 1, pageSize: 100 })
      .then((r) => setPackages(r.items))
      .catch(() => setPackages([]));
  }, []);

  function patch(patch: Partial<TestimonialInput>) {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setFormError(null);
    setDirty(false);
    setDrawerOpen(true);
  }

  function openEdit(row: Testimonial) {
    setEditing(row);
    setForm({
      customerName: row.customerName,
      content: row.content,
      rating: row.rating,
      subjectType: row.subjectType,
      themeId: row.themeId,
      packageId: row.packageId,
      isFeatured: row.isFeatured,
      isActive: row.isActive,
    });
    setFormError(null);
    setDirty(false);
    setDrawerOpen(true);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) {
        await testimonialsRepo.update(editing.id, form);
        toast({ tone: "success", title: "Testimonial updated" });
      } else {
        await testimonialsRepo.create(form);
        toast({ tone: "success", title: "Testimonial created" });
      }
      setDrawerOpen(false);
      setDirty(false);
      reload();
    } catch (err) {
      setFormError(err instanceof AdminApiError ? err.message : "Could not save testimonial.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onArchiveConfirm() {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await testimonialsRepo.archive(archiveTarget.id);
      toast({ tone: "success", title: "Testimonial archived" });
      setArchiveTarget(null);
      reload();
    } catch (err) {
      toast({
        tone: "error",
        title: "Could not archive testimonial",
        description: err instanceof AdminApiError ? err.message : undefined,
      });
    } finally {
      setArchiving(false);
    }
  }

  const subjectOptions = TESTIMONIAL_SUBJECT_TYPES.map((t) => ({
    value: t,
    label: t.charAt(0) + t.slice(1).toLowerCase(),
  }));

  const columns: Column<Testimonial>[] = [
    {
      key: "customerName",
      header: "Customer",
      sortable: true,
      cell: (r) => <span className="font-medium text-(--color-charcoal)">{r.customerName}</span>,
    },
    {
      key: "content",
      header: "Review",
      hideBelow: "md",
      cell: (r) => <span className="line-clamp-2 max-w-md">{r.content}</span>,
    },
    {
      key: "rating",
      header: "Rating",
      hideBelow: "sm",
      cell: (r) => (r.rating ? `${r.rating}★` : "—"),
    },
    {
      key: "isFeatured",
      header: "Featured",
      cell: (r) => (r.isFeatured ? <StatusBadge label="Featured" tone="success" /> : "—"),
    },
    {
      key: "isActive",
      header: "Active",
      cell: (r) => <StatusBadge label={r.isActive ? "Active" : "Inactive"} tone={r.isActive ? "success" : "neutral"} />,
    },
  ];

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Content"
        title="Testimonials"
        description="Review customer feedback before displaying it publicly."
        actions={
          <button type="button" onClick={openCreate} className="btn btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm">
            <Plus size={16} /> New Testimonial
          </button>
        }
      />
      <AdminDataTable
        columns={columns}
        rows={rows as Testimonial[]}
        rowKey={(r) => r.id}
        total={total}
        query={query}
        onQueryChange={setQuery}
        loading={loading}
        error={error}
        onRetry={reload}
        searchPlaceholder="Search testimonials…"
        rowActions={[
          { id: "edit", label: "Edit", icon: Pencil, onSelect: openEdit },
          { id: "archive", label: "Delete", icon: Trash2, tone: "danger", onSelect: setArchiveTarget },
        ]}
        empty={{
          icon: Star,
          title: "No testimonials yet",
          description: "Add the first customer review.",
        }}
      />
      <AdminDrawerForm
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? "Edit Testimonial" : "New Testimonial"}
        onSubmit={onSubmit}
        submitting={submitting}
        error={formError}
        dirty={dirty}
      >
        <FormField label="Customer name" htmlFor="testimonial-name" required>
          <TextInput id="testimonial-name" value={form.customerName} onChange={(e) => patch({ customerName: e.target.value })} required />
        </FormField>
        <FormField label="Review" htmlFor="testimonial-content" required>
          <TextArea id="testimonial-content" value={form.content} onChange={(e) => patch({ content: e.target.value })} required />
        </FormField>
        <FormField label="Rating (1–5)" htmlFor="testimonial-rating">
          <NumberInput
            id="testimonial-rating"
            value={form.rating ?? 0}
            min={0}
            max={5}
            onChange={(n) => patch({ rating: n > 0 ? n : null })}
          />
        </FormField>
        <FormField label="Subject type" htmlFor="testimonial-subject">
          <SelectInput
            id="testimonial-subject"
            value={form.subjectType}
            onChange={(e) => patch({ subjectType: e.target.value as TestimonialSubjectType, themeId: null, packageId: null })}
            options={subjectOptions}
          />
        </FormField>
        {form.subjectType === "THEME" && (
          <FormField label="Theme" htmlFor="testimonial-theme">
            <SelectInput
              id="testimonial-theme"
              value={form.themeId ?? ""}
              onChange={(e) => patch({ themeId: e.target.value || null })}
              options={[{ value: "", label: "Select theme" }, ...themes.map((t) => ({ value: t.id, label: t.title }))]}
            />
          </FormField>
        )}
        {form.subjectType === "PACKAGE" && (
          <FormField label="Package" htmlFor="testimonial-package">
            <SelectInput
              id="testimonial-package"
              value={form.packageId ?? ""}
              onChange={(e) => patch({ packageId: e.target.value || null })}
              options={[{ value: "", label: "Select package" }, ...packages.map((p) => ({ value: p.id, label: p.title }))]}
            />
          </FormField>
        )}
        <div className="flex items-center justify-between">
          <label htmlFor="testimonial-featured" className="text-sm font-medium">Featured</label>
          <ToggleSwitch id="testimonial-featured" checked={form.isFeatured} onChange={(v) => patch({ isFeatured: v })} />
        </div>
        <div className="flex items-center justify-between">
          <label htmlFor="testimonial-active" className="text-sm font-medium">Active</label>
          <ToggleSwitch id="testimonial-active" checked={form.isActive} onChange={(v) => patch({ isActive: v })} />
        </div>
      </AdminDrawerForm>
      <AdminConfirmDialog
        open={!!archiveTarget}
        title="Archive this testimonial?"
        message={
          <>
            Archive <strong>{archiveTarget?.customerName}</strong>?
          </>
        }
        submitting={archiving}
        onConfirm={onArchiveConfirm}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
}
