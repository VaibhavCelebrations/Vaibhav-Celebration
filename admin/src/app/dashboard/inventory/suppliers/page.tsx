"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Phone, Mail, MapPin, Building2, Search } from "lucide-react";
import {
  fetchSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  type Supplier,
} from "@/lib/data/inventory";

// ─── Modal ────────────────────────────────────────────────────────────────────

function SupplierModal({
  supplier,
  onSave,
  onClose,
}: {
  supplier: Partial<Supplier> | null;
  onSave: (data: Partial<Supplier>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Supplier>>(supplier ?? { isActive: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof Supplier, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(33,33,33,0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card w-full max-w-xl overflow-hidden"
        style={{ animation: "modal-in 200ms ease" }}
      >
        <div className="border-b px-6 py-4" style={{ borderColor: "var(--color-border-soft)" }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem" }}>
            {supplier?.id ? "Edit Supplier" : "Add Supplier"}
          </h2>
        </div>
        <form onSubmit={onSubmit} className="overflow-y-auto px-6 py-5" style={{ maxHeight: "75vh" }}>
          {error && (
            <div
              className="mb-4 rounded-lg p-3 text-sm"
              style={{ background: "var(--color-error-bg)", color: "var(--color-error)" }}
            >
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-charcoal)" }}>
                Supplier Name <span style={{ color: "var(--color-error)" }}>*</span>
              </label>
              <input
                className="input"
                value={form.name ?? ""}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. ABC Decoration Supplies"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-charcoal)" }}>
                Contact Person
              </label>
              <input
                className="input"
                value={form.contactPerson ?? ""}
                onChange={(e) => set("contactPerson", e.target.value)}
                placeholder="Full name"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-charcoal)" }}>
                Phone
              </label>
              <input
                className="input"
                type="tel"
                value={form.phone ?? ""}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-charcoal)" }}>
                Email
              </label>
              <input
                className="input"
                type="email"
                value={form.email ?? ""}
                onChange={(e) => set("email", e.target.value)}
                placeholder="supplier@example.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-charcoal)" }}>
                City
              </label>
              <input
                className="input"
                value={form.city ?? ""}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Mumbai"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-charcoal)" }}>
                Address
              </label>
              <textarea
                className="input"
                rows={2}
                value={form.address ?? ""}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Full address"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-charcoal)" }}>
                GSTIN
              </label>
              <input
                className="input"
                value={form.gstin ?? ""}
                onChange={(e) => set("gstin", e.target.value.toUpperCase())}
                placeholder="22ABCDE1234F1Z5"
                maxLength={15}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-charcoal)" }}>
                Status
              </label>
              <select
                className="input"
                value={form.isActive ? "true" : "false"}
                onChange={(e) => set("isActive", e.target.value === "true")}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-charcoal)" }}>
                Notes
              </label>
              <textarea
                className="input"
                rows={3}
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Payment terms, lead times, special instructions…"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : supplier?.id ? "Update Supplier" : "Add Supplier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; supplier: Partial<Supplier> | null }>({
    open: false,
    supplier: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);

  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchSuppliers({ page, pageSize: PAGE_SIZE, search: search || undefined });
      setSuppliers(result.items);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { void load(); }, [load]);

  async function handleSave(data: Partial<Supplier>) {
    if (modal.supplier?.id) {
      await updateSupplier(modal.supplier.id, data);
    } else {
      await createSupplier(data);
    }
    await load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSupplier(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 style={{ fontFamily: "var(--font-serif)", color: "var(--color-charcoal)" }}>Suppliers</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
            {total} supplier{total !== 1 ? "s" : ""} in directory
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary flex items-center gap-2"
          onClick={() => setModal({ open: true, supplier: null })}
        >
          <Plus size={16} />
          Add Supplier
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
        <input
          className="input pl-9"
          placeholder="Search suppliers…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-4">
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}
          </div>
        ) : suppliers.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 size={40} className="mx-auto mb-3" style={{ color: "var(--color-text-muted)" }} />
            <p className="font-medium" style={{ color: "var(--color-charcoal)" }}>No suppliers yet</p>
            <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
              Add your first supplier to start creating purchase orders
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border-soft)" }}>
                  {["Name", "Contact", "Phone / Email", "City", "GSTIN", "Status", ""].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id} className="table-row" style={{ borderBottom: "1px solid var(--color-border-soft)" }}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm" style={{ color: "var(--color-charcoal)" }}>{s.name}</p>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      {s.contactPerson ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {s.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={11} /> {s.phone}
                          </span>
                        )}
                        {s.email && (
                          <span className="flex items-center gap-1">
                            <Mail size={11} /> {s.email}
                          </span>
                        )}
                        {!s.phone && !s.email && "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      {s.city ? (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} /> {s.city}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: "var(--color-text-secondary)" }}>
                      {s.gstin ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${s.isActive ? "badge-success" : "badge-neutral"}`}>
                        {s.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="Edit"
                          className="rounded p-1.5 transition-colors hover:bg-gray-100"
                          onClick={() => setModal({ open: true, supplier: s })}
                        >
                          <Pencil size={14} style={{ color: "var(--color-text-muted)" }} />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          className="rounded p-1.5 transition-colors hover:bg-red-50"
                          onClick={() => setDeleteTarget(s)}
                        >
                          <Trash2 size={14} style={{ color: "var(--color-error)" }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t px-4 py-3" style={{ borderColor: "var(--color-border-soft)" }}>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button className="btn btn-ghost py-1.5 px-3 text-xs" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                ← Prev
              </button>
              <button
                className="btn btn-ghost py-1.5 px-3 text-xs"
                disabled={page * PAGE_SIZE >= total}
                onClick={() => setPage(p => p + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Supplier Modal */}
      {modal.open && (
        <SupplierModal
          supplier={modal.supplier}
          onSave={handleSave}
          onClose={() => setModal({ open: false, supplier: null })}
        />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(33,33,33,0.5)", backdropFilter: "blur(4px)" }}
        >
          <div className="card w-full max-w-sm p-6" style={{ animation: "modal-in 200ms ease" }}>
            <h3 className="font-semibold mb-2" style={{ color: "var(--color-charcoal)" }}>
              Delete Supplier?
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
              <strong>{deleteTarget.name}</strong> will be soft-deleted and removed from all new purchase orders.
            </p>
            <div className="flex justify-end gap-3">
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button
                className="btn"
                style={{ background: "var(--color-error)", color: "#fff" }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
