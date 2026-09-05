"use client";

import { useState } from "react";
import { Boxes, History, Package } from "lucide-react";
import { productsRepo, adjustProductStock } from "../../../../lib/data/products";
import { useRepoList } from "../../../../lib/use-repo-list";
import { useListQuery } from "../../../../lib/use-list-query";

import { PageHeader } from "../../../../components/ui/PageHeader";
import { AdminDataTable, type Column } from "../../../../components/ui/AdminDataTable";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { stockStatus } from "../../../../lib/status";
import { StockAdjustDrawer } from "../../cms/products/ProductsScreen";
import { type Product } from "../../../../types/cms";

export default function StockLedgerPage() {
  const { query, setQuery } = useListQuery({ sort: "title", dir: "asc" });
  const { items: rows, total, loading, error, reload } = useRepoList(productsRepo.list, query);

  const [stockTarget, setStockTarget] = useState<Product | null>(null);

  const columns: Column<Product>[] = [
    {
      key: "title",
      header: "Product",
      sortable: true,
      cell: (r) => (
        <div className="flex items-center gap-3">
          {r.images[0]?.media.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.images[0].media.url} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted/50">
              <Package size={16} strokeWidth={1.75} className="text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{r.title}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">{r.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: "stock",
      header: "Available Stock",
      cell: (r) =>
        r.stock ? (
          <div className="flex items-center gap-2">
            <span className="font-medium text-lg">{r.stock.quantityAvailable}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) =>
        r.stock ? (
          <StatusBadge size="sm" {...stockStatus(r.stock.statusFlag)} />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "threshold",
      header: "Low Stock Alert At",
      hideBelow: "lg",
      cell: (r) => (
        <span className="text-muted-foreground text-sm">
          {r.stock ? r.stock.lowStockThreshold : "—"}
        </span>
      ),
    }
  ];

  return (
    <div className="p-8">
      <PageHeader
        title="Stock Ledger"
        description="View and manually adjust stock quantities for all products."
      />

      <div className="mt-8">
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
          searchPlaceholder="Search products by title or SKU…"
          rowActions={[
            { id: "stock", label: "Adjust stock", icon: Boxes, onSelect: setStockTarget },
          ]}
          empty={{ icon: Package, title: "No products yet", description: "Products will appear here once added in the CMS." }}
        />
      </div>

      <StockAdjustDrawer product={stockTarget} onClose={() => setStockTarget(null)} onAdjusted={reload} />
    </div>
  );
}
