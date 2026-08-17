"use client";

import { Archive as ArchiveIcon, Layers, Loader2, Pencil, Plus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { AdminApiError } from "@/lib/admin-api-client";
import { collectionsRepo, emptyCollectionInput } from "@/lib/data/collections";
import { productsRepo } from "@/lib/data/products";
import { DEFAULT_LIST_QUERY } from "@/lib/data/types";
import { formatDateTime } from "@/lib/format";
import { useListQuery } from "@/lib/use-list-query";
import { useRepoList } from "@/lib/use-repo-list";
import { AdminConfirmDialog } from "@/components/ui/AdminConfirmDialog";
import { AdminDataTable, type Column } from "@/components/ui/AdminDataTable";
import { AdminDrawerForm } from "@/components/ui/AdminDrawerForm";
import { FormField } from "@/components/ui/FormField";
import { MediaPicker } from "@/components/ui/MediaPicker";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import {
  MultiSelectInput,
  NumberInput,
  SlugInput,
  TextArea,
  TextInput,
  ToggleSwitch,
} from "@/components/ui/fields";
import type { MediaRef } from "@/types/common";
import type { ProductCollection, ProductCollectionInput, Product } from "@/types/cms";

export function CollectionsScreen() {
  const { query, setQuery } = useListQuery({ sort: "displayOrder", dir: "asc" });
  const { items: rows, total, loading, error, reload } = useRepoList(collectionsRepo.list, query);

  const [products, setProducts] = useState<Product[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ProductCollection | null>(null);
  const [form, setForm] = useState<ProductCollectionInput>(emptyCollectionInput());
  const [heroMedia, setHeroMedia] = useState<MediaRef | null>(null);
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [archiveTarget, setArchiveTarget] = useState<ProductCollection | null>(null);
  const [archiving, setArchiving] = useState(false);

  const toast = useToast();

  useEffect(() => {
    productsRepo
      .list({ ...DEFAULT_LIST_QUERY, pageSize: 1000, sort: "title", dir: "asc", filters: { isActive: "true" } })
      .then((res) => setProducts(res.items))
      .catch(() => setProducts([]));
  }, []);

  const productOptions = products.map((p) => ({ value: p.id, label: p.title }));

  function openCreate() {
    setEditing(null);
    setForm(emptyCollectionInput(rows.length));
    setHeroMedia(null);
    setFormError(null);
    setDirty(false);
    setDrawerOpen(true);
  }

  function openEdit(row: ProductCollection) {
    setEditing(row);
    setHeroMedia(row.heroImage);
    setForm({
      title: row.title,
      slug: row.slug,
      description: row.description || "",
      startsAt: row.startsAt || null,
      endsAt: row.endsAt || null,
      showOnHomepage: row.showOnHomepage,
      isActive: row.isActive,
      displayOrder: row.displayOrder,
      heroImageId: row.heroImage?.id || null,
      productIds: row.products?.map((p) => p.id) || [],
    });
    setFormError(null);
    setDirty(false);
    setDrawerOpen(true);
  }

  function patchForm(patch: Partial<ProductCollectionInput>) {
    setForm((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      if (!form.productIds?.length) {
        setFormError("Add at least one product so this collection can appear in the shop.");
        setSubmitting(false);
        return;
      }
      const payload = { ...form, heroImageId: heroMedia?.id || null };
      if (editing) {
        await collectionsRepo.update(editing.id, payload);
        toast({ tone: "success", title: "Collection updated" });
      } else {
        await collectionsRepo.create(payload);
        toast({ tone: "success", title: "Collection created" });
      }
      setDrawerOpen(false);
      void reload();
    } catch (err) {
      setFormError(err instanceof AdminApiError ? err.message : "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmArchive() {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await collectionsRepo.archive(archiveTarget.id);
      toast({ tone: "success", title: "Collection archived" });
      setArchiveTarget(null);
      void reload();
    } catch (err) {
      toast({ tone: "error", title: "Archive failed", description: err instanceof AdminApiError ? err.message : undefined });
    } finally {
      setArchiving(false);
    }
  }

  const columns: Column<ProductCollection>[] = [
    {
      key: "title",
      header: "Collection",
      cell: (r) => (
        <div className="flex items-center gap-3">
          {r.heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.heroImage.url} alt="" className="w-10 h-10 rounded object-cover bg-stone-100 border border-stone-200" />
          ) : (
            <div className="w-10 h-10 rounded bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400">
              <Layers size={20} />
            </div>
          )}
          <div>
            <div className="font-semibold text-charcoal">{r.title}</div>
            <div className="text-xs text-text-muted mt-0.5">/{r.slug}</div>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => {
        if (!r.isActive) return <StatusBadge tone="neutral" label="Inactive" />;
        const now = new Date();
        const start = r.startsAt ? new Date(r.startsAt) : null;
        const end = r.endsAt ? new Date(r.endsAt) : null;
        if (start && start > now) return <StatusBadge tone="warning" label="Scheduled" />;
        if (end && end < now) return <StatusBadge tone="error" label="Ended" />;
        return <StatusBadge tone="success" label="Active" />;
      },
    },
    {
      key: "products",
      header: "Products",
      cell: (r) => (
        <div className="text-sm">
          {r.productCount} {r.productCount === 1 ? "item" : "items"}
        </div>
      ),
    },
    {
      key: "homepage",
      header: "Homepage",
      cell: (r) => (
        <div className="text-sm">
          {r.showOnHomepage ? <span className="text-emerald-600 font-medium">Featured</span> : <span className="text-stone-400">—</span>}
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6">
      <PageHeader
        title="Collections"
        description="Create festive shop collections, pick active products, and publish them to /gifts."
        actions={
          <button type="button" onClick={openCreate} className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> New Collection
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
        searchPlaceholder="Search collections..."
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
        empty={{ icon: Layers, title: "No collections yet", description: "Create a collection to bundle products." }}
      />

      <AdminDrawerForm
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? "Edit Collection" : "New Collection"}
        width="lg"
        onSubmit={onSubmit}
        submitting={submitting}
        error={formError}
        dirty={dirty}
      >
        <FormField label="Title" htmlFor="collection-title" required>
          <TextInput id="collection-title" value={form.title} onChange={(e) => patchForm({ title: e.target.value })} required />
        </FormField>
        <FormField label="Slug" htmlFor="collection-slug" hint="Used in the URL /gifts/collection/...">
          <SlugInput
            id="collection-slug"
            value={form.slug || ""}
            source={form.title}
            onChange={(slug) => patchForm({ slug })}
          />
        </FormField>
        <FormField label="Description" htmlFor="collection-desc">
          <TextArea
            id="collection-desc"
            value={form.description || ""}
            onChange={(e) => patchForm({ description: e.target.value })}
            rows={3}
          />
        </FormField>
        <FormField label="Hero Image" htmlFor="collection-hero">
          <MediaPicker kind="products" value={heroMedia} onChange={(m) => { setHeroMedia(m); setDirty(true); }} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Start Date (Optional)" htmlFor="collection-start">
            <input
              id="collection-start"
              type="datetime-local"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mocha focus:border-mocha transition-all"
              value={form.startsAt ? new Date(new Date(form.startsAt).getTime() - new Date(form.startsAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
              onChange={(e) => patchForm({ startsAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
            />
          </FormField>
          <FormField label="End Date (Optional)" htmlFor="collection-end">
            <input
              id="collection-end"
              type="datetime-local"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mocha focus:border-mocha transition-all"
              value={form.endsAt ? new Date(new Date(form.endsAt).getTime() - new Date(form.endsAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
              onChange={(e) => patchForm({ endsAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
            />
          </FormField>
        </div>
        <FormField
          label="Products"
          htmlFor="collection-products"
          hint="Select at least one active product. Empty collections stay hidden on the shop."
          required
        >
          <MultiSelectInput
            options={productOptions}
            value={form.productIds || []}
            onChange={(productIds) => patchForm({ productIds })}
            placeholder="Select products..."
          />
        </FormField>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-stone-100">
          <FormField label="Active" htmlFor="collection-active" hint="Turn off to hide this collection from the shop">
            <ToggleSwitch checked={form.isActive} onChange={(v) => patchForm({ isActive: v })} />
          </FormField>
          <FormField label="Homepage Featured" htmlFor="collection-homepage" hint="Show this collection in the Festive Collections row on Shop">
            <ToggleSwitch checked={form.showOnHomepage} onChange={(v) => patchForm({ showOnHomepage: v })} />
          </FormField>
          <FormField label="Display Order" htmlFor="collection-order">
            <NumberInput id="collection-order" value={form.displayOrder} onChange={(v) => patchForm({ displayOrder: v || 0 })} />
          </FormField>
        </div>
      </AdminDrawerForm>

      <AdminConfirmDialog
        open={!!archiveTarget}
        title="Archive Collection?"
        message={
          <>
            Are you sure you want to archive <strong>{archiveTarget?.title}</strong>? It will no longer be visible to customers.
          </>
        }
        confirmLabel="Yes, archive it"
        tone="danger"
        submitting={archiving}
        onConfirm={confirmArchive}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
}
