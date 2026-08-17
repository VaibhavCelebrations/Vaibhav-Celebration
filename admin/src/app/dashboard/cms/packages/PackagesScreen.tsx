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
import { AdminDrawerForm } from "@/components/ui/AdminDrawerForm";
import { FormField } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { NumberInput, PriceInput, TextArea, TextInput, ToggleSwitch } from "@/components/ui/fields";
import type { ExtraService, ExtraServiceInput, PackageMatrixRow } from "@/types/cms";

type Tab = "matrix" | "services";

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
          badgeText: pkg.badgeText,
          pricingUnit: pkg.pricingUnit,
          hasGiftRegistry: pkg.hasGiftRegistry,
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

  function openCreateService() {
    setEditingService(null);
    setServiceForm({
      ...EMPTY_SERVICE,
      displayOrder: (matrix?.extraServices.length ?? 0) + 1,
    });
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
    });
    setServiceFormError(null);
    setServiceDrawer(true);
  }

  async function onServiceSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServiceSubmitting(true);
    setServiceFormError(null);
    try {
      const body = {
        ...serviceForm,
        description: serviceForm.description || null,
        requirements: serviceForm.requirements || null,
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

      <AdminDrawerForm
        open={serviceDrawer}
        onClose={() => setServiceDrawer(false)}
        title={editingService ? "Edit extra service" : "Add extra service"}
        onSubmit={onServiceSubmit}
        submitting={serviceSubmitting}
        error={serviceFormError}
        dirty
        width="lg"
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
      </AdminDrawerForm>

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
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="input w-full text-xs"
                      placeholder="Badge text"
                      value={pkg.badgeText ?? ""}
                      onChange={(e) => onPatchPackage(pkg.packageId, { badgeText: e.target.value || null })}
                    />
                    <input
                      className="input w-full text-xs"
                      placeholder="Pricing unit"
                      value={pkg.pricingUnit ?? ""}
                      onChange={(e) => onPatchPackage(pkg.packageId, { pricingUnit: e.target.value || null })}
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
                      checked={!!pkg.hasGiftRegistry}
                      onChange={(e) =>
                        onPatchPackage(pkg.packageId, { hasGiftRegistry: e.target.checked })
                      }
                    />
                    Gift registry
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
              aria-label="Archive"
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
