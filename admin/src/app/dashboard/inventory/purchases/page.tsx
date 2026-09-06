"use client";

import { useEffect, useState, useCallback } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Package, ChevronDown, Search, Filter } from "lucide-react";
import {
  fetchPurchaseOrders,
  fetchSuppliers,
  type PurchaseOrder,
  type PurchaseOrderStatus,
  type Supplier,
} from "@/lib/data/inventory";
import { formatDate } from "@/lib/format";

const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  DRAFT: "Draft",
  ORDERED: "Ordered",
  PARTIALLY_RECEIVED: "Partially Received",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

const STATUS_BADGE: Record<PurchaseOrderStatus, string> = {
  DRAFT: "badge-neutral",
  ORDERED: "badge-info",
  PARTIALLY_RECEIVED: "badge-warning",
  RECEIVED: "badge-success",
  CANCELLED: "badge-error",
};

function formatPaise(p: number) {
  return `₹${(p / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function PurchaseOrdersInner() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PurchaseOrderStatus | "">(
    (searchParams.get("status") as PurchaseOrderStatus) ?? "",
  );
  const [supplierId, setSupplierId] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchPurchaseOrders({
        page,
        pageSize: PAGE_SIZE,
        status: status || undefined,
        supplierId: supplierId || undefined,
      });
      setOrders(result.items);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, [page, status, supplierId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    fetchSuppliers({ pageSize: 100 }).then((r) => setSuppliers(r.items));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 style={{ fontFamily: "var(--font-serif)", color: "var(--color-charcoal)" }}>Purchase Orders</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
            {total} order{total !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link href="/dashboard/inventory/purchases/new" className="btn btn-primary flex items-center gap-2">
          <Plus size={16} />
          New Purchase Order
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
          <select
            className="input pl-8 pr-8 text-sm"
            value={status}
            onChange={(e) => { setStatus(e.target.value as PurchaseOrderStatus | ""); setPage(1); }}
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div className="relative">
          <select
            className="input pr-8 text-sm"
            value={supplierId}
            onChange={(e) => { setSupplierId(e.target.value); setPage(1); }}
          >
            <option value="">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-4">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={40} className="mx-auto mb-3" style={{ color: "var(--color-text-muted)" }} />
            <p className="font-medium" style={{ color: "var(--color-charcoal)" }}>No purchase orders found</p>
            <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
              {status || supplierId ? "Try adjusting filters" : "Create your first purchase order to restock inventory"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border-soft)" }}>
                  {["PO Number", "Supplier", "Status", "Items", "Total", "Expected", "Created", ""].map((h) => (
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
                {orders.map((po) => (
                  <tr key={po.id} className="table-row" style={{ borderBottom: "1px solid var(--color-border-soft)" }}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-semibold" style={{ color: "var(--color-charcoal)" }}>
                        {po.poNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                      {po.Supplier?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${STATUS_BADGE[po.status]}`}>
                        {STATUS_LABELS[po.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center" style={{ color: "var(--color-text-secondary)" }}>
                      {po.items?.length ?? 0}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: "var(--color-charcoal)" }}>
                      {formatPaise(po.totalInPaise)}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {po.expectedAt ? formatDate(po.expectedAt) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {formatDate(po.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/inventory/purchases/${po.id}`}
                        className="btn btn-ghost py-1 px-3 text-xs"
                      >
                        View
                      </Link>
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
    </div>
  );
}

export default function PurchaseOrdersPage() {
  return (
    <Suspense fallback={<div className="skeleton h-64 rounded-xl" />}>
      <PurchaseOrdersInner />
    </Suspense>
  );
}
