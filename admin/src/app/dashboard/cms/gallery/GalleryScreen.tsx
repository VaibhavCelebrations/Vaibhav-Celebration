"use client";

import { Archive, ImageIcon, Pencil, Plus, Tag, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { AdminApiError, adminFetch, adminFetchList } from "@/lib/admin-api-client";
import { galleryRepo } from "@/lib/data/resources";
import { useListQuery } from "@/lib/use-list-query";
import { useRepoList } from "@/lib/use-repo-list";
import { AdminConfirmDialog } from "@/components/ui/AdminConfirmDialog";
import { AdminDrawerForm } from "@/components/ui/AdminDrawerForm";
import { FormField } from "@/components/ui/FormField";
import { MediaPicker } from "@/components/ui/MediaPicker";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { SelectInput, TextArea, TextInput, ToggleSwitch, NumberInput } from "@/components/ui/fields";
import type { MediaRef } from "@/types/common";

type GalleryTheme = { id: string; title: string; slug: string };
type GalleryTag = { id: string; name: string; _count?: { images: number } };
type GalleryItem = {
  id: string;
  mediaId: string;
  caption: string | null;
  altText: string;
  themeId: string | null;
  ctaType?: string;
  ctaTargetSlug?: string | null;
  isActive: boolean;
  displayOrder: number;
  media?: MediaRef & { id: string };
  theme?: GalleryTheme | null;
  tags?: Array<{ tag: { id: string; name: string } }>;
};

type FormState = {
  media: MediaRef | null;
  altText: string;
  caption: string;
  themeId: string;
  tagNames: string[];
  ctaType: string;
  ctaTargetSlug: string;
  displayOrder: number;
  isActive: boolean;
};

const EMPTY: FormState = {
  media: null,
  altText: "",
  caption: "",
  themeId: "",
  tagNames: [],
  ctaType: "NONE",
  ctaTargetSlug: "",
  displayOrder: 0,
  isActive: true,
};

export function GalleryScreen() {
  const { query, setQuery } = useListQuery({ sort: "displayOrder", dir: "asc", pageSize: 48 });
  const { items, total, loading, error, reload, reloadTick } = useRepoList(galleryRepo.list, query);
  const rows = items as GalleryItem[];

  const [themes, setThemes] = useState<GalleryTheme[]>([]);
  const [allTags, setAllTags] = useState<GalleryTag[]>([]);
  const [themeFilter, setThemeFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [tagDraft, setTagDraft] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<GalleryItem | null>(null);
  const [archiving, setArchiving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    void adminFetchList<GalleryTheme>("/admin/themes?page=1&pageSize=100", {
      page: 1,
      pageSize: 100,
    })
      .then((res) => setThemes(res.items))
      .catch(() => setThemes([]));
    void adminFetch<GalleryTag[]>("/admin/gallery/tags")
      .then(setAllTags)
      .catch(() => setAllTags([]));
  }, [reloadTick]);

  useEffect(() => {
    const next: Record<string, string> = {};
    if (themeFilter) next.themeId = themeFilter;
    if (tagFilter) next.tag = tagFilter;
    setQuery({
      filters: Object.keys(next).length ? next : undefined,
      page: 1,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeFilter, tagFilter]);

  const themeOptions = useMemo(
    () => [
      { value: "", label: "No theme" },
      ...themes.map((t) => ({ value: t.id, label: t.title })),
    ],
    [themes],
  );

  const patch = (value: Partial<FormState>) => {
    setForm((current) => ({ ...current, ...value }));
    setDirty(true);
  };

  const addTag = (raw: string) => {
    const name = raw.trim();
    if (!name) return;
    if (form.tagNames.some((t) => t.toLowerCase() === name.toLowerCase())) return;
    patch({ tagNames: [...form.tagNames, name] });
    setTagDraft("");
  };

  const onTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(tagDraft.replace(/,/g, ""));
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setDirty(false);
    setFormError(null);
    setDrawerOpen(true);
  };

  const openEdit = (row: GalleryItem) => {
    setEditing(row);
    setForm({
      media: row.media ?? null,
      altText: row.altText,
      caption: row.caption ?? "",
      themeId: row.themeId ?? "",
      tagNames: (row.tags ?? []).map((t) => t.tag.name),
      ctaType: row.ctaType ?? "NONE",
      ctaTargetSlug: row.ctaTargetSlug ?? "",
      displayOrder: row.displayOrder ?? 0,
      isActive: row.isActive,
    });
    setDirty(false);
    setFormError(null);
    setDrawerOpen(true);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.media?.id) {
      setFormError("Upload or select an image first.");
      return;
    }
    if (!form.altText.trim()) {
      setFormError("Alt text is required for accessibility.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const body = {
        mediaId: form.media.id,
        altText: form.altText.trim(),
        caption: form.caption.trim() || null,
        themeId: form.themeId || null,
        ctaType: form.ctaType,
        ctaTargetSlug: form.ctaTargetSlug.trim() || null,
        displayOrder: form.displayOrder,
        isActive: form.isActive,
        tagNames: form.tagNames,
      };
      if (editing) await galleryRepo.update(editing.id, body);
      else await galleryRepo.create(body);
      toast({ tone: "success", title: editing ? "Gallery image updated" : "Gallery image uploaded" });
      setDrawerOpen(false);
      reload();
      const tags = await adminFetch<GalleryTag[]>("/admin/gallery/tags").catch(() => []);
      setAllTags(tags);
    } catch (err) {
      setFormError(err instanceof AdminApiError ? err.message : "Could not save gallery image.");
    } finally {
      setSubmitting(false);
    }
  };

  const archive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await galleryRepo.archive(archiveTarget.id);
      toast({ tone: "success", title: "Gallery image archived" });
      setArchiveTarget(null);
      reload();
    } catch (err) {
      toast({
        tone: "error",
        title: "Could not archive image",
        description: err instanceof AdminApiError ? err.message : undefined,
      });
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Content"
        title="Gallery"
        description="Upload celebration photos, tag them, and link themes so guests can browse by look."
        actions={
          <button type="button" onClick={openCreate} className="btn btn-primary px-4 py-2 text-sm">
            <Plus size={16} aria-hidden="true" /> Upload image
          </button>
        }
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <SelectInput
          value={themeFilter}
          onChange={(event) => setThemeFilter(event.target.value)}
          options={[{ value: "", label: "All themes" }, ...themes.map((t) => ({ value: t.id, label: t.title }))]}
        />
        <SelectInput
          value={tagFilter}
          onChange={(event) => setTagFilter(event.target.value)}
          options={[{ value: "", label: "All tags" }, ...allTags.map((t) => ({ value: t.name, label: t.name }))]}
        />
        <TextInput
          value={String(query.search ?? "")}
          onChange={(event) => setQuery({ ...query, search: event.target.value, page: 1 })}
          placeholder="Search caption or alt text…"
          className="min-w-[220px]"
        />
      </div>

      {error && (
        <div className="card mb-4 border-(--color-error) p-4 text-sm text-(--color-error)">
          {error}{" "}
          <button type="button" className="underline" onClick={reload}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-(--color-text-muted)">Loading gallery…</p>
      ) : rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center">
          <ImageIcon size={36} className="text-(--color-mocha)" />
          <h2 className="font-serif text-xl">No gallery images yet</h2>
          <p className="max-w-md text-sm text-(--color-text-muted)">
            Upload your first celebration photo. Choose a theme to auto-apply a theme tag.
          </p>
          <button type="button" onClick={openCreate} className="btn btn-primary px-4 py-2 text-sm">
            <Plus size={16} /> Upload image
          </button>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-(--color-text-muted)">{total} image{total === 1 ? "" : "s"}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => (
              <article key={row.id} className="card overflow-hidden">
                <div className="relative aspect-[4/3] bg-(--color-surface)">
                  {row.media?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.media.url} alt={row.altText} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-(--color-text-muted)">
                      <ImageIcon />
                    </div>
                  )}
                  {!row.isActive && (
                    <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="space-y-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-(--color-charcoal)">
                        {row.caption || row.altText}
                      </p>
                      {row.theme && (
                        <p className="text-xs text-(--color-mocha)">Theme: {row.theme.title}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        aria-label="Edit"
                        className="btn btn-ghost p-2"
                        onClick={() => openEdit(row)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label="Archive"
                        className="btn btn-ghost p-2 text-(--color-error)"
                        onClick={() => setArchiveTarget(row)}
                      >
                        <Archive size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(row.tags ?? []).length === 0 ? (
                      <span className="text-xs text-(--color-text-muted)">No tags</span>
                    ) : (
                      (row.tags ?? []).map(({ tag }) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center gap-1 rounded-full bg-(--color-blush-light) px-2 py-0.5 text-[11px] font-medium text-(--color-mocha-dark)"
                        >
                          <Tag size={10} /> {tag.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      <AdminDrawerForm
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? "Edit gallery image" : "Upload gallery image"}
        onSubmit={onSubmit}
        submitting={submitting}
        error={formError}
        dirty={dirty}
      >
        <FormField label="Image" htmlFor="gallery-media" required>
          <MediaPicker
            kind="gallery"
            value={form.media}
            onChange={(media) => {
              patch({
                media,
                altText: form.altText || media?.altText || "",
              });
            }}
          />
        </FormField>
        <FormField label="Alt text" htmlFor="gallery-alt" required hint="Shown to screen readers and used for SEO.">
          <TextInput
            id="gallery-alt"
            value={form.altText}
            onChange={(event) => patch({ altText: event.target.value })}
            required
          />
        </FormField>
        <FormField label="Caption" htmlFor="gallery-caption">
          <TextArea
            id="gallery-caption"
            value={form.caption}
            onChange={(event) => patch({ caption: event.target.value })}
          />
        </FormField>
        <FormField
          label="Theme"
          htmlFor="gallery-theme"
          hint="Selecting a theme auto-adds a matching theme tag. Archiving the theme removes that tag."
        >
          <SelectInput
            id="gallery-theme"
            value={form.themeId}
            onChange={(event) => {
              const themeId = event.target.value;
              const theme = themes.find((t) => t.id === themeId);
              const nextTags = [...form.tagNames];
              if (theme && !nextTags.some((t) => t.toLowerCase() === theme.title.toLowerCase())) {
                nextTags.push(theme.title);
              }
              patch({ themeId, tagNames: nextTags });
            }}
            options={themeOptions}
          />
        </FormField>
        <FormField label="Tags" htmlFor="gallery-tags" hint="Press Enter to add. Theme tags stay in sync with Themes CMS.">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {form.tagNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full bg-(--color-blush-light) px-2 py-1 text-xs font-medium text-(--color-mocha-dark)"
                  onClick={() => patch({ tagNames: form.tagNames.filter((t) => t !== name) })}
                >
                  {name} <X size={12} />
                </button>
              ))}
            </div>
            <TextInput
              id="gallery-tags"
              value={tagDraft}
              onChange={(event) => setTagDraft(event.target.value)}
              onKeyDown={onTagKeyDown}
              onBlur={() => addTag(tagDraft)}
              placeholder="Add a tag…"
              list="gallery-tag-suggestions"
            />
            <datalist id="gallery-tag-suggestions">
              {allTags.map((tag) => (
                <option key={tag.id} value={tag.name} />
              ))}
            </datalist>
          </div>
        </FormField>
        <FormField label="Display order" htmlFor="gallery-order">
          <NumberInput value={form.displayOrder} onChange={(n) => patch({ displayOrder: n })} />
        </FormField>
        <FormField label="CTA type" htmlFor="gallery-cta">
          <SelectInput
            id="gallery-cta"
            value={form.ctaType}
            onChange={(event) => patch({ ctaType: event.target.value })}
            options={[
              { value: "NONE", label: "None" },
              { value: "THEME", label: "Theme" },
              { value: "PACKAGE", label: "Package" },
              { value: "EVENT", label: "Event" },
              { value: "BOOKING", label: "Booking" },
            ]}
          />
        </FormField>
        {form.ctaType !== "NONE" && form.ctaType !== "BOOKING" && (
          <FormField label="CTA target slug" htmlFor="gallery-cta-slug" hint="Slug of the theme, package, or event to link to.">
            <TextInput
              id="gallery-cta-slug"
              value={form.ctaTargetSlug}
              onChange={(event) => patch({ ctaTargetSlug: event.target.value })}
            />
          </FormField>
        )}
        <div className="flex items-center justify-between">
          <label htmlFor="gallery-active" className="text-sm font-medium text-(--color-charcoal)">
            Active on public site
          </label>
          <ToggleSwitch
            id="gallery-active"
            checked={form.isActive}
            onChange={(isActive) => patch({ isActive })}
          />
        </div>
      </AdminDrawerForm>

      <AdminConfirmDialog
        open={!!archiveTarget}
        title="Archive this gallery image?"
        message={
          <>
            Archive <strong>{archiveTarget?.caption || archiveTarget?.altText}</strong>? It will no
            longer appear on the public gallery.
          </>
        }
        submitting={archiving}
        onConfirm={archive}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
}
