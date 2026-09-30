"use client";

import { ArrowDown, ArrowUp, GripVertical, Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, type DragEvent, type FormEvent } from "react";
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
import { MediaPicker, MediaThumb } from "@/components/ui/MediaPicker";
import {
  CELEBRATION_STAGES,
  CELEBRATION_STAGE_LABELS,
  type ExtraService,
  type ExtraServiceInput,
  type PackageMatrixRow,
  type Product,
  type Theme,
} from "@/types/cms";
import type { MediaRef } from "@/types/common";
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
  hasPreview: false,
  celebrationStage: null,
};

/** How the customer meets a service in the builder. Exactly one applies. */
type ServiceMode = "included" | "preview" | "choice";

const SERVICE_MODES: Array<{ id: ServiceMode; title: string; hint: string }> = [
  { id: "included", title: "Included only", hint: "Listed as part of the package. Nothing to view or choose." },
  { id: "preview", title: "Preview", hint: "Customer sees your images and videos of it. Nothing to choose." },
  { id: "choice", title: "Customize", hint: "Customer picks 1, 2 or 3 products for it." },
];

const MAX_PREVIEW_MEDIA = 20;

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

  // Preview setup — theme id → that theme's images/videos, in the order the customer sees them.
  // Previews are always per theme: the customer sees the set for the theme they chose.
  const [themePreviews, setThemePreviews] = useState<Record<string, MediaRef[]>>({});
  const [previewLoading, setPreviewLoading] = useState(false);

  // What the form held when it opened, and whether products/previews were edited since —
  // so closing an untouched form never asks to discard changes.
  const [serviceFormSnapshot, setServiceFormSnapshot] = useState("");
  const [serviceListsTouched, setServiceListsTouched] = useState(false);
  const serviceDirty = serviceListsTouched || JSON.stringify(serviceForm) !== serviceFormSnapshot;

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

  /**
   * Put the services in a new order everywhere at once: the services list, the matrix rows and
   * each package's item list (so a later "Save matrix" keeps this order). Saved immediately.
   */
  async function applyServiceOrder(orderedIds: string[]) {
    if (!matrix) return;
    const rank = new Map(orderedIds.map((id, index) => [id, index]));
    const byRank = (a: string, b: string) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0);
    const previous = matrix;
    setMatrix({
      extraServices: [...matrix.extraServices].sort((a, b) => byRank(a.id, b.id)),
      packages: matrix.packages.map((p) => ({
        ...p,
        items: [...p.items].sort((a, b) => byRank(a.extraServiceId, b.extraServiceId)),
      })),
    });
    try {
      await extraServicesRepo.reorder(orderedIds);
    } catch (err) {
      setMatrix(previous);
      toast({
        tone: "error",
        title: "Could not save the new order",
        description: err instanceof AdminApiError ? err.message : undefined,
      });
    }
  }

  /** Drop `fromId` onto `toId`: it takes that row's place (after it when moving down, before it when moving up). */
  function moveService(fromId: string, toId: string) {
    if (!matrix || fromId === toId) return;
    const ids = matrix.extraServices.map((svc) => svc.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, fromId);
    void applyServiceOrder(ids);
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
    const blank = { ...EMPTY_SERVICE, displayOrder: (matrix?.extraServices.length ?? 0) + 1 };
    setServiceForm(blank);
    setServiceFormSnapshot(JSON.stringify(blank));
    setServiceListsTouched(false);
    setThemeProducts({});
    setThemePreviews({});
    setServiceFormError(null);
    setServiceDrawer(true);
  }

  async function loadPreviewMedia(serviceId: string | null) {
    setPreviewLoading(true);
    try {
      await ensureCatalog();
      const rows = serviceId ? await extraServicesRepo.previewMedia(serviceId) : [];
      setThemePreviews(Object.fromEntries(rows.map((r) => [r.themeId, r.media])));
    } catch (err) {
      setServiceFormError(err instanceof AdminApiError ? err.message : "Could not load the preview files.");
    } finally {
      setPreviewLoading(false);
    }
  }

  function openEditService(svc: ExtraService) {
    setEditingService(svc);
    setServiceListsTouched(false);
    const initial: ExtraServiceInput = {
      label: svc.label,
      description: svc.description ?? "",
      requirements: svc.requirements ?? "",
      customizationPriceInPaise: svc.customizationPriceInPaise,
      displayOrder: svc.displayOrder,
      isActive: svc.isActive,
      isProductChoice: svc.isProductChoice ?? false,
      selectionCount: svc.selectionCount ?? 1,
      isPerGroup: svc.isPerGroup ?? false,
      hasPreview: svc.hasPreview ?? false,
      celebrationStage: svc.celebrationStage ?? null,
    };
    setServiceForm(initial);
    setServiceFormSnapshot(JSON.stringify(initial));
    setThemeProducts({});
    setThemePreviews({});
    setServiceFormError(null);
    setServiceDrawer(true);
    if (svc.isProductChoice) void loadAssignments(svc.id);
    if (svc.hasPreview) void loadPreviewMedia(svc.id);
  }

  const serviceMode: ServiceMode = serviceForm.hasPreview ? "preview" : serviceForm.isProductChoice ? "choice" : "included";

  function onServiceModeChange(mode: ServiceMode) {
    setServiceForm((f) => ({ ...f, hasPreview: mode === "preview", isProductChoice: mode === "choice" }));
    if (mode === "choice" && Object.keys(themeProducts).length === 0) void loadAssignments(editingService?.id ?? null);
    if (mode === "preview" && Object.keys(themePreviews).length === 0) void loadPreviewMedia(editingService?.id ?? null);
  }

  function patchThemePreview(themeId: string, update: (list: MediaRef[]) => MediaRef[]) {
    setServiceListsTouched(true);
    setThemePreviews((all) => ({ ...all, [themeId]: update(all[themeId] ?? []) }));
  }

  function movePreviewMedia(themeId: string, index: number, by: -1 | 1) {
    patchThemePreview(themeId, (list) => {
      const target = index + by;
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  // Only active themes are offered to customers, so only they need a preview.
  const previewThemes = themes.filter((t) => t.isActive !== false);
  const themesMissingPreview = previewThemes.filter((t) => (themePreviews[t.id]?.length ?? 0) === 0);

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
    if (serviceForm.hasPreview) {
      if (!serviceForm.celebrationStage) {
        setServiceFormError("Choose where the preview appears: Before, During or After the celebration.");
        return;
      }
      if (themesMissingPreview.length) {
        setServiceFormError(
          `Add at least one preview image or video for every theme. Missing: ${themesMissingPreview.map((t) => t.title).join(", ")}.`,
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
        ...(serviceForm.hasPreview
          ? {
              themePreviews: themes.map((t) => ({ themeId: t.id, mediaIds: (themePreviews[t.id] ?? []).map((m) => m.id) })),
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
          onMoveService={moveService}
        />
      ) : tab === "services" && matrix ? (
        <ExtraServicesList
          services={matrix.extraServices}
          onEdit={openEditService}
          onArchive={setArchiveService}
          onMoveService={moveService}
        />
      ) : null}

      <AdminModalForm
        open={serviceDrawer}
        onClose={() => setServiceDrawer(false)}
        title={editingService ? "Edit extra service" : "Add extra service"}
        onSubmit={onServiceSubmit}
        submitting={serviceSubmitting}
        error={serviceFormError}
        dirty={serviceDirty}
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
          <p id="svc-mode-label" className="text-sm font-medium text-(--color-charcoal)">
            How does the customer see this service?
          </p>
          <p className="mb-3 text-xs text-(--color-text-muted)">
            Applies in the &ldquo;Customize&rdquo; step of every package that includes this service in the matrix. A
            service is either previewed or customized, never both.
          </p>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-labelledby="svc-mode-label">
            {SERVICE_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                role="radio"
                aria-checked={serviceMode === mode.id}
                onClick={() => onServiceModeChange(mode.id)}
                className={`cursor-pointer rounded-md border p-3 text-left transition-colors ${
                  serviceMode === mode.id
                    ? "border-(--color-mocha) bg-(--color-mocha)/5"
                    : "border-(--color-border) hover:border-(--color-mocha)"
                }`}
              >
                <span className="block text-sm font-semibold text-(--color-charcoal)">{mode.title}</span>
                <span className="mt-0.5 block text-xs text-(--color-text-muted)">{mode.hint}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 border-t border-(--color-border-soft) pt-4">
            <FormField
              label="Celebration stage"
              htmlFor="svc-stage"
              hint={
                serviceForm.isProductChoice
                  ? "Where this service is listed on the package pages. In the Customize step it follows its products' category."
                  : "Where customers see this service: on the package pages and in the Customize step."
              }
              required={serviceForm.hasPreview}
            >
              <div id="svc-stage" className="flex flex-wrap gap-2" role="radiogroup">
                {CELEBRATION_STAGES.map((stage) => (
                  <button
                    key={stage}
                    type="button"
                    role="radio"
                    aria-checked={serviceForm.celebrationStage === stage}
                    onClick={() => setServiceForm({ ...serviceForm, celebrationStage: stage })}
                    className={`h-10 cursor-pointer rounded-md border px-3 text-sm font-medium transition-colors ${
                      serviceForm.celebrationStage === stage
                        ? "border-(--color-mocha) bg-(--color-mocha) text-white"
                        : "border-(--color-border) hover:border-(--color-mocha)"
                    }`}
                  >
                    {CELEBRATION_STAGE_LABELS[stage]}
                  </button>
                ))}
                {!serviceForm.hasPreview && (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={serviceForm.celebrationStage === null}
                    onClick={() => setServiceForm({ ...serviceForm, celebrationStage: null })}
                    className={`h-10 cursor-pointer rounded-md border px-3 text-sm font-medium transition-colors ${
                      serviceForm.celebrationStage === null
                        ? "border-(--color-mocha) bg-(--color-mocha) text-white"
                        : "border-(--color-border) hover:border-(--color-mocha)"
                    }`}
                  >
                    Not set
                  </button>
                )}
              </div>
            </FormField>
          </div>

          {serviceForm.hasPreview && (
            <div className="mt-4 space-y-4 border-t border-(--color-border-soft) pt-4">
              <div>
                <p className="mb-1 text-sm font-medium text-(--color-charcoal)">Preview per theme</p>
                <p className="mb-3 text-xs text-(--color-text-muted)">
                  Customers see the preview for the theme they choose, so each theme needs its own images or videos
                  (for example, the Space invite under Space and the Jungle invite under Jungle). Shown in this order;
                  the first one is the cover. Videos: MP4 or WebM, up to 50 MB.
                </p>
                {previewLoading || !catalogLoaded ? (
                  <p className="flex items-center gap-2 text-sm text-(--color-text-muted)">
                    <Loader2 size={14} className="animate-spin" /> Loading themes and preview files…
                  </p>
                ) : previewThemes.length === 0 ? (
                  <p className="text-sm text-(--color-text-muted)">Add a theme first. Previews are set for each theme.</p>
                ) : (
                  <div className="space-y-3">
                    {previewThemes.map((theme) => {
                      const list = themePreviews[theme.id] ?? [];
                      return (
                        <div key={theme.id} className="rounded-md border border-(--color-border-soft) p-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-(--color-charcoal)">{theme.title}</p>
                            <span
                              className={`text-xs font-medium ${list.length ? "text-(--color-text-muted)" : "text-(--color-error)"}`}
                            >
                              {list.length ? `${list.length} file${list.length === 1 ? "" : "s"}` : "No preview yet"}
                            </span>
                          </div>
                          {list.length > 0 && (
                            <ul className="mb-3 space-y-2">
                              {list.map((media, index) => (
                                <li
                                  key={media.id}
                                  className="flex items-center gap-3 rounded-md border border-(--color-border-soft) p-2"
                                >
                                  <MediaThumb media={media} className="h-12 w-16 shrink-0 rounded" />
                                  <span className="min-w-0 flex-1 truncate text-sm text-(--color-charcoal)">
                                    {media.altText || (media.type?.startsWith("video/") ? "Video" : "Image")}
                                    {index === 0 && (
                                      <span className="ml-2 rounded bg-(--color-mocha)/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-(--color-mocha)">
                                        Cover
                                      </span>
                                    )}
                                  </span>
                                  <button
                                    type="button"
                                    aria-label="Move up"
                                    disabled={index === 0}
                                    onClick={() => movePreviewMedia(theme.id, index, -1)}
                                    className="btn btn-ghost p-1.5 disabled:opacity-30"
                                  >
                                    <ArrowUp size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    aria-label="Move down"
                                    disabled={index === list.length - 1}
                                    onClick={() => movePreviewMedia(theme.id, index, 1)}
                                    className="btn btn-ghost p-1.5 disabled:opacity-30"
                                  >
                                    <ArrowDown size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    aria-label={`Remove from ${theme.title} preview`}
                                    onClick={() => patchThemePreview(theme.id, (l) => l.filter((m) => m.id !== media.id))}
                                    className="btn btn-ghost p-1.5 text-(--color-error)"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                          {list.length < MAX_PREVIEW_MEDIA && (
                            <MediaPicker
                              value={null}
                              kind="themes"
                              scope={theme.slug}
                              onChange={(media) => {
                                if (!media) return;
                                // Picking the same file twice would only duplicate it in the customer's gallery.
                                patchThemePreview(theme.id, (l) => (l.some((m) => m.id === media.id) ? l : [...l, media]));
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

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
                    onChange={(next) => {
                      setServiceListsTouched(true);
                      setThemeProducts(next);
                    }}
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

/**
 * Drag-to-reorder for a list of rows. The grip is what you drag; any row is a drop target.
 * Arrow buttons do the same one step at a time, for touch screens and keyboards
 * (browsers do not fire drag events for touch).
 */
function useRowReorder(onMove: (fromId: string, toId: string) => void) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const gripProps = (id: string) => ({
    draggable: true,
    onDragStart: (e: DragEvent<HTMLElement>) => {
      setDragId(id);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);
      // Show the whole row under the cursor, not just the grip.
      const row = e.currentTarget.closest("[data-reorder-row]");
      if (row) e.dataTransfer.setDragImage(row, 16, 16);
    },
    onDragEnd: () => {
      setDragId(null);
      setOverId(null);
    },
  });

  const rowProps = (id: string) => ({
    "data-reorder-row": true,
    onDragOver: (e: DragEvent<HTMLElement>) => {
      if (!dragId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (overId !== id) setOverId(id);
    },
    onDrop: (e: DragEvent<HTMLElement>) => {
      e.preventDefault();
      if (dragId && dragId !== id) onMove(dragId, id);
      setDragId(null);
      setOverId(null);
    },
  });

  return { dragId, overId, gripProps, rowProps };
}

function ReorderControls({
  label,
  index,
  count,
  gripProps,
  onStep,
}: {
  label: string;
  index: number;
  count: number;
  gripProps: ReturnType<ReturnType<typeof useRowReorder>["gripProps"]>;
  onStep: (by: -1 | 1) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 text-(--color-text-muted)">
      <span
        {...gripProps}
        title="Drag to reorder"
        aria-hidden="true"
        className="flex h-8 w-6 cursor-grab items-center justify-center rounded hover:bg-(--color-surface-alt) active:cursor-grabbing"
      >
        <GripVertical size={16} />
      </span>
      <div className="flex flex-col">
        <button
          type="button"
          aria-label={`Move ${label} up`}
          disabled={index === 0}
          onClick={() => onStep(-1)}
          className="flex h-4 w-5 cursor-pointer items-center justify-center rounded hover:bg-(--color-surface-alt) disabled:cursor-default disabled:opacity-25"
        >
          <ArrowUp size={12} />
        </button>
        <button
          type="button"
          aria-label={`Move ${label} down`}
          disabled={index === count - 1}
          onClick={() => onStep(1)}
          className="flex h-4 w-5 cursor-pointer items-center justify-center rounded hover:bg-(--color-surface-alt) disabled:cursor-default disabled:opacity-25"
        >
          <ArrowDown size={12} />
        </button>
      </div>
    </div>
  );
}

function PackageMatrixEditor({
  matrix,
  onPatchPackage,
  onPatchInclusion,
  onPatchServicePrice,
  onMoveService,
}: {
  matrix: MatrixState;
  onPatchPackage: (packageId: string, patch: Partial<PackageMatrixRow>) => void;
  onPatchInclusion: (packageId: string, extraServiceId: string, isIncluded: boolean) => void;
  onPatchServicePrice: (extraServiceId: string, customizationPriceInPaise: number) => void;
  onMoveService: (fromId: string, toId: string) => void;
}) {
  const liveServices = matrix.extraServices.filter((svc) => svc.isActive);
  const reorder = useRowReorder(onMoveService);
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
          {liveServices.map((svc, index) => (
            <tr
              key={svc.id}
              {...reorder.rowProps(svc.id)}
              className={`border-b border-(--color-border-soft) hover:bg-(--color-surface)/40 ${
                reorder.dragId === svc.id ? "opacity-40" : ""
              } ${reorder.overId === svc.id && reorder.dragId !== svc.id ? "outline-2 -outline-offset-2 outline-(--color-mocha)" : ""}`}
            >
              <td className="sticky left-0 z-10 bg-white px-2 py-3 align-top">
                <div className="flex items-start gap-1.5">
                <ReorderControls
                  label={svc.label}
                  index={index}
                  count={liveServices.length}
                  gripProps={reorder.gripProps(svc.id)}
                  onStep={(by) => onMoveService(svc.id, liveServices[index + by]!.id)}
                />
                <div className="min-w-0">
                <p className="font-medium text-(--color-charcoal)">{svc.label}</p>
                {svc.isProductChoice && <ChoiceBadge svc={svc} />}
                {svc.hasPreview && <PreviewBadge svc={svc} />}
                {svc.description && (
                  <p className="mt-0.5 text-xs text-(--color-text-muted) line-clamp-2">{svc.description}</p>
                )}
                {svc.requirements && (
                  <p className="mt-1 text-[10px] text-(--color-mocha)">Req: {svc.requirements}</p>
                )}
                </div>
                </div>
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
              non-included services during a customized purchase. Drag the grip (or use the arrows) to change the
              order services are listed in; the order is saved straight away and used on the website too.
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

function PreviewBadge({ svc }: { svc: ExtraService }) {
  return (
    <span className="mt-1 inline-block rounded bg-(--color-mocha)/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-(--color-mocha)">
      Preview{svc.celebrationStage ? ` · ${svc.celebrationStage.toLowerCase()}` : ""}
    </span>
  );
}

function ExtraServicesList({
  services,
  onEdit,
  onArchive,
  onMoveService,
}: {
  services: ExtraService[];
  onEdit: (svc: ExtraService) => void;
  onArchive: (svc: ExtraService) => void;
  onMoveService: (fromId: string, toId: string) => void;
}) {
  const reorder = useRowReorder(onMoveService);
  if (services.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-sm text-(--color-text-muted)">No extra services yet. Add your first option.</p>
      </div>
    );
  }

  return (
    <div className="card divide-y divide-(--color-border-soft) p-0">
      {services.map((svc, index) => (
        <div
          key={svc.id}
          {...reorder.rowProps(svc.id)}
          className={`flex items-start justify-between gap-3 px-3 py-4 ${reorder.dragId === svc.id ? "opacity-40" : ""} ${
            reorder.overId === svc.id && reorder.dragId !== svc.id ? "outline-2 -outline-offset-2 outline-(--color-mocha)" : ""
          }`}
        >
          <ReorderControls
            label={svc.label}
            index={index}
            count={services.length}
            gripProps={reorder.gripProps(svc.id)}
            onStep={(by) => onMoveService(svc.id, services[index + by]!.id)}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-(--color-charcoal)">{svc.label}</p>
              {!svc.isActive && (
                <span className="rounded bg-(--color-surface-alt) px-2 py-0.5 text-[10px] font-semibold uppercase text-(--color-text-muted)">
                  Inactive
                </span>
              )}
              {svc.isProductChoice && <ChoiceBadge svc={svc} />}
              {svc.hasPreview && <PreviewBadge svc={svc} />}
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
