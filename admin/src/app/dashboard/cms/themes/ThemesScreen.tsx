"use client";

import { Archive as ArchiveIcon, Palette, Pencil } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AdminApiError } from "@/lib/admin-api-client";
import { themesRepo } from "@/lib/data/themes";
import { useListQuery } from "@/lib/use-list-query";
import { useRepoList } from "@/lib/use-repo-list";
import { AdminConfirmDialog } from "@/components/ui/AdminConfirmDialog";
import { AdminDataTable, type Column } from "@/components/ui/AdminDataTable";
import { AdminDrawerForm } from "@/components/ui/AdminDrawerForm";
import { FormField } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { NumberInput, SlugInput, TextArea, TextInput, ToggleSwitch } from "@/components/ui/fields";
import type { Theme, ThemeInput } from "@/types/cms";

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
};

export function ThemesScreen() {
  const { query, setQuery } = useListQuery({ sort: "displayOrder", dir: "asc" });
  const { items: rows, total, loading, error, reload } = useRepoList(themesRepo.list, query);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Theme | null>(null);
  const [form, setForm] = useState<ThemeInput>(EMPTY_FORM);
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
      heroImageId: row.heroImage?.url ?? null,
    });
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
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) {
        await themesRepo.update(editing.id, form);
        toast({ tone: "success", title: "Theme updated" });
      } else {
        await themesRepo.create(form);
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
    <div className="max-w-5xl">
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
          { id: "archive", label: "Archive", icon: ArchiveIcon, tone: "danger", onSelect: setArchiveTarget },
        ]}
        empty={{ icon: Palette, title: "No themes yet", description: "Add your first party theme." }}
      />

      <AdminDrawerForm
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? "Edit Theme" : "New Theme"}
        onSubmit={onSubmit}
        submitting={submitting}
        error={formError}
        dirty={dirty}
      >
        <FormField label="Title" htmlFor="theme-title" required>
          <TextInput id="theme-title" value={form.title} onChange={(e) => patchForm({ title: e.target.value })} required />
        </FormField>
        <FormField label="Slug" htmlFor="theme-slug" required hint="Auto-derived from title; edit to override.">
          <SlugInput id="theme-slug" value={form.slug} onChange={(v) => patchForm({ slug: v })} source={form.title} />
        </FormField>
        <FormField label="Short description" htmlFor="theme-short" required hint="Shown on theme listing cards.">
          <TextArea id="theme-short" value={form.shortDescription} onChange={(e) => patchForm({ shortDescription: e.target.value })} rows={2} required />
        </FormField>
        <FormField label="Story" htmlFor="theme-story" hint="Longer narrative shown on the theme detail page.">
          <TextArea id="theme-story" value={form.storyDescription ?? ""} onChange={(e) => patchForm({ storyDescription: e.target.value || null })} rows={4} />
        </FormField>
        <FormField label="Audience note" htmlFor="theme-audience" hint="e.g. recommended ages or party size.">
          <TextInput id="theme-audience" value={form.audienceNote ?? ""} onChange={(e) => patchForm({ audienceNote: e.target.value || null })} />
        </FormField>
        <FormField label="Hero image URL" htmlFor="theme-hero" hint="Temporary URL field until the media library ships.">
          <TextInput id="theme-hero" value={form.heroImageId ?? ""} onChange={(e) => patchForm({ heroImageId: e.target.value || null })} />
        </FormField>
        <FormField label="Display order" htmlFor="theme-order">
          <NumberInput value={form.displayOrder} onChange={(n) => patchForm({ displayOrder: n })} />
        </FormField>
        <FormField label="SEO title" htmlFor="theme-seo-title">
          <TextInput id="theme-seo-title" value={form.seoTitle ?? ""} onChange={(e) => patchForm({ seoTitle: e.target.value || null })} />
        </FormField>
        <FormField label="SEO description" htmlFor="theme-seo-desc">
          <TextArea id="theme-seo-desc" value={form.seoDescription ?? ""} onChange={(e) => patchForm({ seoDescription: e.target.value || null })} rows={2} />
        </FormField>
        <div className="flex items-center justify-between">
          <label htmlFor="theme-active" className="text-sm font-medium text-(--color-charcoal)">
            Active
          </label>
          <ToggleSwitch id="theme-active" checked={form.isActive} onChange={(v) => patchForm({ isActive: v })} />
        </div>
      </AdminDrawerForm>

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
