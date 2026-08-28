"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Plus, Pencil, Trash2, Warehouse } from "lucide-react";
import { fetchWarehouses, createWarehouse, updateWarehouse, deleteWarehouse, type Warehouse as WarehouseType } from "../../../../lib/data/inventory";

import { PageHeader } from "../../../../components/ui/PageHeader";
import { AdminDataTable, type Column } from "../../../../components/ui/AdminDataTable";
import { AdminDrawerForm } from "../../../../components/ui/AdminDrawerForm";
import { FormField } from "../../../../components/ui/FormField";
import { TextInput, ToggleSwitch } from "../../../../components/ui/fields";
import { useToast } from "../../../../components/ui/Toast";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { AdminConfirmDialog } from "../../../../components/ui/AdminConfirmDialog";

const EMPTY_FORM = {
  name: "",
  location: "",
  address: "",
  isDefault: false,
  isActive: true,
};

export default function WarehousesPage() {
  const [rows, setRows] = useState<WarehouseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<WarehouseType | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<WarehouseType | null>(null);
  const [deleting, setDeleting] = useState(false);

  const toast = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchWarehouses();
      setRows(data);
      setError(null);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDirty(false);
    setDrawerOpen(true);
  }

  function openEdit(row: WarehouseType) {
    setEditing(row);
    setForm({
      name: row.name,
      location: row.location || "",
      address: row.address || "",
      isDefault: row.isDefault,
      isActive: row.isActive,
    });
    setFormError(null);
    setDirty(false);
    setDrawerOpen(true);
  }

  function patchForm(patch: Partial<typeof EMPTY_FORM>) {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) {
        await updateWarehouse(editing.id, form);
        toast({ tone: "success", title: "Warehouse updated" });
      } else {
        await createWarehouse(form);
        toast({ tone: "success", title: "Warehouse created" });
      }
      setDrawerOpen(false);
      setDirty(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || "Could not save warehouse.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteWarehouse(deleteTarget.id);
      toast({ tone: "success", title: "Warehouse deleted" });
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      toast({ tone: "error", title: "Could not delete warehouse", description: err.message });
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<WarehouseType>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      cell: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-(--color-charcoal)">{r.name}</span>
          {r.isDefault && <StatusBadge label="Default" tone="neutral" size="sm" />}
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      cell: (r) => r.location || "—",
    },
    {
      key: "address",
      header: "Address",
      cell: (r) => r.address || "—",
    },
    {
      key: "isActive",
      header: "Status",
      cell: (r) => <StatusBadge label={r.isActive ? "Active" : "Inactive"} tone={r.isActive ? "success" : "neutral"} />,
    },
  ];

  return (
    <div className="p-8">
      <PageHeader
        title="Warehouses"
        description="Manage storage locations for your inventory."
        actions={
          <button type="button" onClick={openCreate} className="btn btn-primary px-4 py-2 text-sm">
            Add Warehouse
          </button>
        }
      />

      <div className="mt-8">
        <AdminDataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          total={rows.length}
          query={{ page: 1, pageSize: 100 }}
          onQueryChange={() => {}}
          loading={loading}
          error={error?.message ?? null}
          onRetry={loadData}
          searchPlaceholder="Search warehouses…"
          rowActions={[
            { id: "edit", label: "Edit", icon: Pencil, onSelect: openEdit },
            { id: "delete", label: "Delete", icon: Trash2, tone: "danger", onSelect: (w) => !w.isDefault && setDeleteTarget(w) },
          ]}
          empty={{ icon: Warehouse, title: "No warehouses", description: "Create your first warehouse location." }}
        />
      </div>

      <AdminDrawerForm
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? "Edit Warehouse" : "New Warehouse"}
        onSubmit={onSubmit}
        submitting={submitting}
        error={formError}
        dirty={dirty}
      >
        <FormField label="Name" htmlFor="warehouse-name" required>
          <TextInput id="warehouse-name" value={form.name} onChange={(e) => patchForm({ name: e.target.value })} required />
        </FormField>
        
        <FormField label="Location" htmlFor="warehouse-location" hint="City, Region, or Zone (Optional)">
          <TextInput id="warehouse-location" value={form.location} onChange={(e) => patchForm({ location: e.target.value })} />
        </FormField>
        
        <FormField label="Address" htmlFor="warehouse-address" hint="Full street address (Optional)">
          <TextInput id="warehouse-address" value={form.address} onChange={(e) => patchForm({ address: e.target.value })} />
        </FormField>
        
        <div className="flex items-center justify-between border-t border-(--color-border-soft) pt-4 mt-6">
          <div>
            <label htmlFor="warehouse-default" className="text-sm font-medium text-(--color-charcoal)">Default Warehouse</label>
            <p className="text-xs text-(--color-text-muted)">Used as the primary location for fulfillments</p>
          </div>
          <ToggleSwitch id="warehouse-default" checked={form.isDefault} onChange={(v) => patchForm({ isDefault: v })} />
        </div>

        <div className="flex items-center justify-between border-t border-(--color-border-soft) pt-4 mt-4">
          <div>
            <label htmlFor="warehouse-active" className="text-sm font-medium text-(--color-charcoal)">Active Status</label>
            <p className="text-xs text-(--color-text-muted)">Can receive and fulfill inventory</p>
          </div>
          <ToggleSwitch id="warehouse-active" checked={form.isActive} onChange={(v) => patchForm({ isActive: v })} />
        </div>
      </AdminDrawerForm>

      <AdminConfirmDialog
        open={!!deleteTarget}
        title="Delete this warehouse?"
        message={
          <>
            Delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
          </>
        }
        submitting={deleting}
        onConfirm={onDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
