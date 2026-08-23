"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Package, ChevronRight, FileText } from "lucide-react";
import * as shopApi from "@/lib/shop-api";
import { formatPaise } from "@/lib/shop-types";
import type { OrderDto, OrderStatus } from "@/lib/shop-types";

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-amber-50 text-amber-700",
  PAID: "bg-green-50 text-green-700",
  PROCESSING: "bg-blue-50 text-blue-700",
  SHIPPED: "bg-purple-50 text-purple-700",
  DELIVERED: "bg-sage/20 text-sage-dark",
  CANCELLED: "bg-red-50 text-red-600",
  REFUNDED: "bg-stone-100 text-stone-600",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Payment Pending",
  PAID: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const result = await shopApi.listMyOrders(page, pageSize);
        if (!cancelled) {
          setOrders(result.items || []);
          setTotal(result.total || 0);
        }
      } catch (err) {
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-charcoal">Order History</h1>
        <p className="text-text-muted text-sm mt-1">Track and review your past purchases.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-mocha" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-surface rounded-2xl border border-dashed border-border-light">
          <Package size={40} className="mx-auto text-text-light mb-4" />
          <h3 className="font-display text-xl font-semibold text-charcoal mb-2">No orders yet</h3>
          <p className="text-text-muted text-sm mb-6">Your order history will show up here once you place an order.</p>
          <Link href="/gifts" className="btn-primary px-8 py-3 text-sm">Browse Gifts</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.orderCode}`}
              className="flex items-center gap-4 bg-surface rounded-2xl border border-border-light p-5 shadow-soft hover:shadow-md transition-shadow"
            >
              <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-cream">
                {order.items[0]?.image ? (
                  <Image src={order.items[0].image.url} alt={order.items[0].title} fill className="object-cover" sizes="64px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Package size={24} className="text-text-light" /></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-mono text-sm font-bold text-charcoal">{order.orderCode}</p>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${STATUS_STYLES[order.status]}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                  {order.canRetryPayment && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                      Complete payment
                    </span>
                  )}
                  {order.giftRegistry?.eligible && !order.giftRegistry.registryId && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-mocha/10 text-mocha">
                      Set up Gift Registry
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-1">
                  {order.package
                    ? `${order.package.themeTitle} · ${order.package.title}`
                    : `${order.items?.length || 0} item${(order.items?.length || 0) !== 1 ? "s" : ""}`}
                  {" · Placed "}
                  {new Date(order.placedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-charcoal">{formatPaise(order.totalInPaise)}</p>
                {order.invoicePdfUrl && (
                  <span className="text-[10px] text-mocha flex items-center gap-1 justify-end mt-1"><FileText size={10} /> Invoice</span>
                )}
              </div>
              <ChevronRight size={18} className="text-text-light shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {total > pageSize && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-4 py-2 rounded-lg border border-border-light text-sm font-medium disabled:opacity-40">
            Previous
          </button>
          <span className="text-sm text-text-muted">Page {page} of {Math.ceil(total / pageSize)}</span>
          <button disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage((p) => p + 1)} className="px-4 py-2 rounded-lg border border-border-light text-sm font-medium disabled:opacity-40">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
