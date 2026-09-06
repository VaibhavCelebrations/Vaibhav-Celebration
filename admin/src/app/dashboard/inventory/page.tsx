"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  IndianRupee,
  ShoppingCart,
  Truck,
  Warehouse,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { fetchInventoryStats, fetchPurchaseOrders, type InventoryStats } from "@/lib/data/inventory";

function formatPaise(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 10_000_000) return `₹${(rupees / 10_000_000).toFixed(2)}Cr`;
  if (rupees >= 100_000) return `₹${(rupees / 100_000).toFixed(2)}L`;
  if (rupees >= 1_000) return `₹${(rupees / 1_000).toFixed(1)}K`;
  return `₹${rupees.toFixed(0)}`;
}

type StatCardProps = {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bg: string;
  href?: string;
  badge?: { label: string; color: string };
};

function StatCard({ label, value, icon, color, bg, href, badge }: StatCardProps) {
  const inner = (
    <div className="card flex items-start gap-4 p-5 group" style={{ minHeight: 100 }}>
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ background: bg, color }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
          {label}
        </p>
        <p className="mt-1 text-2xl font-semibold" style={{ color: "var(--color-charcoal)", fontFamily: "var(--font-serif)" }}>
          {value}
        </p>
        {badge && (
          <span className={`badge mt-1.5 ${badge.color}`}>{badge.label}</span>
        )}
      </div>
      {href && (
        <ArrowRight
          size={16}
          className="shrink-0 mt-1 transition-transform group-hover:translate-x-1"
          style={{ color: "var(--color-text-muted)" }}
        />
      )}
    </div>
  );
  if (href) return <Link href={href} className="block">{inner}</Link>;
  return inner;
}

function QuickLink({ href, icon, label, sublabel }: { href: string; icon: React.ReactNode; label: string; sublabel: string }) {
  return (
    <Link href={href} className="card flex items-center gap-3 p-4 transition-all hover:shadow-md group">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: "var(--color-blush-light)", color: "var(--color-mocha)" }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold" style={{ color: "var(--color-charcoal)" }}>{label}</p>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{sublabel}</p>
      </div>
      <ArrowRight size={15} className="shrink-0 transition-transform group-hover:translate-x-1" style={{ color: "var(--color-text-muted)" }} />
    </Link>
  );
}

export default function InventoryOverviewPage() {
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [pendingPOs, setPendingPOs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(silent = false) {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      const [statsData, posData] = await Promise.all([
        fetchInventoryStats(),
        fetchPurchaseOrders({ status: "ORDERED" }),
      ]);
      setStats(statsData);
      setPendingPOs(posData.total);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load inventory stats");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: "var(--font-serif)", color: "var(--color-charcoal)" }}>
            Inventory Overview
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Real-time stock health across all products
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost flex items-center gap-2"
          onClick={() => load(true)}
          disabled={refreshing}
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div
          className="rounded-lg border p-4 text-sm"
          style={{ background: "var(--color-error-bg)", borderColor: "var(--color-error)", color: "var(--color-error)" }}
        >
          {error}
        </div>
      )}

      {/* KPI Cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Products"
            value={stats.totalProducts}
            icon={<Package size={20} />}
            color="var(--color-mocha)"
            bg="var(--color-blush-light)"
            href="/dashboard/inventory/stock"
          />
          <StatCard
            label="In Stock"
            value={stats.inStock}
            icon={<CheckCircle2 size={20} />}
            color="var(--color-success)"
            bg="var(--color-success-bg)"
            badge={stats.totalProducts > 0 ? {
              label: `${Math.round((stats.inStock / stats.totalProducts) * 100)}% of total`,
              color: "badge-success",
            } : undefined}
          />
          <StatCard
            label="Low Stock"
            value={stats.lowStock}
            icon={<AlertTriangle size={20} />}
            color="#9A7320"
            bg="var(--color-warning-bg)"
            href="/dashboard/inventory/stock?status=LOW_STOCK"
            badge={stats.lowStock > 0 ? { label: "Needs attention", color: "badge-warning" } : undefined}
          />
          <StatCard
            label="Out of Stock"
            value={stats.outOfStock}
            icon={<TrendingDown size={20} />}
            color="var(--color-error)"
            bg="var(--color-error-bg)"
            href="/dashboard/inventory/stock?status=OUT_OF_STOCK"
            badge={stats.outOfStock > 0 ? { label: "Action required", color: "badge-error" } : undefined}
          />
        </div>
      ) : null}

      {/* Valuation + Pending POs */}
      {!loading && stats && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-2">
              <IndianRupee size={18} style={{ color: "var(--color-gold)" }} />
              <h3 className="text-base font-semibold" style={{ color: "var(--color-charcoal)" }}>
                Inventory Valuation
              </h3>
            </div>
            <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-charcoal)" }}>
              {formatPaise(stats.totalValueInPaise)}
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
              Based on purchase price × quantity available. Products without a purchase price are excluded.
            </p>
            <Link
              href="/dashboard/inventory/reports"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium"
              style={{ color: "var(--color-mocha)" }}
            >
              View full report <ArrowRight size={12} />
            </Link>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 mb-2">
              <Truck size={18} style={{ color: "var(--color-info)" }} />
              <h3 className="text-base font-semibold" style={{ color: "var(--color-charcoal)" }}>
                Pending Purchase Orders
              </h3>
            </div>
            <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-charcoal)" }}>
              {pendingPOs}
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
              Orders placed with suppliers awaiting delivery
            </p>
            <Link
              href="/dashboard/inventory/purchases?status=ORDERED"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium"
              style={{ color: "var(--color-mocha)" }}
            >
              View purchase orders <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
          Quick Actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink
            href="/dashboard/inventory/stock"
            icon={<Package size={16} />}
            label="Stock Ledger"
            sublabel="View & adjust stock levels"
          />
          <QuickLink
            href="/dashboard/inventory/purchases"
            icon={<ShoppingCart size={16} />}
            label="New Purchase Order"
            sublabel="Order stock from a supplier"
          />
          <QuickLink
            href="/dashboard/inventory/suppliers"
            icon={<Truck size={16} />}
            label="Suppliers"
            sublabel="Manage supplier directory"
          />
          <QuickLink
            href="/dashboard/inventory/warehouses"
            icon={<Warehouse size={16} />}
            label="Warehouses"
            sublabel="Manage storage locations"
          />
          <QuickLink
            href="/dashboard/inventory/reports"
            icon={<Package size={16} />}
            label="Reports"
            sublabel="Valuation & movement reports"
          />
        </div>
      </div>
    </div>
  );
}
