"use client";

import { useEffect, useState } from "react";
import { AlertCircle, IndianRupee, TrendingDown, PackageOpen } from "lucide-react";
import { adminFetch } from "../../../../lib/admin-api-client";
import { PageHeader } from "../../../../components/ui/PageHeader";

// Format currency
function formatCurrency(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(paise / 100);
}

type ValuationItem = {
  id: string;
  title: string;
  sku: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
};

type ValuationData = {
  items: ValuationItem[];
  totalValuation: number;
};

type LowStockItem = {
  id: string;
  title: string;
  sku: string;
  quantity: number;
  threshold: number;
  status: "LOW_STOCK" | "OUT_OF_STOCK" | "IN_STOCK";
  lastRestockedAt: string | null;
};

export default function InventoryReportsPage() {
  const [valuationData, setValuationData] = useState<ValuationData | null>(null);
  const [isLoadingValuation, setIsLoadingValuation] = useState(true);

  const [lowStockData, setLowStockData] = useState<LowStockItem[] | null>(null);
  const [isLoadingLowStock, setIsLoadingLowStock] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setIsLoadingValuation(true);
        const vData = await adminFetch<ValuationData>("/admin/inventory-reports/valuation");
        if (isMounted) setValuationData(vData);
      } catch (err) {
        console.error("Failed to load valuation data", err);
      } finally {
        if (isMounted) setIsLoadingValuation(false);
      }

      try {
        setIsLoadingLowStock(true);
        const lsData = await adminFetch<LowStockItem[]>("/admin/inventory-reports/low-stock");
        if (isMounted) setLowStockData(lsData);
      } catch (err) {
        console.error("Failed to load low stock data", err);
      } finally {
        if (isMounted) setIsLoadingLowStock(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="p-8 flex flex-col gap-6 w-full">
      <PageHeader 
        title="Inventory Reports" 
        description="Valuation, low stock alerts, and analytics." 
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Inventory Value */}
        <div className="bg-white border border-(--color-border-soft) rounded-lg p-6 shadow-sm">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-(--color-charcoal)">Total Inventory Value</h3>
            <IndianRupee className="h-4 w-4 text-(--color-text-muted)" />
          </div>
          <div>
            <div className="text-2xl font-bold text-(--color-charcoal)">
              {isLoadingValuation ? "..." : formatCurrency(valuationData?.totalValuation ?? 0)}
            </div>
            <p className="text-xs text-(--color-text-muted) mt-1">Based on current purchase price × quantity</p>
          </div>
        </div>

        {/* Active Products with Stock */}
        <div className="bg-white border border-(--color-border-soft) rounded-lg p-6 shadow-sm">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-(--color-charcoal)">Active Products with Stock</h3>
            <PackageOpen className="h-4 w-4 text-(--color-text-muted)" />
          </div>
          <div>
            <div className="text-2xl font-bold text-(--color-charcoal)">
              {isLoadingValuation ? "..." : valuationData?.items?.length ?? 0}
            </div>
            <p className="text-xs text-(--color-text-muted) mt-1">Products currently holding inventory</p>
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-white border border-(--color-border-soft) rounded-lg p-6 shadow-sm">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-(--color-charcoal)">Low Stock Items</h3>
            <TrendingDown className="h-4 w-4 text-yellow-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-(--color-charcoal)">
              {isLoadingLowStock ? "..." : lowStockData?.filter((i) => i.status === "LOW_STOCK").length ?? 0}
            </div>
            <p className="text-xs text-(--color-text-muted) mt-1">Below threshold but still in stock</p>
          </div>
        </div>

        {/* Out of Stock */}
        <div className="bg-white border border-(--color-border-soft) rounded-lg p-6 shadow-sm">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-(--color-charcoal)">Out of Stock</h3>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {isLoadingLowStock ? "..." : lowStockData?.filter((i) => i.status === "OUT_OF_STOCK").length ?? 0}
            </div>
            <p className="text-xs text-(--color-text-muted) mt-1">Zero quantity available</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Low Stock Alerts */}
        <div className="bg-white border border-(--color-border-soft) rounded-lg shadow-sm">
          <div className="p-6 border-b border-(--color-border-soft)">
            <h3 className="text-lg font-semibold text-(--color-charcoal)">Low Stock Alerts</h3>
          </div>
          <div className="p-6">
            {isLoadingLowStock ? (
              <p className="text-sm text-(--color-text-muted)">Loading...</p>
            ) : lowStockData?.length === 0 ? (
              <p className="text-sm text-(--color-text-muted)">All items are sufficiently stocked.</p>
            ) : (
              <div className="rounded-md border border-(--color-border-soft) overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 border-b border-(--color-border-soft) text-xs font-semibold text-(--color-text-muted) uppercase">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--color-border-soft)">
                    {lowStockData?.slice(0, 10).map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium truncate max-w-50 text-(--color-charcoal)" title={item.title}>
                            {item.title}
                          </div>
                          <div className="text-xs text-(--color-text-muted)">{item.sku}</div>
                        </td>
                        <td className="px-4 py-3">
                          {item.status === "OUT_OF_STOCK" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              Out of Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-yellow-500 text-yellow-700 bg-yellow-50">
                              Low Stock
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={item.quantity <= 0 ? "text-red-600 font-bold" : "text-yellow-600 font-bold"}>
                            {item.quantity}
                          </span>
                          <span className="text-xs text-(--color-text-muted) block">
                            / {item.threshold}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Top Inventory by Value */}
        <div className="bg-white border border-(--color-border-soft) rounded-lg shadow-sm">
          <div className="p-6 border-b border-(--color-border-soft)">
            <h3 className="text-lg font-semibold text-(--color-charcoal)">Top Inventory by Value</h3>
          </div>
          <div className="p-6">
            {isLoadingValuation ? (
              <p className="text-sm text-(--color-text-muted)">Loading...</p>
            ) : valuationData?.items.length === 0 ? (
              <p className="text-sm text-(--color-text-muted)">No inventory data available.</p>
            ) : (
              <div className="rounded-md border border-(--color-border-soft) overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 border-b border-(--color-border-soft) text-xs font-semibold text-(--color-text-muted) uppercase">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-right">Total Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--color-border-soft)">
                    {valuationData?.items
                      .sort((a, b) => b.totalValue - a.totalValue)
                      .slice(0, 10)
                      .map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium truncate max-w-50 text-(--color-charcoal)" title={item.title}>
                              {item.title}
                            </div>
                            <div className="text-xs text-(--color-text-muted)">{item.sku}</div>
                          </td>
                          <td className="px-4 py-3 text-right text-(--color-charcoal)">{item.quantity}</td>
                          <td className="px-4 py-3 text-right font-medium text-(--color-charcoal)">
                            {formatCurrency(item.totalValue)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
