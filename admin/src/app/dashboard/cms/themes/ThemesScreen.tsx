"use client";

import { Trash2 as Trash2, ImagePlus, Palette, Pencil, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AdminApiError } from "@/lib/admin-api-client";
import { themesRepo } from "@/lib/data/themes";
import { useListQuery } from "@/lib/use-list-query";
import { useRepoList } from "@/lib/use-repo-list";
import { AdminConfirmDialog } from "@/components/ui/AdminConfirmDialog";
import { AdminDataTable, type Column } from "@/components/ui/AdminDataTable";
import { AdminModalForm } from "@/components/ui/AdminModalForm";
import { FormField } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { MediaPicker } from "@/components/ui/MediaPicker";
import { NumberInput, SlugInput, TextArea, TextInput, ToggleSwitch } from "@/components/ui/fields";
import type { MediaRef } from "@/types/common";
import type { Theme, ThemeInput } from "@/types/cms";

const MAX_GALLERY = 5; // hero = 1, up to 4 additional

const EMPTY_FORM: ThemeInput = {
  title: "",
  slug: "",
  shortDescription: "",
  storyDescription: null,
  audienceNote: null,
  isActive: true,
  displayOrder: 0,
  seoTitle: null,
  seoDescription: null,
  galleryImageIds: [],
};

/** Multi-image picker row: shows thumbnails of selected images + add button */
function GalleryImagesPicker({
  heroImage,
  images,
  onChange,
}: {
  heroImage: MediaRef | null;
  images: MediaRef[];
  onChange: (imgs: MediaRef[]) => void;
}) {
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  // additional slots: indices 0..3 (hero is always index 0 in the final gallery)
  const extraSlots = Array.from({ length: MAX_GALLERY - 1 }); // 4 slots

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-5 gap-2">
        {/* Slot 0: always heroImage */}
        <div className="relative flex flex-col gap-1">
          {heroImage?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroImage.url}
              alt={heroImage.altText ?? ""}
              className="aspect-square w-full rounded-xl object-cover border-2 border-mocha"
            />
          ) : (
            <div className="aspect-square w-full rounded-xl bg-(--color-surface-alt) border-2 border-dashed border-border flex items-center justify-center text-(--color-text-muted) text-[10px] text-center px-1">
              Hero image
            </div>
          )}
          <span className="text-center text-[10px] text-(--color-text-muted)">1 (Hero)</span>
        </div>

        {/* Slots 1-4: additional images */}
        {extraSlots.map((_, idx) => {
          const img = images[idx];
          return (
            <div key={idx} className="relative flex flex-col gap-1">
              {img ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.altText ?? ""}
                    className="aspect-square w-full rounded-xl object-cover border border-border"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...images];
                      next.splice(idx, 1);
                      onChange(next);
                    }}
                    className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white border border-border text-(--color-text-muted) hover:text-red-500 shadow-sm cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setPickerIndex(idx)}
                  className="aspect-square w-full rounded-xl bg-(--color-surface-alt) border-2 border-dashed border-border flex items-center justify-center hover:border-mocha hover:bg-blush/10 transition-colors cursor-pointer"
                >
                  <ImagePlus size={18} className="text-(--color-text-muted)" />
                </button>
              )}
              {img && (
                <button
                  type="button"
                  onClick={() => setPickerIndex(idx)}
                  className="text-center text-[10px] text-mocha underline cursor-pointer"
                >
                  Change
                </button>
              )}
              {!img && (
                <span className="text-center text-[10px] text-(--color-text-muted)">{idx + 2}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Hidden MediaPicker that opens programmatically */}
      {pickerIndex !== null && (
        <div className="hidden">
          <MediaPicker
            kind="themes"
            value={images[pickerIndex] ?? null}
            onChange={(media) => {
              if (!media) { setPickerIndex(null); return; }
              const next = [...images];
              next[pickerIndex] = media;
              onChange(next);
              setPickerIndex(null);
            }}
          />
        </div>
      )}

      {/* Inline picker trigger when slot clicked */}
      {pickerIndex !== null && (
        <InlineImagePicker
          onPick={(media) => {
            if (!media) { setPickerIndex(null); return; }
            const next = [...images];
            next[pickerIndex] = media;
            onChange(next);
            setPickerIndex(null);
          }}
          onClose={() => setPickerIndex(null)}
        />
      )}

      <p className="text-xs text-(--color-text-muted)">
        Hero image is always shown first. Add up to {MAX_GALLERY - 1} more images ({images.length}/{MAX_GALLERY - 1} added).
      </p>
    </div>
  );
}

/** Small inline media-pick overlay for gallery slots */
function InlineImagePicker({
  onPick,
  onClose,
}: {
  onPick: (media: MediaRef | null) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[70vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-soft">
          <h3 className="font-serif text-lg">Pick Gallery Image</h3>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-lg p-1.5 hover:bg-(--color-surface-alt)">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto">
          <MediaPicker kind="themes" value={null} onChange={onPick} />
        </div>
      </div>
    </div>
  );
}

export function ThemesScreen() {
  const { query, setQuery } = useListQuery({ sort: "displayOrder", dir: "asc" });
  const { items: rows, total, loading, error, reload } = useRepoList(themesRepo.list, query);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Theme | null>(null);
  const [form, setForm] = useState<ThemeInput>(EMPTY_FORM);
  // heroImage and gallery images held as MediaRef objects for the picker UI
  const [heroImage, setHeroImage] = useState<MediaRef | null>(null);
  const [galleryImages, setGalleryImages] = useState<MediaRef[]>([]);
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [archiveTarget, setArchiveTarget] = useState<Theme | null>(null);
  const [archiving, setArchiving] = useState(false);

  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      openCreate();
      router.replace("/dashboard/cms/themes");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setHeroImage(null);
    setGalleryImages([]);
    setFormError(null);
    setDirty(false);
    setDrawerOpen(true);
  }

  function openEdit(row: Theme) {
    setEditing(row);
    setForm({
      title: row.title,
      slug: row.slug,
      shortDescription: row.shortDescription,
      storyDescription: row.storyDescription,
      audienceNote: row.audienceNote,
      isActive: row.isActive,
      displayOrder: row.displayOrder,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      heroImageId: row.heroImage?.id ?? null,
      ogImageId: row.ogImage?.id ?? null,
    });
    setHeroImage(row.heroImage ?? null);
    // Populate existing gallery images from sampleAssets (galleryImageAssets)
    const existing = (row.galleryImageAssets ?? [])
      .slice(0, MAX_GALLERY - 1)
      .map((a) => a.media)
      .filter((m): m is MediaRef => m !== null);
    setGalleryImages(existing);
    setFormError(null);
    setDirty(false);
    setDrawerOpen(true);
  }

  function patchForm(patch: Partial<ThemeInput>) {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Validation: at least 1 image (hero counts)
    if (!heroImage) {
      setFormError("Please upload a hero image (required — counts as image #1).");
      return;
    }
    if (galleryImages.length > MAX_GALLERY - 1) {
      setFormError(`Maximum ${MAX_GALLERY - 1} additional gallery images allowed (${MAX_GALLERY} total).`);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const payload: ThemeInput = {
        ...form,
        heroImageId: heroImage?.id ?? null,
        galleryImageIds: galleryImages.map((img) => img.id),
      };
      if (editing) {
        await themesRepo.update(editing.id, payload);
        toast({ tone: "success", title: "Theme updated" });
      } else {
        await themesRepo.create(payload);
        toast({ tone: "success", title: "Theme created" });
      }
      setDrawerOpen(false);
      setDirty(false);
      reload();
    } catch (err) {
      setFormError(err instanceof AdminApiError ? err.message : "Could not save this theme.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onArchiveConfirm() {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await themesRepo.archive(archiveTarget.id);
      toast({ tone: "success", title: "Theme archived" });
      setArchiveTarget(null);
      reload();
    } catch (err) {
      toast({ tone: "error", title: "Could not archive theme", description: err instanceof AdminApiError ? err.message : undefined });
    } finally {
      setArchiving(false);
    }
  }

  const columns: Column<Theme>[] = [
    { key: "displayOrder", header: "Order", sortable: true, width: "80px", cell: (r) => r.displayOrder },
    { key: "title", header: "Title", sortable: true, cell: (r) => <span className="font-medium text-(--color-charcoal)">{r.title}</span> },
    { key: "slug", header: "Slug", sortable: true, hideBelow: "md", cell: (r) => <span className="font-mono text-xs">{r.slug}</span> },
    { key: "packageCount", header: "Packages", hideBelow: "sm", align: "right", cell: (r) => r.packageCount },
    { key: "galleryCount", header: "Gallery", hideBelow: "lg", align: "right", cell: (r) => r.galleryCount },
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
        title="Themes"
        description="Party themes shown on the public site, each with its own packages and gallery."
        actions={
          <button type="button" onClick={openCreate} className="btn btn-primary px-4 py-2 text-sm">
            New Theme
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
        searchPlaceholder="Search themes…"
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
          { id: "archive", label: "Delete", icon: Trash2, tone: "danger", onSelect: setArchiveTarget },
        ]}
        empty={{ icon: Palette, title: "No themes yet", description: "Add your first party theme." }}
      />

      <AdminModalForm
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? "Edit Theme" : "New Theme"}
        description="Theme details shown on the public site. Hero image is required (counts as image #1)."
        onSubmit={onSubmit}
        submitting={submitting}
        error={formError}
        dirty={dirty}
        size="xl"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Title" htmlFor="theme-title" required>
            <TextInput id="theme-title" value={form.title} onChange={(e) => patchForm({ title: e.target.value })} required />
          </FormField>
          <FormField label="Slug" htmlFor="theme-slug" required hint="Auto-derived from title; edit to override.">
            <SlugInput id="theme-slug" value={form.slug} onChange={(v) => patchForm({ slug: v })} source={form.title} />
          </FormField>
        </div>

        <FormField label="Short description" htmlFor="theme-short" required hint="Shown on theme listing cards.">
          <TextArea id="theme-short" value={form.shortDescription} onChange={(e) => patchForm({ shortDescription: e.target.value })} rows={2} required />
        </FormField>

        <FormField label="Story" htmlFor="theme-story" hint="Longer narrative shown on the theme detail page.">
          <TextArea id="theme-story" value={form.storyDescription ?? ""} onChange={(e) => patchForm({ storyDescription: e.target.value || null })} rows={3} />
        </FormField>

        {/* Hero image */}
        <FormField label="Hero image" htmlFor="theme-hero" required hint="Required — this is always shown as image #1 in the gallery.">
          <MediaPicker
            kind="themes"
            value={heroImage}
            onChange={(media) => {
              setHeroImage(media);
              patchForm({ heroImageId: media?.id ?? null });
            }}
          />
        </FormField>

        {/* Additional gallery images */}
        <FormField
          label={`Gallery images (${galleryImages.length + (heroImage ? 1 : 0)} / ${MAX_GALLERY})`}
          htmlFor="theme-gallery"
          hint={`Hero counts as #1. Add up to ${MAX_GALLERY - 1} more to show in the carousel on the theme page.`}
        >
          <GalleryImagesPicker
            heroImage={heroImage}
            images={galleryImages}
            onChange={(imgs) => {
              setGalleryImages(imgs);
              setDirty(true);
            }}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Audience note" htmlFor="theme-audience" hint="e.g. recommended ages or party size.">
            <TextInput id="theme-audience" value={form.audienceNote ?? ""} onChange={(e) => patchForm({ audienceNote: e.target.value || null })} />
          </FormField>
          <FormField label="Display order" htmlFor="theme-order">
            <NumberInput value={form.displayOrder} onChange={(n) => patchForm({ displayOrder: n })} />
          </FormField>
        </div>

        <FormField label="OG image" htmlFor="theme-og" hint="Social share preview image (optional).">
          <MediaPicker
            kind="themes"
            value={form.ogImageId ? (editing?.ogImage?.id === form.ogImageId ? editing.ogImage : { id: form.ogImageId, url: form.ogImageId }) : null}
            onChange={(media) => patchForm({ ogImageId: media?.id ?? null })}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="SEO title" htmlFor="theme-seo-title">
            <TextInput id="theme-seo-title" value={form.seoTitle ?? ""} onChange={(e) => patchForm({ seoTitle: e.target.value || null })} />
          </FormField>
          <FormField label="SEO description" htmlFor="theme-seo-desc">
            <TextArea id="theme-seo-desc" value={form.seoDescription ?? ""} onChange={(e) => patchForm({ seoDescription: e.target.value || null })} rows={2} />
          </FormField>
        </div>

        <div className="flex items-center justify-between rounded-md border border-border-soft px-4 py-3">
          <label htmlFor="theme-active" className="text-sm font-medium text-(--color-charcoal)">
            Active
          </label>
          <ToggleSwitch id="theme-active" checked={form.isActive} onChange={(v) => patchForm({ isActive: v })} />
        </div>
      </AdminModalForm>

      <AdminConfirmDialog
        open={!!archiveTarget}
        title="Archive this theme?"
        message={
          <>
            Archive <strong>{archiveTarget?.title}</strong>? It will no longer show on the public site.
          </>
        }
        submitting={archiving}
        onConfirm={onArchiveConfirm}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
}
