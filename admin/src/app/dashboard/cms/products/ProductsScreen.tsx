"use client";

import { Trash2, Boxes, Layers, Loader2, Pencil, Plus, ShoppingBag } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { AdminApiError } from "@/lib/admin-api-client";
import {
  adjustProductStock,
  createProductCategory,
  deleteProductCategory,
  getProductStockHistory,
  listProductCategories,
  productsRepo,
  updateProductCategory,
} from "@/lib/data/products";
import { themesRepo } from "@/lib/data/themes";
import { DEFAULT_LIST_QUERY } from "@/lib/data/types";
import { formatDateTime, formatPaise } from "@/lib/format";
import { stockStatus } from "@/lib/status";
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
  PriceInput,
  SelectInput,
  SlugInput,
  TextArea,
  TextInput,
  ToggleSwitch,
} from "@/components/ui/fields";
import type { MediaRef } from "@/types/common";
import {
  INVENTORY_LEDGER_REASONS,
  PERSONALIZATION_FIELD_TYPES,
  type InventoryLedgerReasonType,
  type PersonalizationFieldType,
  type Product,
  type ProductCategory,
  type ProductInput,
  type ProductPersonalizationField,
} from "@/types/cms";

const IMAGE_SLOTS = 3;

const EMPTY_FORM: ProductInput = {
  title: "",
  slug: "",
  sku: "",
  description: "",
  priceInPaise: 0,
  compareAtPriceInPaise: null,
  personalizationEnabled: false,
  personalizationCostInPaise: 0,
  isActive: true,
  minOrderQuantity: 1,
  maxOrderQuantity: null,
  categoryIds: [],
  themeIds: [],
  imageMediaIds: [],
  personalizationFields: [],
  initialQuantity: 0,
  lowStockThreshold: 10,
};

function emptyPersonalizationField(): ProductPersonalizationField {
  return { fieldKey: "", label: "", fieldType: "text", isRequired: false, maxLength: null };
}

export function ProductsScreen() {
  const { query, setQuery } = useListQuery({ sort: "createdAt", dir: "desc" });
  const { items: rows, total, loading, error, reload } = useRepoList(productsRepo.list, query);

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [themeOptions, setThemeOptions] = useState<{ value: string; label: string }[]>([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductInput>(EMPTY_FORM);
  const [imageSlots, setImageSlots] = useState<(MediaRef | null)[]>(Array(IMAGE_SLOTS).fill(null));
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [archiveTarget, setArchiveTarget] = useState<Product | null>(null);
  const [archiving, setArchiving] = useState(false);

  const [stockTarget, setStockTarget] = useState<Product | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const toast = useToast();

  async function reloadCategories() {
    try {
      setCategories(await listProductCategories());
    } catch (err) {
      toast({ tone: "error", title: "Could not load categories", description: err instanceof AdminApiError ? err.message : undefined });
    }
  }

  useEffect(() => {
    void reloadCategories();
    themesRepo
      .list({ ...DEFAULT_LIST_QUERY, pageSize: 100, sort: "title", dir: "asc" })
      .then((res) => setThemeOptions(res.items.map((t) => ({ value: t.id, label: t.title }))))
      .catch(() => setThemeOptions([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setImageSlots(Array(IMAGE_SLOTS).fill(null));
    setFormError(null);
    setDirty(false);
    setDrawerOpen(true);
  }

  function openEdit(row: Product) {
    setEditing(row);
    const sortedImages = [...row.images].sort((a, b) => a.displayOrder - b.displayOrder);
    const slots: (MediaRef | null)[] = Array(IMAGE_SLOTS).fill(null);
    sortedImages.slice(0, IMAGE_SLOTS).forEach((img, i) => {
      slots[i] = img.media;
    });
    setImageSlots(slots);
    setForm({
      title: row.title,
      slug: row.slug,
      sku: row.sku,
      description: row.description,
      priceInPaise: row.priceInPaise,
      compareAtPriceInPaise: row.compareAtPriceInPaise,
      personalizationEnabled: row.personalizationEnabled,
      personalizationCostInPaise: row.personalizationCostInPaise,
      isActive: row.isActive,
      minOrderQuantity: row.minOrderQuantity,
      maxOrderQuantity: row.maxOrderQuantity,
      categoryIds: row.categories.map((c) => c.id),
      themeIds: row.themes.map((t) => t.id),
      imageMediaIds: sortedImages.map((img) => img.media.id),
      personalizationFields: row.personalizationFields.map(({ id: _id, ...rest }) => rest),
      lowStockThreshold: row.stock?.lowStockThreshold ?? 10,
    });
    setFormError(null);
    setDirty(false);
    setDrawerOpen(true);
  }

  function patchForm(patch: Partial<ProductInput>) {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  }

  function setImageSlot(index: number, media: MediaRef | null) {
    const next = [...imageSlots];
    next[index] = media;
    setImageSlots(next);
    patchForm({ imageMediaIds: next.filter((m): m is MediaRef => !!m).map((m) => m.id) });
  }

  function patchPersonalizationField(index: number, patch: Partial<ProductPersonalizationField>) {
    const fields = [...(form.personalizationFields ?? [])];
    fields[index] = { ...fields[index], ...patch };
    patchForm({ personalizationFields: fields });
  }

  function removePersonalizationField(index: number) {
    patchForm({ personalizationFields: (form.personalizationFields ?? []).filter((_, i) => i !== index) });
  }

  function addPersonalizationField() {
    patchForm({ personalizationFields: [...(form.personalizationFields ?? []), emptyPersonalizationField()] });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) {
        const { initialQuantity: _iq, ...updateBody } = form;
        await productsRepo.update(editing.id, updateBody);
        toast({ tone: "success", title: "Product updated" });
      } else {
        await productsRepo.create(form);
        toast({ tone: "success", title: "Product created" });
      }
      setDrawerOpen(false);
      setDirty(false);
      reload();
    } catch (err) {
      setFormError(err instanceof AdminApiError ? err.message : "Could not save this product.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onArchiveConfirm() {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await productsRepo.archive(archiveTarget.id);
      toast({ tone: "success", title: "Product archived" });
      setArchiveTarget(null);
      reload();
    } catch (err) {
      toast({ tone: "error", title: "Could not archive product", description: err instanceof AdminApiError ? err.message : undefined });
    } finally {
      setArchiving(false);
    }
  }

  const columns: Column<Product>[] = [
    {
      key: "title",
      header: "Product",
      sortable: true,
      cell: (r) => (
        <div className="flex items-center gap-3">
          {r.images[0]?.media.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.images[0].media.url} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-(--color-surface-alt)">
              <ShoppingBag size={16} strokeWidth={1.75} className="text-(--color-text-muted)" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium text-(--color-charcoal)">{r.title}</p>
            <p className="truncate font-mono text-xs text-(--color-text-muted)">{r.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: "priceInPaise",
      header: "Price",
      sortable: true,
      cell: (r) => (
        <div>
          <p className="font-medium">{formatPaise(r.priceInPaise)}</p>
          {r.compareAtPriceInPaise && <p className="text-xs text-(--color-text-muted) line-through">{formatPaise(r.compareAtPriceInPaise)}</p>}
        </div>
      ),
    },
    {
      key: "stock",
      header: "Stock",
      hideBelow: "sm",
      cell: (r) =>
        r.stock ? (
          <div className="flex items-center gap-1.5">
            <span>{r.stock.quantityAvailable}</span>
            <StatusBadge size="sm" {...stockStatus(r.stock.statusFlag)} />
          </div>
        ) : (
          "—"
        ),
    },
    {
      key: "categories",
      header: "Categories",
      hideBelow: "lg",
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.categories.length === 0 ? <span className="text-(--color-text-muted)">—</span> : r.categories.map((c) => <span key={c.id} className="badge badge-neutral">{c.name}</span>)}
        </div>
      ),
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
        eyebrow="Shop"
        title="Products"
        description="Manage the gift shop catalog: pricing, stock, images, and theme/category tagging."
        actions={
          <>
            <button type="button" onClick={() => setCategoriesOpen(true)} className="btn btn-secondary inline-flex items-center gap-1.5 px-4 py-2 text-sm">
              <Layers size={15} strokeWidth={1.75} aria-hidden="true" />
              Categories
            </button>
            <button type="button" onClick={openCreate} className="btn btn-primary px-4 py-2 text-sm">
              New Product
            </button>
          </>
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
        searchPlaceholder="Search products…"
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
          { key: "category", label: "Category", type: "select", options: categoryOptions },
          { key: "theme", label: "Theme", type: "select", options: themeOptions },
        ]}
        rowActions={[
          { id: "edit", label: "Edit", icon: Pencil, onSelect: openEdit },
          { id: "stock", label: "Adjust stock", icon: Boxes, onSelect: setStockTarget },
          { id: "archive", label: "Delete", icon: Trash2, tone: "danger", onSelect: setArchiveTarget },
        ]}
        empty={{ icon: ShoppingBag, title: "No products yet", description: "Add your first gift shop product." }}
      />

      <AdminDrawerForm
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? "Edit Product" : "New Product"}
        width="lg"
        onSubmit={onSubmit}
        submitting={submitting}
        error={formError}
        dirty={dirty}
      >
        <FormField label="Title" htmlFor="product-title" required>
          <TextInput id="product-title" value={form.title} onChange={(e) => patchForm({ title: e.target.value })} required />
        </FormField>
        <FormField label="Slug" htmlFor="product-slug" required hint="Auto-derived from title; edit to override.">
          <SlugInput id="product-slug" value={form.slug} onChange={(v) => patchForm({ slug: v })} source={form.title} />
        </FormField>
        <FormField label="SKU" htmlFor="product-sku" required hint="Unique stock-keeping unit code.">
          <TextInput id="product-sku" value={form.sku} onChange={(e) => patchForm({ sku: e.target.value })} required />
        </FormField>
        <FormField label="Description" htmlFor="product-description" required>
          <TextArea id="product-description" value={form.description} onChange={(e) => patchForm({ description: e.target.value })} rows={4} required />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Price" htmlFor="product-price" required>
            <PriceInput id="product-price" value={form.priceInPaise} onChange={(paise) => patchForm({ priceInPaise: paise })} required />
          </FormField>
          <FormField label="Compare-at price" htmlFor="product-compare-price" hint="Shown struck-through (optional).">
            <PriceInput
              id="product-compare-price"
              value={form.compareAtPriceInPaise ?? 0}
              onChange={(paise) => patchForm({ compareAtPriceInPaise: paise || null })}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Min order quantity" htmlFor="product-min-qty">
            <NumberInput id="product-min-qty" value={form.minOrderQuantity} onChange={(n) => patchForm({ minOrderQuantity: n || 1 })} min={1} />
          </FormField>
          <FormField label="Max order quantity" htmlFor="product-max-qty" hint="Leave blank for no limit.">
            <NumberInput id="product-max-qty" value={form.maxOrderQuantity ?? 0} onChange={(n) => patchForm({ maxOrderQuantity: n || null })} min={0} />
          </FormField>
        </div>

        {!editing && (
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Initial stock quantity" htmlFor="product-initial-qty">
              <NumberInput id="product-initial-qty" value={form.initialQuantity ?? 0} onChange={(n) => patchForm({ initialQuantity: n })} min={0} />
            </FormField>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Low stock threshold" htmlFor="product-low-stock" hint="Flags as Low Stock at or below this quantity.">
            <NumberInput id="product-low-stock" value={form.lowStockThreshold ?? 10} onChange={(n) => patchForm({ lowStockThreshold: n })} min={0} />
          </FormField>
        </div>

        <FormField label="Categories" htmlFor="product-categories" hint="Used for shop filtering and navigation.">
          <MultiSelectInput id="product-categories" value={form.categoryIds ?? []} onChange={(v) => patchForm({ categoryIds: v })} options={categoryOptions} placeholder="Select categories…" />
        </FormField>
        <FormField label="Themes" htmlFor="product-themes" hint="Tag this product under one or more party themes.">
          <MultiSelectInput id="product-themes" value={form.themeIds ?? []} onChange={(v) => patchForm({ themeIds: v })} options={themeOptions} placeholder="Select themes…" />
        </FormField>

        <FormField label="Images" htmlFor="product-image-0" hint="First image is used as the primary thumbnail.">
          <div className="grid grid-cols-3 gap-2">
            {imageSlots.map((slot, i) => (
              <MediaPicker key={i} kind="products" value={slot} onChange={(media) => setImageSlot(i, media)} />
            ))}
          </div>
        </FormField>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.8125rem] font-medium text-(--color-charcoal)">Personalization</p>
              <p className="text-xs text-(--color-text-muted)">Enable paid customization and define fields customers fill before adding to cart.</p>
            </div>
            <ToggleSwitch
              checked={form.personalizationEnabled}
              onChange={(v) => patchForm({ personalizationEnabled: v })}
              label="Personalization enabled"
            />
          </div>
          {form.personalizationEnabled && (
            <FormField label="Personalization cost" htmlFor="product-personalization-cost" hint="Charged per quantity when the customer chooses personalization.">
              <PriceInput
                id="product-personalization-cost"
                value={form.personalizationCostInPaise}
                onChange={(paise) => patchForm({ personalizationCostInPaise: paise })}
              />
            </FormField>
          )}
          <div className="flex flex-col gap-3">
            {(form.personalizationFields ?? []).map((f, i) => (
              <div key={i} className="rounded-(--radius-md) border border-(--color-border-soft) p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-(--color-text-muted)">Field {i + 1}</span>
                  <button type="button" onClick={() => removePersonalizationField(i)} aria-label="Remove field" className="cursor-pointer text-(--color-error)">
                    <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <TextInput placeholder="Key (e.g. child_name)" value={f.fieldKey} onChange={(e) => patchPersonalizationField(i, { fieldKey: e.target.value })} />
                  <TextInput placeholder="Label shown to customer" value={f.label} onChange={(e) => patchPersonalizationField(i, { label: e.target.value })} />
                  <SelectInput
                    options={PERSONALIZATION_FIELD_TYPES.map((t) => ({ value: t, label: t }))}
                    value={f.fieldType}
                    onChange={(e) => patchPersonalizationField(i, { fieldType: e.target.value as PersonalizationFieldType })}
                  />
                  <NumberInput placeholder="Max length" value={f.maxLength ?? 0} onChange={(n) => patchPersonalizationField(i, { maxLength: n || null })} />
                </div>
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-(--color-charcoal)">
                  <input type="checkbox" checked={f.isRequired} onChange={(e) => patchPersonalizationField(i, { isRequired: e.target.checked })} />
                  Required
                </label>
              </div>
            ))}
            <button type="button" onClick={addPersonalizationField} className="btn btn-secondary inline-flex w-fit items-center gap-1.5 px-3 py-1.5 text-xs">
              <Plus size={13} strokeWidth={2} aria-hidden="true" />
              Add field
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label htmlFor="product-active" className="text-sm font-medium text-(--color-charcoal)">
            Active
          </label>
          <ToggleSwitch id="product-active" checked={form.isActive} onChange={(v) => patchForm({ isActive: v })} />
        </div>
      </AdminDrawerForm>

      <AdminConfirmDialog
        open={!!archiveTarget}
        title="Archive this product?"
        message={
          <>
            Archive <strong>{archiveTarget?.title}</strong>? It will no longer show in the shop.
          </>
        }
        submitting={archiving}
        onConfirm={onArchiveConfirm}
        onCancel={() => setArchiveTarget(null)}
      />

      <StockAdjustDrawer product={stockTarget} onClose={() => setStockTarget(null)} onAdjusted={reload} />

      <CategoriesManagerDrawer
        open={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
        categories={categories}
        onChanged={() => {
          void reloadCategories();
          reload();
        }}
      />
    </div>
  );
}

// ─── Stock adjustment drawer ────────────────────────────────────────────────

export function StockAdjustDrawer({ product, onClose, onAdjusted }: { product: Product | null; onClose: () => void; onAdjusted: () => void }) {
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState<InventoryLedgerReasonType>("RESTOCK");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ id: string; changeQuantity: number; reason: string; note: string | null; createdAt: string }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!product) return;
    setDelta(0);
    setReason("RESTOCK");
    setNote("");
    setError(null);
    setHistoryLoading(true);
    getProductStockHistory(product.id, 1, 10)
      .then((res) => setHistory(res.items))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [product]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!product || delta === 0) {
      setError("Enter a non-zero quantity change.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await adjustProductStock(product.id, { delta, reason, note: note.trim() || undefined });
      
      if (result.statusFlag === "LOW_STOCK" || result.statusFlag === "OUT_OF_STOCK") {
        const label = result.statusFlag === "OUT_OF_STOCK" ? "out of stock" : "low on stock";
        toast({ tone: "warning", title: "Stock adjusted", description: `Warning: This product is now ${label} (${result.quantityAvailable} remaining).` });
      } else {
        toast({ tone: "success", title: "Stock adjusted" });
      }

      window.dispatchEvent(new Event("inventory-updated"));
      onAdjusted();
      onClose();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Could not adjust stock.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminDrawerForm
      open={!!product}
      onClose={onClose}
      title={product ? `Adjust Stock — ${product.title}` : "Adjust Stock"}
      description={product?.stock ? `Currently ${product.stock.quantityAvailable} in stock.` : undefined}
      onSubmit={onSubmit}
      submitting={submitting}
      submitLabel="Apply adjustment"
      error={error}
    >
      <FormField label="Quantity change" htmlFor="stock-delta" required hint="Use a negative number to remove stock.">
        <NumberInput id="stock-delta" value={delta} onChange={setDelta} />
      </FormField>
      <FormField label="Reason" htmlFor="stock-reason" required>
        <SelectInput
          id="stock-reason"
          options={INVENTORY_LEDGER_REASONS.map((r) => ({ value: r, label: r.replace("_", " ") }))}
          value={reason}
          onChange={(e) => setReason(e.target.value as InventoryLedgerReasonType)}
        />
      </FormField>
      <FormField label="Note" htmlFor="stock-note" hint="Optional — e.g. supplier reference or reason for correction.">
        <TextArea id="stock-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
      </FormField>

      <div>
        <p className="mb-2 text-[0.8125rem] font-medium text-(--color-charcoal)">Recent history</p>
        {historyLoading ? (
          <p className="text-xs text-(--color-text-muted)">Loading…</p>
        ) : history.length === 0 ? (
          <p className="text-xs text-(--color-text-muted)">No adjustments recorded yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between rounded-sm bg-(--color-surface) px-2.5 py-1.5 text-xs">
                <span className={h.changeQuantity >= 0 ? "text-(--color-success)" : "text-(--color-error)"}>
                  {h.changeQuantity >= 0 ? `+${h.changeQuantity}` : h.changeQuantity} · {h.reason.replace("_", " ")}
                </span>
                <span className="text-(--color-text-muted)">{formatDateTime(h.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminDrawerForm>
  );
}

// ─── Category manager drawer ────────────────────────────────────────────────

function CategoriesManagerDrawer({
  open,
  onClose,
  categories,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  categories: ProductCategory[];
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const toast = useToast();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createProductCategory({ name: name.trim(), slug: "", displayOrder: categories.length, isActive: true });
      setName("");
      onChanged();
      toast({ tone: "success", title: "Category added" });
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Could not add category.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(cat: ProductCategory) {
    setBusyId(cat.id);
    try {
      await updateProductCategory(cat.id, { isActive: !cat.isActive });
      onChanged();
    } catch (err) {
      toast({ tone: "error", title: "Could not update category", description: err instanceof AdminApiError ? err.message : undefined });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(cat: ProductCategory) {
    if (!window.confirm(`Delete category "${cat.name}"? Products keep their other tags.`)) return;
    setBusyId(cat.id);
    try {
      await deleteProductCategory(cat.id);
      onChanged();
      toast({ tone: "success", title: "Category deleted" });
    } catch (err) {
      toast({ tone: "error", title: "Could not delete category", description: err instanceof AdminApiError ? err.message : undefined });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminDrawerForm open={open} onClose={onClose} title="Manage Categories" description="Categories group products for shop filtering and navigation." onSubmit={onSubmit} submitting={submitting} submitLabel="Add category" error={error}>
      <div className="flex flex-col gap-2">
        {categories.length === 0 && <p className="text-sm text-(--color-text-muted)">No categories yet — add the first one below.</p>}
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-2 rounded-sm border border-(--color-border-soft) px-3 py-2">
            <span className="min-w-0 truncate text-sm">{c.name}</span>
            <div className="flex shrink-0 items-center gap-2">
              {busyId === c.id ? (
                <Loader2 size={14} className="animate-spin text-(--color-text-muted)" aria-hidden="true" />
              ) : (
                <>
                  <ToggleSwitch checked={c.isActive} onChange={() => toggleActive(c)} label={`${c.name} active`} />
                  <button type="button" onClick={() => remove(c)} aria-label={`Delete ${c.name}`} className="cursor-pointer text-(--color-error)">
                    <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <FormField label="New category name" htmlFor="new-category-name">
        <TextInput id="new-category-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Return Gifts" />
      </FormField>
    </AdminDrawerForm>
  );
}
