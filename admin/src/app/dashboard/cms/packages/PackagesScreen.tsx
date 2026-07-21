"use client";

import { Archive as ArchiveIcon, Package as PackageIcon, Pencil, Star } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AdminApiError } from "@/lib/admin-api-client";
import { packagesRepo } from "@/lib/data/packages";
import { formatPaise } from "@/lib/format";
import { useListQuery } from "@/lib/use-list-query";
import { useRepoList } from "@/lib/use-repo-list";
import { AdminConfirmDialog } from "@/components/ui/AdminConfirmDialog";
import { AdminDataTable, type Column } from "@/components/ui/AdminDataTable";
import { AdminDrawerForm } from "@/components/ui/AdminDrawerForm";
import { FormField } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { NumberInput, PriceInput, SlugInput, TextArea, TextInput, ToggleSwitch } from "@/components/ui/fields";
import type { Package, PackageInput } from "@/types/cms";

const EMPTY_FORM: PackageInput = {
  title: "",
  slug: "",
  priceInPaise: 0,
  tierRank: 1,
  isRecommended: false,
  isActive: true,
  isCustomizable: true,
  displayOrder: 0,
  description: null,
};

export function PackagesScreen() {
  const { query, setQuery } = useListQuery({ sort: "displayOrder", dir: "asc" });
  const { items: rows, total, loading, error, reload } = useRepoList(packagesRepo.list, query);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const [form, setForm] = useState<PackageInput>(EMPTY_FORM);
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [archiveTarget, setArchiveTarget] = useState<Package | null>(null);
  const [archiving, setArchiving] = useState(false);

  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      openCreate();
      router.replace("/dashboard/cms/packages");
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

  function openEdit(row: Package) {
    setEditing(row);
    setForm({
      title: row.title,
      slug: row.slug,
      priceInPaise: row.priceInPaise,
      tierRank: row.tierRank,
      isRecommended: row.isRecommended,
      isActive: row.isActive,
      isCustomizable: row.isCustomizable,
      displayOrder: row.displayOrder,
      description: row.description,
    });
    setFormError(null);
    setDirty(false);
    setDrawerOpen(true);
  }

  function patchForm(patch: Partial<PackageInput>) {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) {
        await packagesRepo.update(editing.id, form);
        toast({ tone: "success", title: "Package updated" });
      } else {
        await packagesRepo.create(form);
        toast({ tone: "success", title: "Package created" });
      }
      setDrawerOpen(false);
      setDirty(false);
      reload();
    } catch (err) {
      setFormError(err instanceof AdminApiError ? err.message : "Could not save this package.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onArchiveConfirm() {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await packagesRepo.archive(archiveTarget.id);
      toast({ tone: "success", title: "Package archived" });
      setArchiveTarget(null);
      reload();
    } catch (err) {
      toast({ tone: "error", title: "Could not archive package", description: err instanceof AdminApiError ? err.message : undefined });
    } finally {
      setArchiving(false);
    }
  }

  const columns: Column<Package>[] = [
    { key: "displayOrder", header: "Order", sortable: true, width: "80px", cell: (r) => r.displayOrder },
    {
      key: "title",
      header: "Title",
      sortable: true,
      cell: (r) => (
        <span className="inline-flex items-center gap-1.5 font-medium text-(--color-charcoal)">
          {r.title}
          {r.isRecommended && <Star size={13} strokeWidth={2} className="text-(--color-mocha)" aria-label="Recommended" />}
        </span>
      ),
    },
    { key: "priceInPaise", header: "Price", sortable: true, align: "right", cell: (r) => formatPaise(r.priceInPaise) },
    { key: "tierRank", header: "Tier", hideBelow: "sm", align: "right", cell: (r) => r.tierRank },
    { key: "customizationOptionCount", header: "Custom. options", hideBelow: "lg", align: "right", cell: (r) => r.customizationOptionCount },
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
        title="Packages"
        description="Pricing tiers customers choose from, each with its own features and customization options."
        actions={
          <button type="button" onClick={openCreate} className="btn btn-primary px-4 py-2 text-sm">
            New Package
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
        searchPlaceholder="Search packages…"
        filters={[
          {
            key: "isActive",
            label: "Status",
            type: "select",
            options: [
              { value: "true", label: "Active" },
              { value: "false", label: "Inactive" },
            ],
          },
        ]}
        rowActions={[
          { id: "edit", label: "Edit", icon: Pencil, onSelect: openEdit },
          { id: "archive", label: "Archive", icon: ArchiveIcon, tone: "danger", onSelect: setArchiveTarget },
        ]}
        empty={{ icon: PackageIcon, title: "No packages yet", description: "Add your first pricing package." }}
      />

      <AdminDrawerForm
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? "Edit Package" : "New Package"}
        onSubmit={onSubmit}
        submitting={submitting}
        error={formError}
        dirty={dirty}
      >
        <FormField label="Title" htmlFor="pkg-title" required>
          <TextInput value={form.title} onChange={(e) => patchForm({ title: e.target.value })} required />
        </FormField>
        <FormField label="Slug" htmlFor="pkg-slug" required hint="Auto-derived from title; edit to override.">
          <SlugInput value={form.slug} onChange={(v) => patchForm({ slug: v })} source={form.title} />
        </FormField>
        <FormField label="Price" htmlFor="pkg-price" required hint="Base price shown to customers before customization.">
          <PriceInput value={form.priceInPaise} onChange={(paise) => patchForm({ priceInPaise: paise })} required />
        </FormField>
        <FormField label="Tier rank" htmlFor="pkg-tier" required hint="Lower numbers rank first (e.g. Essentials = 1).">
          <NumberInput value={form.tierRank} onChange={(n) => patchForm({ tierRank: n })} min={1} />
        </FormField>
        <FormField label="Description" htmlFor="pkg-desc">
          <TextArea value={form.description ?? ""} onChange={(e) => patchForm({ description: e.target.value || null })} rows={3} />
        </FormField>
        <FormField label="Display order" htmlFor="pkg-order">
          <NumberInput value={form.displayOrder} onChange={(n) => patchForm({ displayOrder: n })} />
        </FormField>
        <div className="flex items-center justify-between">
          <label htmlFor="pkg-recommended" className="text-sm font-medium text-(--color-charcoal)">
            Recommended
          </label>
          <ToggleSwitch id="pkg-recommended" checked={form.isRecommended} onChange={(v) => patchForm({ isRecommended: v })} />
        </div>
        <div className="flex items-center justify-between">
          <label htmlFor="pkg-customizable" className="text-sm font-medium text-(--color-charcoal)">
            Customizable
          </label>
          <ToggleSwitch id="pkg-customizable" checked={form.isCustomizable} onChange={(v) => patchForm({ isCustomizable: v })} />
        </div>
        <div className="flex items-center justify-between">
          <label htmlFor="pkg-active" className="text-sm font-medium text-(--color-charcoal)">
            Active
          </label>
          <ToggleSwitch id="pkg-active" checked={form.isActive} onChange={(v) => patchForm({ isActive: v })} />
        </div>
      </AdminDrawerForm>

      <AdminConfirmDialog
        open={!!archiveTarget}
        title="Archive this package?"
        message={
          <>
            Archive <strong>{archiveTarget?.title}</strong>? It will no longer be offered to customers.
          </>
        }
        submitting={archiving}
        onConfirm={onArchiveConfirm}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
}
