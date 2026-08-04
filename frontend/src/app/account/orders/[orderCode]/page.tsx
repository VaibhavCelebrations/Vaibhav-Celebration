"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Loader2, Package, Download, MapPin } from "lucide-react";
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
};

interface Props {
  params: Promise<{ orderCode: string }>;
}

export default function OrderDetailPage({ params }: Props) {
  const { orderCode } = use(params);
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await shopApi.getMyOrder(orderCode);
        if (!cancelled) setOrder(data);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderCode]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={28} className="animate-spin text-mocha" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="text-center py-20">
        <h2 className="font-display text-xl font-bold text-charcoal mb-4">Order not found</h2>
        <Link href="/account/orders" className="btn-primary px-8 py-3 text-sm">Back to Orders</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/account/orders" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-mocha font-semibold">
        <ArrowLeft size={14} /> Back to Orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal font-mono">{order.orderCode}</h1>
          <p className="text-text-muted text-sm mt-1">Placed on {new Date(order.placedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full ${STATUS_STYLES[order.status]}`}>
          {order.status.replace("_", " ")}
        </span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface rounded-2xl border border-border-light p-6 shadow-soft">
            <h3 className="font-display text-lg font-bold text-charcoal mb-4">Items</h3>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4 items-center">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-cream">
                    {item.image ? (
                      <Image src={item.image.url} alt={item.title} fill className="object-cover" sizes="64px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package size={20} className="text-text-light" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/gifts/${item.slug}`} className="font-semibold text-charcoal hover:text-mocha text-sm line-clamp-1">{item.title}</Link>
                    <p className="text-xs text-text-muted mt-0.5">Qty: {item.quantity} × {formatPaise(item.unitPriceInPaise)}</p>
                  </div>
                  <div className="font-bold text-charcoal text-sm shrink-0">{formatPaise(item.lineTotalInPaise)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-border-light p-6 shadow-soft">
            <h3 className="font-display text-lg font-bold text-charcoal mb-4 flex items-center gap-2"><MapPin size={18} className="text-mocha" /> Shipping Address</h3>
            <p className="text-sm text-charcoal font-semibold">{order.shippingAddress.fullName}</p>
            <p className="text-sm text-text-muted mt-1">
              {order.shippingAddress.line1}{order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}<br />
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}<br />
              {order.shippingAddress.country}
            </p>
            <p className="text-xs text-text-light mt-3">Contact: {order.contactEmail} · {order.contactPhone}</p>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border-light p-6 shadow-soft h-fit">
          <h3 className="font-display text-lg font-bold text-charcoal mb-4">Payment Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-text-muted"><span>Subtotal</span><span className="font-semibold text-charcoal">{formatPaise(order.subtotalInPaise)}</span></div>
            <div className="flex justify-between text-text-muted"><span>GST</span><span className="font-semibold text-charcoal">{formatPaise(order.gstInPaise)}</span></div>
            <hr className="border-border-light" />
            <div className="flex justify-between text-lg font-bold text-charcoal"><span>Total</span><span className="font-display">{formatPaise(order.totalInPaise)}</span></div>
          </div>
          {order.invoicePdfUrl && (
            <a href={order.invoicePdfUrl} target="_blank" rel="noreferrer" className="btn-outline w-full mt-6 py-3 text-sm font-semibold gap-2 flex items-center justify-center">
              <Download size={16} /> Download Invoice
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
