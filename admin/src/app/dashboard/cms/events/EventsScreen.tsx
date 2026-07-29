"use client";

import { Archive, PartyPopper, Pencil, Plus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { AdminApiError, adminFetch, adminFetchList } from "@/lib/admin-api-client";
import { eventsRepo } from "@/lib/data/resources";
import { useListQuery } from "@/lib/use-list-query";
import { useRepoList } from "@/lib/use-repo-list";
import { formatDateTime, formatPaise } from "@/lib/format";
import { AdminConfirmDialog } from "@/components/ui/AdminConfirmDialog";
import { AdminDataTable, type Column } from "@/components/ui/AdminDataTable";
import { AdminDrawerForm } from "@/components/ui/AdminDrawerForm";
import { AdminSubTable } from "@/components/ui/AdminSubTable";
import { FormField } from "@/components/ui/FormField";
import { HtmlEditor } from "@/components/ui/HtmlEditor";
import { MediaPicker } from "@/components/ui/MediaPicker";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TabNav } from "@/components/ui/TabNav";
import { useToast } from "@/components/ui/Toast";
import {
  DateTimeInput,
  PriceInput,
  SelectInput,
  SlugInput,
  TextArea,
  TextInput,
  ToggleSwitch,
} from "@/components/ui/fields";
import type { MediaRef } from "@/types/common";
import type { EventActivity, EventItem, EventPageTemplate, EventRegistration } from "@/types/cms";
import { EVENT_PAGE_TEMPLATES } from "@/types/cms";

type FaqRow = { id: string; question: string; answer: string };
type ActivityRow = EventActivity & { id: string };
type ThemeOption = { id: string; title: string };

type EventForm = {
  title: string;
  slug: string;
  description: string;
  ageGroup: string;
  venue: string;
  scheduleStartAt: string;
  scheduleEndAt: string;
  isRegistrationOpen: boolean;
  registrationFeeInPaise: number;
  themeId: string;
  pageTemplate: EventPageTemplate;
  ctaLabel: string;
  ctaUrl: string;
  seoTitle: string;
  seoDescription: string;
  isActive: boolean;
};

const EMPTY: EventForm = {
  title: "",
  slug: "",
  description: "",
  ageGroup: "",
  venue: "",
  scheduleStartAt: "",
  scheduleEndAt: "",
  isRegistrationOpen: true,
  registrationFeeInPaise: 0,
  themeId: "",
  pageTemplate: "CLASSIC_HERO",
  ctaLabel: "",
  ctaUrl: "",
  seoTitle: "",
  seoDescription: "",
  isActive: true,
};

const FALLBACK_TEMPLATES = EVENT_PAGE_TEMPLATES.map((t) => ({
  value: t,
  label: t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
}));

function toLocalDatetime(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function EventsScreen() {
  const { query, setQuery } = useListQuery({ sort: "scheduleStartAt", dir: "desc" });
  const { items: rows, total, loading, error, reload } = useRepoList(eventsRepo.list, query);

  const [templates, setTemplates] = useState(FALLBACK_TEMPLATES);
  const [themes, setThemes] = useState<ThemeOption[]>([]);
  const [bannerMedia, setBannerMedia] = useState<MediaRef | null>(null);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [faqItems, setFaqItems] = useState<FaqRow[]>([]);
  const [registrants, setRegistrants] = useState<EventRegistration[]>([]);
  const [drawerTab, setDrawerTab] = useState<"details" | "registrants">("details");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [form, setForm] = useState<EventForm>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<EventItem | null>(null);
  const [archiving, setArchiving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    adminFetch<Array<{ id?: string; key?: string; name?: string; label?: string }>>("/admin/events/templates")
      .then((items) =>
        setTemplates(
          items.map((item) => ({
            value: (item.id ?? item.key ?? "CLASSIC_HERO") as EventPageTemplate,
            label: item.name ?? item.label ?? item.id ?? "Template",
          })),
        ),
      )
      .catch(() => setTemplates(FALLBACK_TEMPLATES));
    void adminFetchList<ThemeOption>("/admin/themes?page=1&pageSize=100", { page: 1, pageSize: 100 })
      .then((res) => setThemes(res.items))
      .catch(() => setThemes([]));
  }, []);

  function patch(patch: Partial<EventForm>) {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setBannerMedia(null);
    setActivities([]);
    setFaqItems([]);
    setRegistrants([]);
    setDrawerTab("details");
    setFormError(null);
    setDirty(false);
    setDrawerOpen(true);
  }

  async function openEdit(row: EventItem) {
    setFormError(null);
    setDirty(false);
    setDrawerTab("details");
    try {
      const full = await adminFetch<
        EventItem & {
          bannerMedia?: MediaRef | null;
          activities?: EventActivity[] | null;
          faqItems?: Array<{ question: string; answer: string }> | null;
        }
      >(`/admin/events/${row.id}`);
      setEditing(full);
      setForm({
        title: full.title,
        slug: full.slug,
        description: full.description,
        ageGroup: full.ageGroup ?? "",
        venue: full.venue ?? "",
        scheduleStartAt: toLocalDatetime(full.scheduleStartAt),
        scheduleEndAt: toLocalDatetime(full.scheduleEndAt),
        isRegistrationOpen: full.isRegistrationOpen,
        registrationFeeInPaise: full.registrationFeeInPaise ?? 0,
        themeId: full.themeId ?? "",
        pageTemplate: full.pageTemplate,
        ctaLabel: (full as { ctaLabel?: string }).ctaLabel ?? "",
        ctaUrl: (full as { ctaUrl?: string }).ctaUrl ?? "",
        seoTitle: full.seoTitle ?? "",
        seoDescription: full.seoDescription ?? "",
        isActive: full.isActive,
      });
      setBannerMedia(full.bannerMedia ?? null);
      const acts = Array.isArray(full.activities) ? full.activities : [];
      setActivities(acts.map((a) => ({ ...a, id: uid() })));
      const faqs = Array.isArray(full.faqItems) ? full.faqItems : [];
      setFaqItems(faqs.map((f) => ({ ...f, id: uid() })));
      const regs = await adminFetch<EventRegistration[]>(`/admin/events/${row.id}/registrations`).catch(() => []);
      setRegistrants(regs);
      setDrawerOpen(true);
    } catch (err) {
      toast({
        tone: "error",
        title: "Could not load event",
        description: err instanceof AdminApiError ? err.message : undefined,
      });
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const body = {
        title: form.title,
        slug: form.slug,
        description: form.description,
        bannerMediaId: bannerMedia?.id ?? null,
        ageGroup: form.ageGroup || null,
        venue: form.venue || null,
        scheduleStartAt: form.scheduleStartAt ? new Date(form.scheduleStartAt).toISOString() : null,
        scheduleEndAt: form.scheduleEndAt ? new Date(form.scheduleEndAt).toISOString() : null,
        isRegistrationOpen: form.isRegistrationOpen,
        registrationFeeInPaise: form.registrationFeeInPaise || null,
        themeId: form.themeId || null,
        pageTemplate: form.pageTemplate,
        activities: activities.map(({ title, description, icon }) => ({ title, description, icon })),
        faqItems: faqItems.map(({ question, answer }) => ({ question, answer })),
        ctaLabel: form.ctaLabel || null,
        ctaUrl: form.ctaUrl || null,
        seoTitle: form.seoTitle || null,
        seoDescription: form.seoDescription || null,
        isActive: form.isActive,
      };
      if (editing) {
        await adminFetch(`/admin/events/${editing.id}`, { method: "PUT", body });
        toast({ tone: "success", title: "Event updated" });
      } else {
        await adminFetch("/admin/events", { method: "POST", body });
        toast({ tone: "success", title: "Event created" });
      }
      setDrawerOpen(false);
      setDirty(false);
      reload();
    } catch (err) {
      setFormError(err instanceof AdminApiError ? err.message : "Could not save event.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onArchiveConfirm() {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await eventsRepo.archive(archiveTarget.id);
      toast({ tone: "success", title: "Event archived" });
      setArchiveTarget(null);
      reload();
    } catch (err) {
      toast({
        tone: "error",
        title: "Could not archive event",
        description: err instanceof AdminApiError ? err.message : undefined,
      });
    } finally {
      setArchiving(false);
    }
  }

  const themeOptions = [{ value: "", label: "No theme" }, ...themes.map((t) => ({ value: t.id, label: t.title }))];

  const columns: Column<EventItem>[] = [
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
      key: "scheduleStartAt",
      header: "Starts",
      hideBelow: "lg",
      cell: (r) => formatDateTime(r.scheduleStartAt),
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
        eyebrow="Content"
        title="Events"
        description="Manage public events and their landing-page presentation."
        actions={
          <button type="button" onClick={openCreate} className="btn btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm">
            <Plus size={16} /> New Event
          </button>
        }
      />
      <AdminDataTable
        columns={columns}
        rows={rows as EventItem[]}
        rowKey={(r) => r.id}
        total={total}
        query={query}
        onQueryChange={setQuery}
        loading={loading}
        error={error}
        onRetry={reload}
        searchPlaceholder="Search events…"
        rowActions={[
          { id: "edit", label: "Edit", icon: Pencil, onSelect: openEdit },
          { id: "archive", label: "Archive", icon: Archive, tone: "danger", onSelect: setArchiveTarget },
        ]}
        empty={{
          icon: PartyPopper,
          title: "No events yet",
          description: "Create the first event to get started.",
        }}
      />
      <AdminDrawerForm
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? "Edit Event" : "New Event"}
        onSubmit={onSubmit}
        submitting={submitting}
        error={formError}
        dirty={dirty}
        width="lg"
        submitLabel={drawerTab === "registrants" ? "Save" : "Save"}
        footerExtra={
          editing ? (
            <span className="text-xs text-(--color-text-muted)">
              {registrants.length} registration{registrants.length === 1 ? "" : "s"}
            </span>
          ) : undefined
        }
      >
        {editing && (
          <TabNav
            tabs={[
              { id: "details", label: "Details" },
              { id: "registrants", label: "Registrants", count: registrants.length },
            ]}
            active={drawerTab}
            onChange={(id) => setDrawerTab(id as "details" | "registrants")}
          />
        )}
        {drawerTab === "registrants" && editing ? (
          <div className="space-y-3">
            {registrants.length === 0 ? (
              <p className="text-sm text-(--color-text-muted)">No registrations yet.</p>
            ) : (
              <div className="overflow-x-auto rounded border border-(--color-border-soft)">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-(--color-surface)">
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-(--color-text-muted)">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-(--color-text-muted)">Contact</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-(--color-text-muted)">Guests</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-(--color-text-muted)">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrants.map((r) => (
                      <tr key={r.id} className="border-t border-(--color-border-soft)">
                        <td className="px-3 py-2 font-medium">{r.name}</td>
                        <td className="px-3 py-2 text-(--color-text-muted)">
                          {r.email}
                          <br />
                          {r.phone}
                        </td>
                        <td className="px-3 py-2">{r.guestCount}</td>
                        <td className="px-3 py-2">
                          <StatusBadge label={r.paymentStatus.replace(/_/g, " ")} tone={r.paymentStatus === "PAID" ? "success" : "neutral"} />
                          {r.amountPaidInPaise ? ` · ${formatPaise(r.amountPaidInPaise)}` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <>
            <FormField label="Title" htmlFor="event-title" required>
              <TextInput id="event-title" value={form.title} onChange={(e) => patch({ title: e.target.value })} required />
            </FormField>
            <FormField label="Slug" htmlFor="event-slug" required>
              <SlugInput id="event-slug" value={form.slug} onChange={(v) => patch({ slug: v })} source={form.title} />
            </FormField>
            <FormField label="Page template" htmlFor="event-template">
              <SelectInput
                id="event-template"
                value={form.pageTemplate}
                onChange={(e) => patch({ pageTemplate: e.target.value as EventPageTemplate })}
                options={templates}
              />
            </FormField>
            <FormField label="Banner image" htmlFor="event-banner">
              <MediaPicker kind="events" value={bannerMedia} onChange={(m) => { setBannerMedia(m); setDirty(true); }} />
            </FormField>
            <FormField label="Description" htmlFor="event-description" required>
              <HtmlEditor id="event-description" value={form.description} onChange={(html) => patch({ description: html })} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Age group" htmlFor="event-age">
                <TextInput id="event-age" value={form.ageGroup} onChange={(e) => patch({ ageGroup: e.target.value })} />
              </FormField>
              <FormField label="Venue" htmlFor="event-venue">
                <TextInput id="event-venue" value={form.venue} onChange={(e) => patch({ venue: e.target.value })} />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Starts" htmlFor="event-start">
                <DateTimeInput id="event-start" value={form.scheduleStartAt} onChange={(e) => patch({ scheduleStartAt: e.target.value })} />
              </FormField>
              <FormField label="Ends" htmlFor="event-end">
                <DateTimeInput id="event-end" value={form.scheduleEndAt} onChange={(e) => patch({ scheduleEndAt: e.target.value })} />
              </FormField>
            </div>
            <FormField label="Linked theme" htmlFor="event-theme">
              <SelectInput id="event-theme" value={form.themeId} onChange={(e) => patch({ themeId: e.target.value })} options={themeOptions} />
            </FormField>
            <div className="flex items-center justify-between">
              <label htmlFor="event-reg-open" className="text-sm font-medium">Registration open</label>
              <ToggleSwitch id="event-reg-open" checked={form.isRegistrationOpen} onChange={(v) => patch({ isRegistrationOpen: v })} />
            </div>
            <FormField label="Registration fee" htmlFor="event-fee">
              <PriceInput id="event-fee" value={form.registrationFeeInPaise} onChange={(v) => patch({ registrationFeeInPaise: v })} />
            </FormField>
            <AdminSubTable<ActivityRow>
              title="Activities"
              description="Highlights shown on the event landing page."
              rows={activities}
              rowKey={(r) => r.id}
              onAdd={() => {
                setActivities((prev) => [...prev, { id: uid(), title: "", description: null, icon: null }]);
                setDirty(true);
              }}
              addLabel="Add activity"
              onRemove={(row) => {
                setActivities((prev) => prev.filter((r) => r.id !== row.id));
                setDirty(true);
              }}
              onPatch={(rowId, p) => {
                setActivities((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...p } : r)));
                setDirty(true);
              }}
              columns={[
                {
                  key: "title",
                  header: "Title",
                  render: (row, { patch: p }) => (
                    <TextInput value={row.title} onChange={(e) => p({ title: e.target.value })} />
                  ),
                },
                {
                  key: "description",
                  header: "Description",
                  render: (row, { patch: p }) => (
                    <TextInput value={row.description ?? ""} onChange={(e) => p({ description: e.target.value || null })} />
                  ),
                },
              ]}
            />
            <AdminSubTable<FaqRow>
              title="FAQs"
              description="Event-specific questions and answers."
              rows={faqItems}
              rowKey={(r) => r.id}
              onAdd={() => {
                setFaqItems((prev) => [...prev, { id: uid(), question: "", answer: "" }]);
                setDirty(true);
              }}
              addLabel="Add FAQ"
              onRemove={(row) => {
                setFaqItems((prev) => prev.filter((r) => r.id !== row.id));
                setDirty(true);
              }}
              onPatch={(rowId, p) => {
                setFaqItems((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...p } : r)));
                setDirty(true);
              }}
              columns={[
                {
                  key: "question",
                  header: "Question",
                  render: (row, { patch: p }) => (
                    <TextInput value={row.question} onChange={(e) => p({ question: e.target.value })} />
                  ),
                },
                {
                  key: "answer",
                  header: "Answer",
                  render: (row, { patch: p }) => (
                    <TextArea value={row.answer} onChange={(e) => p({ answer: e.target.value })} rows={2} />
                  ),
                },
              ]}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="CTA label" htmlFor="event-cta-label">
                <TextInput id="event-cta-label" value={form.ctaLabel} onChange={(e) => patch({ ctaLabel: e.target.value })} />
              </FormField>
              <FormField label="CTA URL" htmlFor="event-cta-url">
                <TextInput id="event-cta-url" value={form.ctaUrl} onChange={(e) => patch({ ctaUrl: e.target.value })} />
              </FormField>
            </div>
            <FormField label="SEO title" htmlFor="event-seo-title">
              <TextInput id="event-seo-title" value={form.seoTitle} onChange={(e) => patch({ seoTitle: e.target.value })} />
            </FormField>
            <FormField label="SEO description" htmlFor="event-seo-desc">
              <TextArea id="event-seo-desc" value={form.seoDescription} onChange={(e) => patch({ seoDescription: e.target.value })} />
            </FormField>
            <div className="flex items-center justify-between">
              <label htmlFor="event-active" className="text-sm font-medium">Active</label>
              <ToggleSwitch id="event-active" checked={form.isActive} onChange={(v) => patch({ isActive: v })} />
            </div>
          </>
        )}
      </AdminDrawerForm>
      <AdminConfirmDialog
        open={!!archiveTarget}
        title="Archive this event?"
        message={
          <>
            Archive <strong>{archiveTarget?.title}</strong>?
          </>
        }
        submitting={archiving}
        onConfirm={onArchiveConfirm}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
}
