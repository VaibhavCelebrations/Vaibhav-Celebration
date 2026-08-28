"use client";

import { useCallback, useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Package, Check, Truck, Ban } from "lucide-react";
import {
  fetchPurchaseOrder,
  updatePurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
  type PurchaseOrder,
  type PurchaseOrderStatus,
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

export default function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  
  const [isReceiving, setIsReceiving] = useState(false);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});

  const loadPo = useCallback(async () => {
    try {
      const data = await fetchPurchaseOrder(id);
      setPo(data);
      // Initialize receive quantities with the remaining un-received amounts
      const initialQtys: Record<string, number> = {};
      data.items.forEach(item => {
        initialQtys[item.id] = Math.max(0, item.quantity - item.receivedQuantity);
      });
      setReceiveQuantities(initialQtys);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load purchase order");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadPo();
  }, [loadPo]);

  const handleMarkOrdered = async () => {
    if (!confirm("Are you sure you want to mark this draft as ordered?")) return;
    setActionLoading(true);
    try {
      await updatePurchaseOrder(id, { status: "ORDERED" });
      await loadPo();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this purchase order? This cannot be undone.")) return;
    setActionLoading(true);
    try {
      await cancelPurchaseOrder(id);
      await loadPo();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to cancel order");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReceiveItems = async () => {
    const itemsToReceive = po?.items
      .map(item => ({
        itemId: item.id,
        receivedQuantity: receiveQuantities[item.id] || 0
      }))
      .filter(item => item.receivedQuantity > 0);

    if (!itemsToReceive || itemsToReceive.length === 0) {
      alert("No quantities entered to receive.");
      return;
    }

    if (!confirm("Are you sure you want to receive these items into inventory?")) return;
    
    setActionLoading(true);
    try {
      await receivePurchaseOrder(id, itemsToReceive);
      setIsReceiving(false);
      await loadPo();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to receive items");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center" style={{ color: "var(--color-text-muted)" }}>Loading purchase order...</div>;
  }

  if (error || !po) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="text-red-500">{error || "Purchase order not found"}</div>
        <Link href="/dashboard/inventory/purchases" className="btn btn-primary inline-block">Back to Purchases</Link>
      </div>
    );
  }

  const isEditable = po.status === "DRAFT" || po.status === "ORDERED" || po.status === "PARTIALLY_RECEIVED";
  const canReceive = po.status === "ORDERED" || po.status === "PARTIALLY_RECEIVED";

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-6" style={{ borderColor: "var(--color-border-soft)" }}>
        <div className="flex items-start gap-4">
          <Link href="/dashboard/inventory/purchases" className="btn btn-ghost p-2 rounded-full mt-1 border border-gray-200 shadow-sm hover:bg-gray-50">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl" style={{ fontFamily: "var(--font-serif)", color: "var(--color-charcoal)" }}>
                {po.poNumber}
              </h1>
              <span className={`badge ${STATUS_BADGE[po.status]} text-xs font-medium`}>{STATUS_LABELS[po.status]}</span>
            </div>
            <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
              Created {formatDate(po.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-1">
          {po.status === "DRAFT" && (
            <button 
              onClick={handleMarkOrdered} 
              disabled={actionLoading}
              className="btn btn-primary flex items-center gap-2 shadow-sm"
            >
              <Check size={16} /> Mark as Ordered
            </button>
          )}

          {canReceive && !isReceiving && (
            <button 
              onClick={() => setIsReceiving(true)}
              disabled={actionLoading}
              className="btn btn-primary flex items-center gap-2 shadow-sm"
            >
              <Package size={16} /> Receive Items
            </button>
          )}

          {isEditable && (
            <button 
              onClick={handleCancel}
              disabled={actionLoading || isReceiving}
              className="btn bg-white border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 flex items-center gap-2 shadow-sm"
            >
              <Ban size={16} /> Cancel Order
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="card bg-white shadow-sm border" style={{ borderColor: "var(--color-border-soft)" }}>
            <div className="p-5 border-b flex justify-between items-center bg-gray-50/50 rounded-t-xl" style={{ borderColor: "var(--color-border-soft)" }}>
              <h2 className="font-semibold text-lg" style={{ color: "var(--color-charcoal)" }}>Line Items</h2>
              {isReceiving && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsReceiving(false)} className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50">
                    Cancel
                  </button>
                  <button onClick={handleReceiveItems} disabled={actionLoading} className="btn btn-primary btn-sm flex items-center gap-1">
                    <Check size={14} /> Submit Receipt
                  </button>
                </div>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b bg-gray-50/30" style={{ borderColor: "var(--color-border-soft)", color: "var(--color-text-muted)" }}>
                    <th className="py-4 px-5 font-medium">Product</th>
                    <th className="py-4 px-5 font-medium">Unit Price</th>
                    <th className="py-4 px-5 font-medium text-center">Ordered</th>
                    <th className="py-4 px-5 font-medium text-center">Received</th>
                    <th className="py-4 px-5 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "var(--color-border-soft)" }}>
                  {po.items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-medium" style={{ color: "var(--color-charcoal)" }}>{item.Product.title}</div>
                        {item.Product.sku && <div className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>SKU: {item.Product.sku}</div>}
                      </td>
                      <td className="py-4 px-5" style={{ color: "var(--color-charcoal)" }}>
                        ₹{(item.unitPriceInPaise / 100).toFixed(2)}
                      </td>
                      <td className="py-4 px-5 text-center font-medium" style={{ color: "var(--color-charcoal)" }}>
                        {item.quantity}
                      </td>
                      <td className="py-4 px-5 text-center">
                        {isReceiving ? (
                          <div className="flex flex-col items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max={item.quantity - item.receivedQuantity}
                              className="input input-bordered text-center w-24 py-1.5 focus:ring-2 focus:ring-primary/20"
                              value={receiveQuantities[item.id] ?? 0}
                              onChange={(e) => setReceiveQuantities(prev => ({
                                ...prev,
                                [item.id]: parseInt(e.target.value) || 0
                              }))}
                              disabled={item.receivedQuantity >= item.quantity}
                            />
                            <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                              Prev: {item.receivedQuantity}
                            </span>
                          </div>
                        ) : (
                          <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold ${item.receivedQuantity >= item.quantity ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                            {item.receivedQuantity} / {item.quantity}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-right font-medium" style={{ color: "var(--color-charcoal)" }}>
                        ₹{((item.quantity * item.unitPriceInPaise) / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-gray-50/80" style={{ borderColor: "var(--color-border-soft)" }}>
                    <td colSpan={4} className="py-5 px-5 text-right font-medium" style={{ color: "var(--color-text-secondary)" }}>
                      Total Amount
                    </td>
                    <td className="py-5 px-5 text-right font-bold text-lg" style={{ color: "var(--color-charcoal)" }}>
                      ₹{(po.totalInPaise / 100).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card bg-white shadow-sm border p-5 space-y-4" style={{ borderColor: "var(--color-border-soft)" }}>
            <h2 className="font-semibold text-lg flex items-center gap-2" style={{ color: "var(--color-charcoal)" }}>
              Supplier Details
            </h2>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="font-medium" style={{ color: "var(--color-charcoal)" }}>{po.Supplier.name}</div>
              <Link href={`/dashboard/inventory/suppliers`} className="text-sm text-blue-600 hover:text-blue-800 hover:underline mt-1 inline-block">
                View Supplier Profile &rarr;
              </Link>
            </div>
          </div>

          <div className="card bg-white shadow-sm border p-5 space-y-4" style={{ borderColor: "var(--color-border-soft)" }}>
            <h2 className="font-semibold text-lg flex items-center gap-2" style={{ color: "var(--color-charcoal)" }}>
              Order Info
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <Truck size={16} />
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Expected Delivery</div>
                  <div className="text-sm font-medium mt-1" style={{ color: "var(--color-charcoal)" }}>
                    {po.expectedAt ? formatDate(po.expectedAt) : "Not specified"}
                  </div>
                </div>
              </div>

              {po.receivedAt && (
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-50 rounded-lg text-green-600">
                    <Check size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Fully Received On</div>
                    <div className="text-sm font-medium mt-1" style={{ color: "var(--color-charcoal)" }}>
                      {formatDate(po.receivedAt)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {po.notes && (
            <div className="card bg-white shadow-sm border p-5 space-y-3" style={{ borderColor: "var(--color-border-soft)" }}>
              <h2 className="font-semibold text-lg" style={{ color: "var(--color-charcoal)" }}>Notes</h2>
              <div className="p-4 bg-yellow-50/50 rounded-lg border border-yellow-100 text-sm whitespace-pre-wrap text-yellow-900">
                {po.notes}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
