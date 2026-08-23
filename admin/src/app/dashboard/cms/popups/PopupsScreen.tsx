"use client";

import { Trash2, Megaphone, Pencil, Plus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { AdminApiError, adminFetchList } from "@/lib/admin-api-client";
import { popupsRepo } from "@/lib/data/resources";
import { useListQuery } from "@/lib/use-list-query";
import { useRepoList } from "@/lib/use-repo-list";
import { formatDate } from "@/lib/format";
import { AdminConfirmDialog } from "@/components/ui/AdminConfirmDialog";
import { AdminDataTable, type Column } from "@/components/ui/AdminDataTable";
import { AdminDrawerForm } from "@/components/ui/AdminDrawerForm";
import { FormField } from "@/components/ui/FormField";
import { MediaPicker } from "@/components/ui/MediaPicker";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { DateInput, MultiSelectInput, NumberInput, SelectInput, TextArea, TextInput, ToggleSwitch } from "@/components/ui/fields";
import type { MediaRef } from "@/types/common";
import type { Popup, PopupInput, PopupPlacement } from "@/types/cms";
import { POPUP_PLACEMENTS } from "@/types/cms";

type PopupForm = PopupInput & { imageId?: string | null };

const EMPTY: PopupForm = {
  title: "",
  bodyText: "",
  ctaLabel: "",
  ctaUrl: "",
  placements: ["HOMEPAGE"],
  triggerAfterSeconds: 5,
  linkedEventId: null,
  isActive: true,
  startsAt: null,
  endsAt: null,
  imageId: null,
};

type EventOption = { id: string; title: string };

function toDateInput(iso: string | null | undefined) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function PopupsScreen() {
  const { query, setQuery } = useListQuery({ sort: "createdAt", dir: "desc" });
  const { items: rows, total, loading, error, reload } = useRepoList(popupsRepo.list, query);

  const [events, setEvents] = useState<EventOption[]>([]);
  const [image, setImage] = useState<MediaRef | null>(null);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Popup | null>(null);
  const [form, setForm] = useState<PopupForm>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Popup | null>(null);
  const [archiving, setArchiving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    void adminFetchList<EventOption>("/admin/events?page=1&pageSize=100", { page: 1, pageSize: 100 })
      .then((r) => setEvents(r.items))
      .catch(() => setEvents([]));
  }, []);

  function patch(patch: Partial<PopupForm>) {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setImage(null);
    setStartsAt("");
    setEndsAt("");
    setFormError(null);
    setDirty(false);
    setDrawerOpen(true);
  }

  function openEdit(row: Popup) {
    setEditing(row);
    setForm({
      title: row.title,
      bodyText: row.bodyText ?? "",
      ctaLabel: row.ctaLabel ?? "",
      ctaUrl: row.ctaUrl ?? "",
      placements: row.placements,
      triggerAfterSeconds: row.triggerAfterSeconds,
      linkedEventId: row.linkedEventId,
      isActive: row.isActive,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      imageId: row.image?.id ?? null,
    });
    setImage(row.image);
    setStartsAt(toDateInput(row.startsAt));
    setEndsAt(toDateInput(row.endsAt));
    setFormError(null);
    setDirty(false);
    setDrawerOpen(true);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (form.placements.length === 0) {
      setFormError("Select at least one placement.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const body = {
        title: form.title,
        bodyText: form.bodyText || null,
        imageId: image?.id ?? null,
        ctaLabel: form.ctaLabel || null,
        ctaUrl: form.ctaUrl || null,
        placements: form.placements,
        triggerAfterSeconds: form.triggerAfterSeconds,
        linkedEventId: form.linkedEventId || null,
        isActive: form.isActive,
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      };
      if (editing) {
        await popupsRepo.update(editing.id, body);
        toast({ tone: "success", title: "Popup updated" });
      } else {
        await popupsRepo.create(body);
        toast({ tone: "success", title: "Popup created" });
      }
      setDrawerOpen(false);
      setDirty(false);
      reload();
    } catch (err) {
      setFormError(err instanceof AdminApiError ? err.message : "Could not save popup.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onArchiveConfirm() {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await popupsRepo.archive(archiveTarget.id);
      toast({ tone: "success", title: "Popup archived" });
      setArchiveTarget(null);
      reload();
    } catch (err) {
      toast({
        tone: "error",
        title: "Could not archive popup",
        description: err instanceof AdminApiError ? err.message : undefined,
      });
    } finally {
      setArchiving(false);
    }
  }

  const placementOptions = POPUP_PLACEMENTS.map((p) => ({
    value: p,
    label: p.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  }));

  const columns: Column<Popup>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      cell: (r) => <span className="font-medium text-(--color-charcoal)">{r.title}</span>,
    },
    {
      key: "placements",
      header: "Placements",
      hideBelow: "md",
      cell: (r) => r.placements.join(", "),
    },
    {
      key: "startsAt",
      header: "Schedule",
      hideBelow: "lg",
      cell: (r) => {
        if (!r.startsAt && !r.endsAt) return "Always";
        return `${formatDate(r.startsAt)} – ${formatDate(r.endsAt)}`;
      },
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
        title="Popups"
        description="Manage time-bound calls to action across public pages."
        actions={
          <button type="button" onClick={openCreate} className="btn btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm">
            <Plus size={16} /> New Popup
          </button>
        }
      />
      <AdminDataTable
        columns={columns}
        rows={rows as Popup[]}
        rowKey={(r) => r.id}
        total={total}
        query={query}
        onQueryChange={setQuery}
        loading={loading}
        error={error}
        onRetry={reload}
        searchPlaceholder="Search popups…"
        rowActions={[
          { id: "edit", label: "Edit", icon: Pencil, onSelect: openEdit },
          { id: "archive", label: "Delete", icon: Trash2, tone: "danger", onSelect: setArchiveTarget },
        ]}
        empty={{
          icon: Megaphone,
          title: "No popups yet",
          description: "Create a popup to promote events or offers.",
        }}
      />
      <AdminDrawerForm
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? "Edit Popup" : "New Popup"}
        onSubmit={onSubmit}
        submitting={submitting}
        error={formError}
        dirty={dirty}
        width="lg"
      >
        <FormField label="Title" htmlFor="popup-title" required>
          <TextInput id="popup-title" value={form.title} onChange={(e) => patch({ title: e.target.value })} required />
        </FormField>
        <FormField label="Body text" htmlFor="popup-body">
          <TextArea id="popup-body" value={form.bodyText ?? ""} onChange={(e) => patch({ bodyText: e.target.value })} />
        </FormField>
        <FormField label="Image" htmlFor="popup-image">
          <MediaPicker kind="popups" value={image} onChange={(m) => { setImage(m); patch({ imageId: m?.id ?? null }); }} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="CTA label" htmlFor="popup-cta-label">
            <TextInput id="popup-cta-label" value={form.ctaLabel ?? ""} onChange={(e) => patch({ ctaLabel: e.target.value })} />
          </FormField>
          <FormField label="CTA URL" htmlFor="popup-cta-url">
            <TextInput id="popup-cta-url" value={form.ctaUrl ?? ""} onChange={(e) => patch({ ctaUrl: e.target.value })} />
          </FormField>
        </div>
        <FormField label="Placements" htmlFor="popup-placements" required>
          <MultiSelectInput
            id="popup-placements"
            value={form.placements}
            onChange={(placements) => patch({ placements: placements as PopupPlacement[] })}
            options={placementOptions}
            placeholder="Select pages…"
          />
        </FormField>
        <FormField label="Trigger delay (seconds)" htmlFor="popup-trigger">
          <NumberInput
            id="popup-trigger"
            value={form.triggerAfterSeconds}
            min={0}
            onChange={(n) => patch({ triggerAfterSeconds: n })}
          />
        </FormField>
        <FormField label="Linked event" htmlFor="popup-event">
          <SelectInput
            id="popup-event"
            value={form.linkedEventId ?? ""}
            onChange={(e) => patch({ linkedEventId: e.target.value || null })}
            options={[{ value: "", label: "None" }, ...events.map((ev) => ({ value: ev.id, label: ev.title }))]}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Starts" htmlFor="popup-starts">
            <DateInput id="popup-starts" value={startsAt} onChange={(e) => { setStartsAt(e.target.value); setDirty(true); }} />
          </FormField>
          <FormField label="Ends" htmlFor="popup-ends">
            <DateInput id="popup-ends" value={endsAt} onChange={(e) => { setEndsAt(e.target.value); setDirty(true); }} />
          </FormField>
        </div>
        <div className="flex items-center justify-between">
          <label htmlFor="popup-active" className="text-sm font-medium">Active</label>
          <ToggleSwitch id="popup-active" checked={form.isActive} onChange={(v) => patch({ isActive: v })} />
        </div>
      </AdminDrawerForm>
      <AdminConfirmDialog
        open={!!archiveTarget}
        title="Archive this popup?"
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
