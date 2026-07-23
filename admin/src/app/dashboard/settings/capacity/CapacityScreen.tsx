"use client";

import { CalendarRange, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AdminApiError, adminFetch } from "@/lib/admin-api-client";
import { capacityRulesRepo } from "@/lib/data/resources";
import { useListQuery } from "@/lib/use-list-query";
import { useRepoList } from "@/lib/use-repo-list";
import { AdminDataTable, type Column } from "@/components/ui/AdminDataTable";
import { AdminDrawerForm } from "@/components/ui/AdminDrawerForm";
import { FormField } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { NumberInput, SelectInput, TextInput, ToggleSwitch } from "@/components/ui/fields";

type CapacityRule = {
  id: string;
  scope: "GLOBAL_DEFAULT" | "SPECIFIC_DATE";
  specificDate: string | null;
  maxBookingsPerDay: number;
  isBlocked: boolean;
  updatedAt?: string;
};

type FormState = {
  scope: "GLOBAL_DEFAULT" | "SPECIFIC_DATE";
  specificDate: string;
  maxBookingsPerDay: number;
  isBlocked: boolean;
};

const EMPTY: FormState = {
  scope: "GLOBAL_DEFAULT",
  specificDate: "",
  maxBookingsPerDay: 2,
  isBlocked: false,
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return value.slice(0, 10);
}

export function CapacityScreen() {
  const { query, setQuery } = useListQuery({ sort: "updatedAt", dir: "desc", pageSize: 50 });
  const { items, total, loading, error, reload } = useRepoList(capacityRulesRepo.list, query);
  const rows = items as CapacityRule[];

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CapacityRule | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const toast = useToast();

  const patch = (value: Partial<FormState>) => {
    setForm((current) => ({ ...current, ...value }));
    setDirty(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setDirty(false);
    setFormError(null);
    setDrawerOpen(true);
  };

  const openEdit = (row: CapacityRule) => {
    setEditing(row);
    setForm({
      scope: row.scope,
      specificDate: formatDate(row.specificDate) === "—" ? "" : formatDate(row.specificDate),
      maxBookingsPerDay: row.maxBookingsPerDay,
      isBlocked: row.isBlocked,
    });
    setDirty(false);
    setFormError(null);
    setDrawerOpen(true);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.scope === "SPECIFIC_DATE" && !form.specificDate) {
      setFormError("Pick a date for a date-specific rule.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const body = {
        scope: form.scope,
        specificDate: form.scope === "SPECIFIC_DATE" ? form.specificDate : null,
        maxBookingsPerDay: form.maxBookingsPerDay,
        isBlocked: form.isBlocked,
      };
      if (editing) {
        await adminFetch(`/admin/capacity-rules/${editing.id}`, {
          method: "PUT",
          body: {
            maxBookingsPerDay: body.maxBookingsPerDay,
            isBlocked: body.isBlocked,
            specificDate: body.specificDate,
          },
        });
      } else {
        await capacityRulesRepo.create(body);
      }
      toast({ tone: "success", title: editing ? "Capacity rule updated" : "Capacity rule created" });
      setDrawerOpen(false);
      reload();
    } catch (err) {
      setFormError(err instanceof AdminApiError ? err.message : "Could not save capacity rule.");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<CapacityRule>[] = [
    {
      key: "scope",
      header: "Scope",
      cell: (row) => (
        <span className="font-medium text-(--color-charcoal)">
          {row.scope === "GLOBAL_DEFAULT" ? "Global default" : "Specific date"}
        </span>
      ),
    },
    {
      key: "specificDate",
      header: "Date",
      cell: (row) => formatDate(row.specificDate),
    },
    {
      key: "maxBookingsPerDay",
      header: "Max / day",
      cell: (row) => String(row.maxBookingsPerDay),
    },
    {
      key: "isBlocked",
      header: "Status",
      cell: (row) => (
        <StatusBadge
          label={row.isBlocked ? "Blocked" : "Open"}
          tone={row.isBlocked ? "neutral" : "success"}
        />
      ),
    },
  ];

  return (
    <div className="w-full">
      <PageHeader
        eyebrow="Settings"
        title="Capacity Rules"
        description="Set booking limits and block unavailable celebration dates."
        actions={
          <button type="button" onClick={openCreate} className="btn btn-primary px-4 py-2 text-sm">
            <Plus size={16} /> New rule
          </button>
        }
      />
      <AdminDataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        total={total}
        query={query}
        onQueryChange={setQuery}
        loading={loading}
        error={error}
        onRetry={reload}
        searchPlaceholder="Search capacity rules…"
        rowActions={[
          { id: "edit", label: "Edit", onSelect: openEdit },
        ]}
        empty={{
          icon: CalendarRange,
          title: "No capacity rules yet",
          description: "Create a global default or block a specific date.",
        }}
      />
      <AdminDrawerForm
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? "Edit capacity rule" : "New capacity rule"}
        onSubmit={onSubmit}
        submitting={submitting}
        error={formError}
        dirty={dirty}
      >
        {!editing && (
          <FormField label="Scope" htmlFor="capacity-scope" required>
            <SelectInput
              id="capacity-scope"
              value={form.scope}
              onChange={(event) =>
                patch({ scope: event.target.value as FormState["scope"] })
              }
              options={[
                { value: "GLOBAL_DEFAULT", label: "Global default" },
                { value: "SPECIFIC_DATE", label: "Specific date" },
              ]}
            />
          </FormField>
        )}
        {(form.scope === "SPECIFIC_DATE" || editing?.scope === "SPECIFIC_DATE") && (
          <FormField label="Date" htmlFor="capacity-date" required>
            <TextInput
              id="capacity-date"
              type="date"
              value={form.specificDate}
              onChange={(event) => patch({ specificDate: event.target.value })}
              required
            />
          </FormField>
        )}
        <FormField label="Max bookings per day" htmlFor="capacity-max" required>
          <NumberInput
            id="capacity-max"
            value={form.maxBookingsPerDay}
            onChange={(value) => patch({ maxBookingsPerDay: value })}
            min={0}
          />
        </FormField>
        <div className="flex items-center justify-between">
          <label htmlFor="capacity-blocked" className="text-sm font-medium text-(--color-charcoal)">
            Block this day entirely
          </label>
          <ToggleSwitch
            id="capacity-blocked"
            checked={form.isBlocked}
            onChange={(isBlocked) => patch({ isBlocked })}
          />
        </div>
      </AdminDrawerForm>
    </div>
  );
}
