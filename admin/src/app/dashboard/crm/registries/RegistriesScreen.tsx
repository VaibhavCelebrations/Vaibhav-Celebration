"use client";

import { Gift, Loader2, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { adminFetch, adminFetchList } from "@/lib/admin-api-client";
import { qs } from "@/lib/data/types";
import { useListQuery } from "@/lib/use-list-query";
import { AdminDataTable, type Column, type RowAction } from "@/components/ui/AdminDataTable";
import { AdminDrawerForm } from "@/components/ui/AdminDrawerForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { SelectInput } from "@/components/ui/fields";

type RegistryRow = {
  id: string;
  registryCode: string;
  title: string;
  status: string;
  visibility: string;
  owner?: { name: string; email: string };
  itemCount: number;
  orderCount: number;
  stats?: { quantityPurchased: number; quantityDesired: number };
  expiresAt: string;
};

type ExtractionRow = {
  id: string;
  sourceUrl: string;
  title: string | null;
  extractionStatus: string;
  extractionError: string | null;
  extractedAt: string;
};

export function RegistriesScreen() {
  const { query, setQuery } = useListQuery({ sort: "createdAt", dir: "desc" });
  const [tab, setTab] = useState<"registries" | "extractions">("registries");
  const [rows, setRows] = useState<RegistryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [extractions, setExtractions] = useState<ExtractionRow[]>([]);
  const [extractTotal, setExtractTotal] = useState(0);
  const toast = useToast();

  const loadRegistries = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminFetchList<RegistryRow>(`/admin/registries${qs(query)}`, {
        page: query.page,
        pageSize: query.pageSize,
      });
      setRows(result.items);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const loadExtractions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminFetchList<ExtractionRow>(`/admin/registries/extractions${qs(query)}`, {
        page: query.page,
        pageSize: query.pageSize,
      });
      setExtractions(result.items);
      setExtractTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (tab === "registries") void loadRegistries();
    else void loadExtractions();
  }, [tab, loadRegistries, loadExtractions]);

  const columns: Column<RegistryRow>[] = [
    { key: "registryCode", header: "Code", cell: (r) => r.registryCode },
    { key: "title", header: "Title", cell: (r) => r.title },
    { key: "owner", header: "Owner", cell: (r) => r.owner?.email ?? "—" },
    { key: "status", header: "Status", cell: (r) => r.status },
    { key: "visibility", header: "Visibility", cell: (r) => r.visibility },
    { key: "items", header: "Gifts", cell: (r) => `${r.stats?.quantityPurchased ?? 0}/${r.stats?.quantityDesired ?? r.itemCount}` },
    { key: "orders", header: "Orders", cell: (r) => r.orderCount },
  ];

  const extractActions: RowAction<ExtractionRow>[] = [
    {
      id: "retry",
      label: "Retry",
      icon: RotateCcw,
      onSelect: async (row) => {
        try {
          await adminFetch(`/admin/registries/extractions/${row.id}/retry`, { method: "POST" });
          toast({ title: "Extraction retried", tone: "success" });
          void loadExtractions();
        } catch (err) {
          toast({ title: err instanceof Error ? err.message : "Retry failed", tone: "error" });
        }
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Gift Registries" description="Oversight for registries, gifts, extractions, and registry orders." />
      <div className="flex gap-2">
        <button type="button" onClick={() => setTab("registries")} className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === "registries" ? "bg-(--color-mocha) text-white" : "bg-(--color-cream)"}`}>
          <Gift size={14} className="inline mr-1" /> Registries
        </button>
        <button type="button" onClick={() => setTab("extractions")} className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === "extractions" ? "bg-(--color-mocha) text-white" : "bg-(--color-cream)"}`}>
          Extractions
        </button>
      </div>

      {tab === "registries" ? (
        <AdminDataTable
          columns={columns}
          rows={rows}
          total={total}
          loading={loading}
          query={query}
          onQueryChange={setQuery}
          onRowClick={async (row) => {
            setDrawerOpen(true);
            setLoadingDetail(true);
            try {
              setDetail(await adminFetch(`/admin/registries/${row.id}`));
            } finally {
              setLoadingDetail(false);
            }
          }}
        />
      ) : (
        <AdminDataTable
          columns={[
            { key: "sourceUrl", header: "URL", cell: (r: ExtractionRow) => r.sourceUrl },
            { key: "title", header: "Title", cell: (r: ExtractionRow) => r.title ?? "—" },
            { key: "extractionStatus", header: "Status", cell: (r: ExtractionRow) => r.extractionStatus },
            { key: "extractionError", header: "Error", cell: (r: ExtractionRow) => r.extractionError ?? "—" },
          ]}
          rows={extractions}
          total={extractTotal}
          loading={loading}
          query={query}
          onQueryChange={setQuery}
          rowActions={extractActions}
        />
      )}

      <AdminDrawerForm open={drawerOpen} title={String(detail?.registryCode ?? "Registry")} onClose={() => setDrawerOpen(false)} onSubmit={(e) => e.preventDefault()} submitLabel="Close">
        {loadingDetail ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
        ) : detail ? (
          <div className="space-y-4 text-sm">
            <p><strong>Owner:</strong> {String((detail.owner as { name?: string; email?: string } | undefined)?.name ?? "")} ({String((detail.owner as { email?: string } | undefined)?.email ?? "")})</p>
            <p><strong>Status:</strong> {String(detail.status)} · {String(detail.visibility)}</p>
            <label className="block text-xs font-semibold">Update status
              <SelectInput
                className="mt-1"
                value={String(detail.status)}
                options={["DRAFT", "ACTIVE", "CLOSED", "EXPIRED", "ARCHIVED"].map((v) => ({ value: v, label: v }))}
                onChange={async (e) => {
                  const updated = await adminFetch<Record<string, unknown>>(`/admin/registries/${String(detail.id)}`, { method: "PATCH", body: { status: e.target.value } });
                  setDetail({ ...detail, ...updated });
                  toast({ title: "Registry updated", tone: "success" });
                }}
              />
            </label>
            <pre className="whitespace-pre-wrap bg-(--color-cream) rounded-xl p-3 font-sans">{String((detail.shippingAddress as { formatted?: string } | undefined)?.formatted ?? "No address")}</pre>
            <h3 className="font-semibold">Gifts</h3>
            <ul className="space-y-2">
              {((detail.items as Array<Record<string, unknown>>) ?? []).map((item) => (
                <li key={String(item.id)} className="border-b pb-2">
                  <p className="font-medium">{String(item.title)}</p>
                  <p className="text-xs">{String(item.sourceType)} · {String(item.quantityPurchased)}/{String(item.quantityDesired)}</p>
                </li>
              ))}
            </ul>
            <h3 className="font-semibold">Orders</h3>
            <ul className="space-y-1">
              {((detail.orders as Array<Record<string, unknown>>) ?? []).map((o) => (
                <li key={String(o.id)}>{String(o.orderCode)} · {String(o.paymentStatus)}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p>Select a registry</p>
        )}
      </AdminDrawerForm>
    </div>
  );
}
