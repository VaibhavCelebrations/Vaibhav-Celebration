"use client";

import { Trash2, Newspaper, Pencil, Plus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { AdminApiError, adminFetch } from "@/lib/admin-api-client";
import { blogRepo } from "@/lib/data/resources";
import { useListQuery } from "@/lib/use-list-query";
import { useRepoList } from "@/lib/use-repo-list";
import { formatDate } from "@/lib/format";
import { AdminConfirmDialog } from "@/components/ui/AdminConfirmDialog";
import { AdminDataTable, type Column } from "@/components/ui/AdminDataTable";
import { AdminModalForm } from "@/components/ui/AdminModalForm";
import { FormField } from "@/components/ui/FormField";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { MediaPicker } from "@/components/ui/MediaPicker";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import {
  DateTimeInput,
  MultiSelectInput,
  SelectInput,
  SlugInput,
  TextArea,
  TextInput,
  ToggleSwitch,
} from "@/components/ui/fields";
import type { MediaRef } from "@/types/common";
import type { BlogCategory, BlogPost, BlogStatus, BlogTag } from "@/types/cms";
import { BLOG_STATUSES } from "@/types/cms";

type BlogForm = {
  title: string;
  slug: string;
  contentHtml: string;
  excerpt: string;
  authorName: string;
  status: BlogStatus;
  publishedAt: string;
  seoTitle: string;
  seoDescription: string;
  categoryIds: string[];
  tagIds: string[];
  isFeatured: boolean;
};

const EMPTY: BlogForm = {
  title: "",
  slug: "",
  contentHtml: "",
  excerpt: "",
  authorName: "",
  status: "DRAFT",
  publishedAt: "",
  seoTitle: "",
  seoDescription: "",
  categoryIds: [],
  tagIds: [],
  isFeatured: false,
};

type ApiPost = BlogPost & {
  categories?: Array<{ category: BlogCategory } | BlogCategory>;
  tags?: Array<{ tag: BlogTag } | BlogTag>;
};

function isJoinedCategory(item: unknown): item is { category: BlogCategory } {
  return typeof item === "object" && item !== null && "category" in item;
}

function isJoinedTag(item: unknown): item is { tag: BlogTag } {
  return typeof item === "object" && item !== null && "tag" in item;
}

function extractCategoryIds(categories: ApiPost["categories"]): string[] {
  return (categories ?? [])
    .map((c) => (isJoinedCategory(c) ? c.category.id : (c as BlogCategory).id))
    .filter(Boolean);
}

function extractTagIds(tags: ApiPost["tags"]): string[] {
  return (tags ?? [])
    .map((t) => (isJoinedTag(t) ? t.tag.id : (t as BlogTag).id))
    .filter(Boolean);
}

function toLocalDatetime(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BlogScreen() {
  const { query, setQuery } = useListQuery({ sort: "updatedAt", dir: "desc" });
  const { items: rows, total, loading, error, reload, reloadTick } = useRepoList(blogRepo.list, query);

  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [featuredImage, setFeaturedImage] = useState<MediaRef | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ApiPost | null>(null);
  const [form, setForm] = useState<BlogForm>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ApiPost | null>(null);
  const [archiving, setArchiving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    void adminFetch<BlogCategory[]>("/admin/blog/categories").then(setCategories).catch(() => setCategories([]));
    void adminFetch<BlogTag[]>("/admin/blog/tags").then(setTags).catch(() => setTags([]));
  }, [reloadTick]);

  function patch(patch: Partial<BlogForm>) {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setFeaturedImage(null);
    setFormError(null);
    setDirty(false);
    setDrawerOpen(true);
  }

  async function openEdit(row: ApiPost) {
    setFormError(null);
    setDirty(false);
    try {
      const full = await adminFetch<ApiPost>(`/admin/blog/${row.id}`);
      setEditing(full);
      setForm({
        title: full.title,
        slug: full.slug,
        contentHtml: full.contentHtml,
        excerpt: full.excerpt ?? "",
        authorName: full.authorName ?? "",
        status: full.status,
        publishedAt: toLocalDatetime(full.publishedAt),
        seoTitle: full.seoTitle ?? "",
        seoDescription: full.seoDescription ?? "",
        categoryIds: extractCategoryIds(full.categories),
        tagIds: extractTagIds(full.tags),
        isFeatured: full.isFeatured ?? false,
      });
      setFeaturedImage(full.featuredImage);
      setDrawerOpen(true);
    } catch (err) {
      toast({
        tone: "error",
        title: "Could not load post",
        description: err instanceof AdminApiError ? err.message : undefined,
      });
    }
  }

  async function ensureTaxonomyIds(values: string[], type: "categories" | "tags"): Promise<string[]> {
    const pool = type === "categories" ? categories : tags;
    const ids: string[] = [];
    for (const value of values) {
      const byId = pool.find((item) => item.id === value);
      if (byId) {
        ids.push(byId.id);
        continue;
      }
      const byName = pool.find((item) => item.name.toLowerCase() === value.toLowerCase());
      if (byName) {
        ids.push(byName.id);
        continue;
      }
      const created = await adminFetch<BlogCategory | BlogTag>(`/admin/blog/${type}`, {
        method: "POST",
        body: { name: value },
      });
      ids.push(created.id);
      if (type === "categories") setCategories((prev) => [...prev, created as BlogCategory]);
      else setTags((prev) => [...prev, created as BlogTag]);
    }
    return ids;
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const categoryIds = await ensureTaxonomyIds(form.categoryIds, "categories");
      const tagIds = await ensureTaxonomyIds(form.tagIds, "tags");
      const body = {
        title: form.title,
        slug: form.slug,
        contentHtml: form.contentHtml,
        excerpt: form.excerpt || null,
        authorName: form.authorName || null,
        status: form.status,
        publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null,
        seoTitle: form.seoTitle || null,
        seoDescription: form.seoDescription || null,
        featuredImageId: featuredImage?.id ?? null,
        isFeatured: form.isFeatured,
        categoryIds,
        tagIds,
      };
      if (editing) {
        await adminFetch(`/admin/blog/${editing.id}`, { method: "PUT", body });
        toast({ tone: "success", title: "Post updated" });
      } else {
        await adminFetch("/admin/blog", { method: "POST", body });
        toast({ tone: "success", title: "Post created" });
      }
      setDrawerOpen(false);
      setDirty(false);
      reload();
    } catch (err) {
      setFormError(err instanceof AdminApiError ? err.message : "Could not save post.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onArchiveConfirm() {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await blogRepo.archive(archiveTarget.id);
      toast({ tone: "success", title: "Post archived" });
      setArchiveTarget(null);
      reload();
    } catch (err) {
      toast({
        tone: "error",
        title: "Could not archive post",
        description: err instanceof AdminApiError ? err.message : undefined,
      });
    } finally {
      setArchiving(false);
    }
  }

  const statusOptions = BLOG_STATUSES.map((s) => ({
    value: s,
    label: s.charAt(0) + s.slice(1).toLowerCase(),
  }));

  const columns: Column<ApiPost>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      cell: (r) => <span className="font-medium text-(--color-charcoal)">{r.title}</span>,
    },
    {
      key: "slug",
      header: "Slug",
      hideBelow: "md",
      cell: (r) => <span className="font-mono text-xs">{r.slug}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <StatusBadge
          label={r.status}
          tone={r.status === "PUBLISHED" ? "success" : r.status === "DRAFT" ? "neutral" : "warning"}
        />
      ),
    },
    {
      key: "isFeatured",
      header: "Featured",
      hideBelow: "md",
      cell: (r) => (r.isFeatured ? <StatusBadge label="Featured" tone="success" /> : "—"),
    },
    {
      key: "publishedAt",
      header: "Published",
      hideBelow: "lg",
      cell: (r) => formatDate(r.publishedAt),
    },
  ];

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Content"
        title="Blog"
        description="Create and manage stories, announcements, and celebration guides."
        actions={
          <button type="button" onClick={openCreate} className="btn btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm">
            <Plus size={16} /> New Post
          </button>
        }
      />
      <AdminDataTable
        columns={columns}
        rows={rows as ApiPost[]}
        rowKey={(r) => r.id}
        total={total}
        query={query}
        onQueryChange={setQuery}
        loading={loading}
        error={error}
        onRetry={reload}
        searchPlaceholder="Search posts…"
        rowActions={[
          { id: "edit", label: "Edit", icon: Pencil, onSelect: openEdit },
          { id: "archive", label: "Delete", icon: Trash2, tone: "danger", onSelect: setArchiveTarget },
        ]}
        empty={{
          icon: Newspaper,
          title: "No blog posts yet",
          description: "Create the first post to get started.",
        }}
      />
      <AdminModalForm
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? "Edit Post" : "New Post"}
        description="Write and publish your blog article. Content is saved as formatted HTML."
        onSubmit={onSubmit}
        submitting={submitting}
        error={formError}
        dirty={dirty}
        size="xl"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Title" htmlFor="blog-title" required>
            <TextInput id="blog-title" value={form.title} onChange={(e) => patch({ title: e.target.value })} required />
          </FormField>
          <FormField label="Slug" htmlFor="blog-slug" required>
            <SlugInput id="blog-slug" value={form.slug} onChange={(v) => patch({ slug: v })} source={form.title} />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Author" htmlFor="blog-author">
            <TextInput id="blog-author" value={form.authorName} onChange={(e) => patch({ authorName: e.target.value })} />
          </FormField>
          <FormField label="Status" htmlFor="blog-status">
            <SelectInput
              id="blog-status"
              value={form.status}
              onChange={(e) => patch({ status: e.target.value as BlogStatus })}
              options={statusOptions}
            />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Featured image" htmlFor="blog-featured">
            <MediaPicker kind="blog" value={featuredImage} onChange={setFeaturedImage} />
          </FormField>
          <FormField label="Published at" htmlFor="blog-published">
            <DateTimeInput
              id="blog-published"
              value={form.publishedAt}
              onChange={(e) => patch({ publishedAt: e.target.value })}
            />
          </FormField>
        </div>
        <FormField label="Excerpt" htmlFor="blog-excerpt" hint="Short summary shown on listing cards.">
          <TextArea id="blog-excerpt" value={form.excerpt} onChange={(e) => patch({ excerpt: e.target.value })} rows={2} />
        </FormField>
        <FormField label="Content" htmlFor="blog-content" required hint="What you see is what appears on the blog page. Use the toolbar to format and insert images.">
          <RichTextEditor
            id="blog-content"
            value={form.contentHtml}
            onChange={(html) => patch({ contentHtml: html })}
            placeholder="Start writing your article…"
            minHeight={320}
            mediaKind="blog"
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Categories" htmlFor="blog-categories">
            <MultiSelectInput
              id="blog-categories"
              value={form.categoryIds}
              onChange={(categoryIds) => patch({ categoryIds })}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              allowCreate
              placeholder="Select or create categories…"
            />
          </FormField>
          <FormField label="Tags" htmlFor="blog-tags">
            <MultiSelectInput
              id="blog-tags"
              value={form.tagIds}
              onChange={(tagIds) => patch({ tagIds })}
              options={tags.map((t) => ({ value: t.id, label: t.name }))}
              allowCreate
              placeholder="Select or create tags…"
            />
          </FormField>
        </div>
        <div className="flex items-center justify-between rounded-md border border-border-soft px-4 py-3">
          <div>
            <p className="text-sm font-medium text-(--color-charcoal)">Featured on blog page</p>
            <p className="text-xs text-(--color-text-muted)">Appears in the hero section on /blog.</p>
          </div>
          <ToggleSwitch id="blog-is-featured" checked={form.isFeatured} onChange={(isFeatured) => patch({ isFeatured })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="SEO title" htmlFor="blog-seo-title">
            <TextInput id="blog-seo-title" value={form.seoTitle} onChange={(e) => patch({ seoTitle: e.target.value })} />
          </FormField>
          <FormField label="SEO description" htmlFor="blog-seo-desc">
            <TextArea id="blog-seo-desc" value={form.seoDescription} onChange={(e) => patch({ seoDescription: e.target.value })} rows={2} />
          </FormField>
        </div>
      </AdminModalForm>
      <AdminConfirmDialog
        open={!!archiveTarget}
        title="Archive this post?"
        message={
          <>
            Archive <strong>{archiveTarget?.title}</strong>? This removes it from the public site.
          </>
        }
        submitting={archiving}
        onConfirm={onArchiveConfirm}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
}
