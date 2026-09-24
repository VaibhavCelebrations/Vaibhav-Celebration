"use client";

import { Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AdminApiError } from "@/lib/admin-api-client";
import {
  extraServicesRepo,
  fetchPackageMatrix,
  savePackageMatrix,
} from "@/lib/data/packages";
import { AdminConfirmDialog } from "@/components/ui/AdminConfirmDialog";
import { AdminModalForm } from "@/components/ui/AdminModalForm";
import { FormField } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { NumberInput, PriceInput, TextArea, TextInput, ToggleSwitch } from "@/components/ui/fields";
import { productsRepo } from "@/lib/data/products";
import { themesRepo } from "@/lib/data/themes";
import type { ExtraService, ExtraServiceInput, PackageMatrixRow, Product, Theme } from "@/types/cms";
import {
  ServiceProductAssignments,
  themesMissingProducts,
  type ThemeProductMap,
} from "./ServiceProductAssignments";

type Tab = "matrix" | "services";

const SELECTION_COUNTS = [1, 2, 3] as const;

type MatrixState = {
  packages: PackageMatrixRow[];
  extraServices: ExtraService[];
};

const EMPTY_SERVICE: ExtraServiceInput = {
  label: "",
  description: "",
  requirements: "",
  customizationPriceInPaise: 0,
  displayOrder: 0,
  isActive: true,
  isProductChoice: false,
  selectionCount: 1,
  isPerGroup: false,
};

export function PackagesScreen() {
  const [tab, setTab] = useState<Tab>("matrix");
  const [matrix, setMatrix] = useState<MatrixState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [serviceDrawer, setServiceDrawer] = useState(false);
  const [editingService, setEditingService] = useState<ExtraService | null>(null);
  const [serviceForm, setServiceForm] = useState<ExtraServiceInput>(EMPTY_SERVICE);
  const [serviceSubmitting, setServiceSubmitting] = useState(false);
  const [serviceFormError, setServiceFormError] = useState<string | null>(null);
  const [archiveService, setArchiveService] = useState<ExtraService | null>(null);
  const [archiving, setArchiving] = useState(false);

  // Product-choice ("Customize") setup — loaded lazily the first time it's needed, then reused.
  const [themes, setThemes] = useState<Theme[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [themeProducts, setThemeProducts] = useState<ThemeProductMap>({});

  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPackageMatrix();
      setMatrix({
        extraServices: data.extraServices,
        packages: data.packages.map((pkg) => ({
          packageId: pkg.id,
          title: pkg.title,
          displayName: pkg.displayName,
          description: pkg.description,
          priceInPaise: pkg.priceInPaise,
          isRecommended: pkg.isRecommended,
          isActive: pkg.isActive,
          isCustomizable: pkg.isCustomizable,
          items: data.extraServices.map((svc) => {
            const existing = pkg.serviceItems.find((i) => i.extraServiceId === svc.id);
            return {
              extraServiceId: svc.id,
              isIncluded: existing?.isIncluded ?? false,
            };
          }),
        })),
      });
      setDirty(false);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Could not load package matrix.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function patchPackage(packageId: string, patch: Partial<PackageMatrixRow>) {
    setMatrix((current) => {
      if (!current) return current;
      return {
        ...current,
        packages: current.packages.map((p) =>
          p.packageId === packageId ? { ...p, ...patch } : p,
        ),
      };
    });
    setDirty(true);
  }

  function patchInclusion(packageId: string, extraServiceId: string, isIncluded: boolean) {
    setMatrix((current) => {
      if (!current) return current;
      return {
        ...current,
        packages: current.packages.map((p) =>
          p.packageId === packageId
            ? {
                ...p,
                items: p.items.map((item) =>
                  item.extraServiceId === extraServiceId ? { ...item, isIncluded } : item,
                ),
              }
            : p,
        ),
      };
    });
    setDirty(true);
  }

  function patchServicePrice(extraServiceId: string, customizationPriceInPaise: number) {
    setMatrix((current) => {
      if (!current) return current;
      return {
        ...current,
        extraServices: current.extraServices.map((svc) =>
          svc.id === extraServiceId ? { ...svc, customizationPriceInPaise } : svc,
        ),
      };
    });
    setDirty(true);
  }

  async function onSaveMatrix() {
    if (!matrix) return;
    setSaving(true);
    try {
      await savePackageMatrix({
        packages: matrix.packages,
        extraServices: matrix.extraServices.map((svc) => ({
          id: svc.id,
          customizationPriceInPaise: svc.customizationPriceInPaise,
        })),
      });
      toast({ tone: "success", title: "Packages saved" });
      setDirty(false);
      await load();
    } catch (err) {
      toast({
        tone: "error",
        title: "Could not save packages",
        description: err instanceof AdminApiError ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  /** Themes + products are only needed once a service is a product-choice one; fetch once. */
  const ensureCatalog = useCallback(async () => {
    if (catalogLoaded) return;
    const [themeRes, productRes] = await Promise.all([
      themesRepo.list({ page: 1, pageSize: 100, sort: "displayOrder", dir: "asc" }),
      productsRepo.list({ page: 1, pageSize: 500, filters: { isActive: "true" } }),
    ]);
    setThemes(themeRes.items);
    setProducts(productRes.items);
    setCatalogLoaded(true);
  }, [catalogLoaded]);

  async function loadAssignments(serviceId: string | null) {
    setAssignmentsLoading(true);
    try {
      await ensureCatalog();
      const rows = serviceId ? await extraServicesRepo.products(serviceId) : [];
      setThemeProducts(Object.fromEntries(rows.map((r) => [r.themeId, r.productIds])));
    } catch (err) {
      setServiceFormError(err instanceof AdminApiError ? err.message : "Could not load themes and products.");
    } finally {
      setAssignmentsLoading(false);
    }
  }

  function openCreateService() {
    setEditingService(null);
    setServiceForm({
      ...EMPTY_SERVICE,
      displayOrder: (matrix?.extraServices.length ?? 0) + 1,
    });
    setThemeProducts({});
    setServiceFormError(null);
    setServiceDrawer(true);
  }

  function openEditService(svc: ExtraService) {
    setEditingService(svc);
    setServiceForm({
      label: svc.label,
      description: svc.description ?? "",
      requirements: svc.requirements ?? "",
      customizationPriceInPaise: svc.customizationPriceInPaise,
      displayOrder: svc.displayOrder,
      isActive: svc.isActive,
      isProductChoice: svc.isProductChoice ?? false,
      selectionCount: svc.selectionCount ?? 1,
      isPerGroup: svc.isPerGroup ?? false,
    });
    setThemeProducts({});
    setServiceFormError(null);
    setServiceDrawer(true);
    if (svc.isProductChoice) void loadAssignments(svc.id);
  }

  function onToggleProductChoice(enabled: boolean) {
    setServiceForm((f) => ({ ...f, isProductChoice: enabled }));
    if (enabled && Object.keys(themeProducts).length === 0) void loadAssignments(editingService?.id ?? null);
  }

  async function onServiceSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServiceFormError(null);
    if (serviceForm.isProductChoice) {
      const missing = themesMissingProducts(themes, themeProducts, serviceForm.selectionCount);
      if (missing.length) {
        setServiceFormError(
          `Select at least ${serviceForm.selectionCount} product${serviceForm.selectionCount === 1 ? "" : "s"} for every theme. Missing: ${missing
            .map((t) => t.title)
            .join(", ")}.`,
        );
        return;
      }
    }
    setServiceSubmitting(true);
    try {
      const body: ExtraServiceInput = {
        ...serviceForm,
        description: serviceForm.description || null,
        requirements: serviceForm.requirements || null,
        ...(serviceForm.isProductChoice
          ? {
              themeProducts: themes.map((t) => ({ themeId: t.id, productIds: themeProducts[t.id] ?? [] })),
            }
          : {}),
      };
      if (editingService) {
        await extraServicesRepo.update(editingService.id, body);
        toast({ tone: "success", title: "Extra service updated" });
      } else {
        await extraServicesRepo.create(body);
        toast({ tone: "success", title: "Extra service added" });
      }
      setServiceDrawer(false);
      await load();
    } catch (err) {
      setServiceFormError(err instanceof AdminApiError ? err.message : "Could not save extra service.");
    } finally {
      setServiceSubmitting(false);
    }
  }

  async function onArchiveServiceConfirm() {
    if (!archiveService) return;
    setArchiving(true);
    try {
      await extraServicesRepo.archive(archiveService.id);
      toast({ tone: "success", title: "Extra service archived" });
      setArchiveService(null);
      await load();
    } catch (err) {
      toast({
        tone: "error",
        title: "Could not archive service",
        description: err instanceof AdminApiError ? err.message : undefined,
      });
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Content"
        title="Packages"
        description="Manage pricing for the three live celebration tiers. Inactive leftover packages and unused extra services are hidden from this matrix."
        actions={
          <div className="flex items-center gap-2">
            {tab === "matrix" && (
              <button
                type="button"
                onClick={() => void onSaveMatrix()}
                disabled={!dirty || saving || loading}
                className="btn btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save matrix
              </button>
            )}
            {tab === "services" && (
              <button type="button" onClick={openCreateService} className="btn btn-primary px-4 py-2 text-sm">
                <Plus size={16} /> Add extra service
              </button>
            )}
          </div>
        }
      />

      <div className="mb-5 flex gap-1 rounded-lg border border-(--color-border) bg-(--color-surface) p-1 w-fit">
        {(
          [
            { id: "matrix" as const, label: "Package matrix" },
            { id: "services" as const, label: "Extra services" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`cursor-pointer rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-(--color-mocha) text-white shadow-sm"
                : "text-(--color-text-muted) hover:text-(--color-charcoal)"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="card mb-4 border-(--color-error) p-4 text-sm text-(--color-error)">
          {error}{" "}
          <button type="button" className="underline" onClick={() => void load()}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-(--color-text-muted)">Loading packages…</p>
      ) : tab === "matrix" && matrix ? (
        <PackageMatrixEditor
          matrix={matrix}
          onPatchPackage={patchPackage}
          onPatchInclusion={patchInclusion}
          onPatchServicePrice={patchServicePrice}
        />
      ) : tab === "services" && matrix ? (
        <ExtraServicesList
          services={matrix.extraServices}
          onEdit={openEditService}
          onArchive={setArchiveService}
        />
      ) : null}

      <AdminModalForm
        open={serviceDrawer}
        onClose={() => setServiceDrawer(false)}
        title={editingService ? "Edit extra service" : "Add extra service"}
        onSubmit={onServiceSubmit}
        submitting={serviceSubmitting}
        error={serviceFormError}
        dirty
        size="lg"
      >
        <FormField label="Label" htmlFor="svc-label" required>
          <TextInput
            id="svc-label"
            value={serviceForm.label}
            onChange={(e) => setServiceForm({ ...serviceForm, label: e.target.value })}
            required
          />
        </FormField>
        <FormField label="Description" htmlFor="svc-desc">
          <TextArea
            id="svc-desc"
            value={serviceForm.description ?? ""}
            onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
            rows={3}
          />
        </FormField>
        <FormField
          label="Requirements"
          htmlFor="svc-req"
          hint="What the customer must provide when selecting this service."
        >
          <TextArea
            id="svc-req"
            value={serviceForm.requirements ?? ""}
            onChange={(e) => setServiceForm({ ...serviceForm, requirements: e.target.value })}
            rows={3}
          />
        </FormField>
        <FormField
          label="Customization price"
          htmlFor="svc-price"
          hint="Charged when a guest adds this service to a package that does not include it."
        >
          <PriceInput
            id="svc-price"
            value={serviceForm.customizationPriceInPaise}
            onChange={(paise) => setServiceForm({ ...serviceForm, customizationPriceInPaise: paise })}
          />
        </FormField>
        <FormField label="Display order" htmlFor="svc-order">
          <NumberInput
            id="svc-order"
            value={serviceForm.displayOrder}
            onChange={(n) => setServiceForm({ ...serviceForm, displayOrder: n })}
            min={0}
          />
        </FormField>
        <div className="flex items-center justify-between">
          <label htmlFor="svc-active" className="text-sm font-medium text-(--color-charcoal)">
            Active
          </label>
          <ToggleSwitch
            id="svc-active"
            checked={serviceForm.isActive}
            onChange={(isActive) => setServiceForm({ ...serviceForm, isActive })}
          />
        </div>

        <div className="mt-4 rounded-lg border border-(--color-border-soft) p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              id="svc-choice"
              className="mt-0.5 h-4 w-4 cursor-pointer accent-(--color-mocha)"
              checked={serviceForm.isProductChoice}
              onChange={(e) => onToggleProductChoice(e.target.checked)}
            />
            <span>
              <span className="block text-sm font-medium text-(--color-charcoal)">
                Customize — customer picks products for this service
              </span>
              <span className="block text-xs text-(--color-text-muted)">
                Shown in the &ldquo;Customize&rdquo; step for every package that includes this service in the matrix.
              </span>
            </span>
          </label>

          {serviceForm.isProductChoice && (
            <div className="mt-4 space-y-4 border-t border-(--color-border-soft) pt-4">
              <FormField
                label="How many products can the customer select?"
                htmlFor="svc-count"
                hint={`Shown to customers as “${serviceForm.label || "Service"} — choose ${serviceForm.selectionCount}”.`}
              >
                <div id="svc-count" className="flex gap-2" role="radiogroup">
                  {SELECTION_COUNTS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={serviceForm.selectionCount === n}
                      onClick={() => setServiceForm({ ...serviceForm, selectionCount: n })}
                      className={`h-10 w-14 cursor-pointer rounded-md border text-sm font-semibold transition-colors ${
                        serviceForm.selectionCount === n
                          ? "border-(--color-mocha) bg-(--color-mocha) text-white"
                          : "border-(--color-border) hover:border-(--color-mocha)"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </FormField>

              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="svc-group" className="text-sm font-medium text-(--color-charcoal)">
                    Charge per group
                  </label>
                  <p className="text-xs text-(--color-text-muted)">
                    Off: price × number of children. On: price charged once per group (e.g. family activity).
                  </p>
                </div>
                <ToggleSwitch
                  id="svc-group"
                  checked={serviceForm.isPerGroup}
                  onChange={(isPerGroup) => setServiceForm({ ...serviceForm, isPerGroup })}
                />
              </div>

              <div>
                <p className="mb-1 text-sm font-medium text-(--color-charcoal)">Products per theme</p>
                <p className="mb-2 text-xs text-(--color-text-muted)">
                  Choose which products customers can pick under each theme. Every active theme needs at least{" "}
                  {serviceForm.selectionCount}.
                </p>
                {assignmentsLoading || !catalogLoaded ? (
                  <p className="flex items-center gap-2 text-sm text-(--color-text-muted)">
                    <Loader2 size={14} className="animate-spin" /> Loading themes and products…
                  </p>
                ) : (
                  <ServiceProductAssignments
                    themes={themes}
                    products={products}
                    value={themeProducts}
                    selectionCount={serviceForm.selectionCount}
                    onChange={setThemeProducts}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </AdminModalForm>

      <AdminConfirmDialog
        open={!!archiveService}
        title="Archive this extra service?"
        message={
          <>
            Archive <strong>{archiveService?.label}</strong>? It will be removed from the matrix for new
            configurations.
          </>
        }
        submitting={archiving}
        onConfirm={onArchiveServiceConfirm}
        onCancel={() => setArchiveService(null)}
      />
    </div>
  );
}

function PackageMatrixEditor({
  matrix,
  onPatchPackage,
  onPatchInclusion,
  onPatchServicePrice,
}: {
  matrix: MatrixState;
  onPatchPackage: (packageId: string, patch: Partial<PackageMatrixRow>) => void;
  onPatchInclusion: (packageId: string, extraServiceId: string, isIncluded: boolean) => void;
  onPatchServicePrice: (extraServiceId: string, customizationPriceInPaise: number) => void;
}) {
  const liveServices = matrix.extraServices.filter((svc) => svc.isActive);
  const colCount = matrix.packages.length + 2;

  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-(--color-border-soft) bg-(--color-surface)">
            <th className="sticky left-0 z-10 min-w-[220px] bg-(--color-surface) px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)">
              Service / Option
            </th>
            <th className="min-w-[140px] border-l border-(--color-border-soft) px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)">
              Customize price
            </th>
            {matrix.packages.map((pkg) => (
              <th
                key={pkg.packageId}
                className="min-w-[180px] border-l border-(--color-border-soft) px-4 py-3 text-left align-top"
              >
                <div className="space-y-2">
                  <input
                    className="input w-full font-semibold"
                    value={pkg.title ?? ""}
                    onChange={(e) => onPatchPackage(pkg.packageId, { title: e.target.value })}
                  />
                  <input
                    className="input w-full text-xs"
                    placeholder="Customer-facing name"
                    value={pkg.displayName ?? ""}
                    onChange={(e) => onPatchPackage(pkg.packageId, { displayName: e.target.value || null })}
                  />
                  <textarea
                    className="input w-full text-xs"
                    rows={2}
                    placeholder="Package description"
                    value={pkg.description ?? ""}
                    onChange={(e) =>
                      onPatchPackage(pkg.packageId, { description: e.target.value || null })
                    }
                  />
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase text-(--color-text-muted)">
                      Package price
                    </label>
                    <PriceInput
                      value={pkg.priceInPaise ?? 0}
                      onChange={(paise) => onPatchPackage(pkg.packageId, { priceInPaise: paise })}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={!!pkg.isRecommended}
                      onChange={(e) =>
                        onPatchPackage(pkg.packageId, { isRecommended: e.target.checked })
                      }
                    />
                    Recommended
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={!!pkg.isCustomizable}
                      onChange={(e) =>
                        onPatchPackage(pkg.packageId, { isCustomizable: e.target.checked })
                      }
                    />
                    Customizable
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={!!pkg.isActive}
                      onChange={(e) => onPatchPackage(pkg.packageId, { isActive: e.target.checked })}
                    />
                    Active
                  </label>
                </div>
              </th>
            ))}
          </tr>
          <tr className="border-b border-(--color-border-soft) bg-(--color-surface)/60">
            <th className="sticky left-0 z-10 bg-(--color-surface)/60 px-4 py-2 text-left text-[10px] font-semibold uppercase text-(--color-text-muted)">
              Included
            </th>
            <th className="border-l border-(--color-border-soft) px-4 py-2 text-[10px] font-semibold uppercase text-(--color-text-muted)">
              Add-on price
            </th>
            {matrix.packages.map((pkg) => (
              <th
                key={`inc-${pkg.packageId}`}
                className="border-l border-(--color-border-soft) px-4 py-2 text-center text-[10px] font-semibold uppercase text-(--color-text-muted)"
              >
                Include
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {liveServices.map((svc) => (
            <tr key={svc.id} className="border-b border-(--color-border-soft) hover:bg-(--color-surface)/40">
              <td className="sticky left-0 z-10 bg-white px-4 py-3 align-top">
                <p className="font-medium text-(--color-charcoal)">{svc.label}</p>
                {svc.isProductChoice && <ChoiceBadge svc={svc} />}
                {svc.description && (
                  <p className="mt-0.5 text-xs text-(--color-text-muted) line-clamp-2">{svc.description}</p>
                )}
                {svc.requirements && (
                  <p className="mt-1 text-[10px] text-(--color-mocha)">Req: {svc.requirements}</p>
                )}
              </td>
              <td className="border-l border-(--color-border-soft) px-4 py-3 align-top">
                <PriceInput
                  value={svc.customizationPriceInPaise ?? 0}
                  onChange={(paise) => onPatchServicePrice(svc.id, paise)}
                />
              </td>
              {matrix.packages.map((pkg) => {
                const cell = pkg.items.find((i) => i.extraServiceId === svc.id);
                if (!cell) return <td key={`${pkg.packageId}-${svc.id}`} />;
                return (
                  <td
                    key={`${pkg.packageId}-${svc.id}`}
                    className="border-l border-(--color-border-soft) px-4 py-3 text-center align-middle"
                  >
                    <input
                      type="checkbox"
                      checked={!!cell.isIncluded}
                      onChange={(e) =>
                        onPatchInclusion(pkg.packageId, svc.id, e.target.checked)
                      }
                      aria-label={`Include ${svc.label} in ${pkg.title}`}
                      className="h-4 w-4 cursor-pointer rounded border-(--color-border) accent-(--color-mocha)"
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-(--color-surface)">
            <td colSpan={colCount} className="px-4 py-3 text-xs text-(--color-text-muted)">
              Check a box to include a service in that package. The customize price applies when guests add
              non-included services during a customized purchase.
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function ChoiceBadge({ svc }: { svc: ExtraService }) {
  return (
    <span className="mt-1 inline-block rounded bg-(--color-mocha)/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-(--color-mocha)">
      Customer picks {svc.selectionCount}
      {svc.isPerGroup ? " · per group" : ""}
    </span>
  );
}

function ExtraServicesList({
  services,
  onEdit,
  onArchive,
}: {
  services: ExtraService[];
  onEdit: (svc: ExtraService) => void;
  onArchive: (svc: ExtraService) => void;
}) {
  if (services.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-sm text-(--color-text-muted)">No extra services yet. Add your first option.</p>
      </div>
    );
  }

  return (
    <div className="card divide-y divide-(--color-border-soft) p-0">
      {services.map((svc) => (
        <div key={svc.id} className="flex items-start justify-between gap-4 px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-(--color-charcoal)">{svc.label}</p>
              {!svc.isActive && (
                <span className="rounded bg-(--color-surface-alt) px-2 py-0.5 text-[10px] font-semibold uppercase text-(--color-text-muted)">
                  Inactive
                </span>
              )}
              {svc.isProductChoice && <ChoiceBadge svc={svc} />}
            </div>
            {svc.description && (
              <p className="mt-1 text-sm text-(--color-text-muted)">{svc.description}</p>
            )}
            {svc.requirements && (
              <p className="mt-1 text-xs text-(--color-mocha)">
                <strong>Requirements:</strong> {svc.requirements}
              </p>
            )}
            <p className="mt-1 text-xs text-(--color-text-muted)">
              Customize price: ₹{(svc.customizationPriceInPaise / 100).toLocaleString("en-IN")}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              aria-label="Edit"
              className="btn btn-ghost p-2"
              onClick={() => onEdit(svc)}
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              aria-label="Delete"
              className="btn btn-ghost p-2 text-(--color-error)"
              onClick={() => onArchive(svc)}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
