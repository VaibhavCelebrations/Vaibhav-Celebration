"use client";

import { Archive as ArchiveIcon, HelpCircle, Pencil } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AdminApiError } from "@/lib/admin-api-client";
import { FAQ_CATEGORIES, faqsRepo } from "@/lib/data/faqs";
import { useListQuery } from "@/lib/use-list-query";
import { useRepoList } from "@/lib/use-repo-list";
import { AdminConfirmDialog } from "@/components/ui/AdminConfirmDialog";
import { AdminDataTable, type Column } from "@/components/ui/AdminDataTable";
import { AdminDrawerForm } from "@/components/ui/AdminDrawerForm";
import { FormField } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { NumberInput, TextArea, TextInput, ToggleSwitch } from "@/components/ui/fields";
import type { Faq, FaqInput } from "@/types/cms";

const EMPTY_FORM: FaqInput = { question: "", answer: "", category: null, displayOrder: 0, isActive: true };

export function FaqsScreen() {
  const { query, setQuery } = useListQuery({ sort: "displayOrder", dir: "asc" });
  const { items: rows, total, loading, error, reload } = useRepoList(faqsRepo.list, query);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Faq | null>(null);
  const [form, setForm] = useState<FaqInput>(EMPTY_FORM);
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [archiveTarget, setArchiveTarget] = useState<Faq | null>(null);
  const [archiving, setArchiving] = useState(false);

  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      openCreate();
      router.replace("/dashboard/cms/faqs");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDirty(false);
    setDrawerOpen(true);
  }

  function openEdit(row: Faq) {
    setEditing(row);
    setForm({ question: row.question, answer: row.answer, category: row.category, displayOrder: row.displayOrder, isActive: row.isActive });
    setFormError(null);
    setDirty(false);
    setDrawerOpen(true);
  }

  function patchForm(patch: Partial<FaqInput>) {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) {
        await faqsRepo.update(editing.id, form);
        toast({ tone: "success", title: "FAQ updated" });
      } else {
        await faqsRepo.create(form);
        toast({ tone: "success", title: "FAQ created" });
      }
      setDrawerOpen(false);
      setDirty(false);
      reload();
    } catch (err) {
      setFormError(err instanceof AdminApiError ? err.message : "Could not save this FAQ.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onArchiveConfirm() {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await faqsRepo.archive(archiveTarget.id);
      toast({ tone: "success", title: "FAQ archived" });
      setArchiveTarget(null);
      reload();
    } catch (err) {
      toast({ tone: "error", title: "Could not archive FAQ", description: err instanceof AdminApiError ? err.message : undefined });
    } finally {
      setArchiving(false);
    }
  }

  const columns: Column<Faq>[] = [
    { key: "displayOrder", header: "Order", sortable: true, width: "80px", cell: (r) => r.displayOrder },
    { key: "question", header: "Question", sortable: true, cell: (r) => <span className="font-medium text-(--color-charcoal)">{r.question}</span> },
    { key: "category", header: "Category", sortable: true, hideBelow: "sm", cell: (r) => r.category ?? "—" },
    {
      key: "isActive",
      header: "Active",
      cell: (r) => <StatusBadge label={r.isActive ? "Active" : "Inactive"} tone={r.isActive ? "success" : "neutral"} />,
    },
  ];

  return (
    <div className="max-w-5xl">
      <PageHeader
        eyebrow="Content"
        title="FAQs"
        description="Frequently asked questions shown on the public site."
        actions={
          <button type="button" onClick={openCreate} className="btn btn-primary px-4 py-2 text-sm">
            New FAQ
          </button>
        }
      />

      <AdminDataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        total={total}
        query={query}
        onQueryChange={setQuery}
        loading={loading}
        error={error}
        onRetry={reload}
        searchPlaceholder="Search questions…"
        filters={[{ key: "category", label: "Category", type: "select", options: FAQ_CATEGORIES.map((c) => ({ value: c, label: c })) }]}
        rowActions={[
          { id: "edit", label: "Edit", icon: Pencil, onSelect: openEdit },
          { id: "archive", label: "Archive", icon: ArchiveIcon, tone: "danger", onSelect: setArchiveTarget },
        ]}
        empty={{ icon: HelpCircle, title: "No FAQs yet", description: "Add your first frequently asked question." }}
      />

      <AdminDrawerForm
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? "Edit FAQ" : "New FAQ"}
        onSubmit={onSubmit}
        submitting={submitting}
        error={formError}
        dirty={dirty}
      >
        <FormField label="Question" htmlFor="faq-question" required>
          <TextInput value={form.question} onChange={(e) => patchForm({ question: e.target.value })} required />
        </FormField>
        <FormField label="Answer" htmlFor="faq-answer" required>
          <TextArea value={form.answer} onChange={(e) => patchForm({ answer: e.target.value })} rows={5} required />
        </FormField>
        <FormField label="Category" htmlFor="faq-category" hint="Optional grouping shown on the public FAQ page.">
          <TextInput value={form.category ?? ""} onChange={(e) => patchForm({ category: e.target.value || null })} />
        </FormField>
        <FormField label="Display order" htmlFor="faq-order">
          <NumberInput value={form.displayOrder} onChange={(n) => patchForm({ displayOrder: n })} />
        </FormField>
        <div className="flex items-center justify-between">
          <label htmlFor="faq-active" className="text-sm font-medium text-(--color-charcoal)">
            Active
          </label>
          <ToggleSwitch id="faq-active" checked={form.isActive} onChange={(v) => patchForm({ isActive: v })} />
        </div>
      </AdminDrawerForm>

      <AdminConfirmDialog
        open={!!archiveTarget}
        title="Archive this FAQ?"
        message={
          <>
            Archive <strong>{archiveTarget?.question}</strong>? It will no longer show on the public site.
          </>
        }
        submitting={archiving}
        onConfirm={onArchiveConfirm}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
}
