"use client";

import { FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { adminFetch } from "@/lib/admin-api-client";
import { ordersRepo } from "@/lib/data/resources";
import { useListQuery } from "@/lib/use-list-query";
import { useRepoList } from "@/lib/use-repo-list";
import { AdminDataTable, type Column } from "@/components/ui/AdminDataTable";
import { AdminDrawerForm } from "@/components/ui/AdminDrawerForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { SelectInput, TextArea } from "@/components/ui/fields";

const FULFILLMENT_OPTIONS = [
  { value: "UNFULFILLED", label: "Unfulfilled" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

const ORDER_STATUS_OPTIONS = [
  { value: "PENDING_PAYMENT", label: "Pending payment" },
  { value: "PAID", label: "Paid / confirmed" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REFUNDED", label: "Refunded" },
];

const FOLLOW_UP_OPTIONS = [
  { value: "NOT_REQUIRED", label: "Not required" },
  { value: "REQUIRED", label: "Follow-up required" },
  { value: "CONTACTED", label: "Customer contacted" },
  { value: "CONFIRMED", label: "Customization confirmed" },
  { value: "COMPLETED", label: "Completed" },
];

function formatPersonalization(values: unknown): Array<{ label: string; value: string }> {
  if (!values) return [];
  if (Array.isArray(values)) {
    return values.map((entry) => {
      if (entry && typeof entry === "object" && "label" in entry) {
        const row = entry as { label?: string; value?: string };
        return { label: String(row.label ?? ""), value: String(row.value ?? "") };
      }
      return { label: "Field", value: String(entry) };
    });
  }
  if (typeof values === "object") {
    return Object.entries(values as Record<string, unknown>).map(([k, v]) => ({ label: k, value: String(v) }));
  }
  return [{ label: "Details", value: String(values) }];
}

function shippingLines(address: Record<string, string> | undefined) {
  if (!address) return "—";
  return [address.fullName, address.line1 ?? address.street, address.line2, address.city, address.state, address.pincode ?? address.postalCode, address.country]
    .filter(Boolean)
    .join(", ");
}

export function OrdersScreen() {
  const { query, setQuery } = useListQuery({ sort: "placedAt", dir: "desc" });
  const { items: rows, total, loading, error, reload } = useRepoList(ordersRepo.list, query);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [savingOps, setSavingOps] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");

  const toast = useToast();

  async function openOrder(row: any) {
    setDrawerOpen(true);
    setLoadingOrder(true);
    setViewingOrder(null);
    try {
      const order = await adminFetch<any>(`/admin/orders/${row.id}`);
      setViewingOrder(order);
      setAdminNotes(order.adminNotes ?? "");
    } catch (err: any) {
      toast({ title: "Failed to load order details", description: err.message, tone: "error" });
      setDrawerOpen(false);
    } finally {
      setLoadingOrder(false);
    }
  }

  async function updateItemFulfillment(itemId: string, status: string) {
    if (!viewingOrder) return;
    setUpdatingItemId(itemId);
    try {
      const updatedOrder = await adminFetch<any>(`/admin/orders/${viewingOrder.id}/items/${itemId}/fulfillment`, {
        method: "PATCH",
        body: { status: status || null },
      });
      setViewingOrder(updatedOrder);
      toast({ title: "Status updated", tone: "success" });
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, tone: "error" });
    } finally {
      setUpdatingItemId(null);
    }
  }

  async function updateOrderStatus(status: string) {
    if (!viewingOrder) return;
    setSavingOps(true);
    try {
      const updated = await adminFetch<any>(`/admin/orders/${viewingOrder.id}/status`, {
        method: "PATCH",
        body: { status },
      });
      setViewingOrder(updated);
      reload();
      toast({ title: "Order status updated", tone: "success" });
    } catch (err: any) {
      toast({ title: "Could not change status", description: err.message, tone: "error" });
    } finally {
      setSavingOps(false);
    }
  }

  async function saveOps() {
    if (!viewingOrder) return;
    setSavingOps(true);
    try {
      const updated = await adminFetch<any>(`/admin/orders/${viewingOrder.id}/ops`, {
        method: "PATCH",
        body: {
          customizationFollowUpStatus: viewingOrder.customizationFollowUpStatus,
          adminNotes,
        },
      });
      setViewingOrder(updated);
      reload();
      toast({ title: "Follow-up saved", tone: "success" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, tone: "error" });
    } finally {
      setSavingOps(false);
    }
  }

  const columns: Column<any>[] = [
    { key: "orderCode", header: "Order Number", sortable: true, cell: (row) => row.orderCode },
    {
      key: "customer",
      header: "Customer",
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-(--color-charcoal)">{row.user?.name ?? row.customerName ?? "—"}</span>
          <span className="text-xs text-(--color-text-secondary)">{row.user?.email ?? row.customerEmail ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Order",
      cell: (row) => (
        <span className="text-xs px-2 py-1 bg-stone-100 rounded font-medium">{row.status}</span>
      ),
    },
    {
      key: "paymentStatus",
      header: "Payment",
      cell: (row) => (
        <span className="text-xs px-2 py-1 bg-stone-100 rounded font-medium">{row.paymentStatus ?? "—"}</span>
      ),
    },
    {
      key: "customizationFollowUpStatus",
      header: "Follow-up",
      hideBelow: "md",
      cell: (row) =>
        row.hasPersonalization || (row.customizationFollowUpStatus && row.customizationFollowUpStatus !== "NOT_REQUIRED") ? (
          <span className="text-xs px-2 py-1 bg-amber-50 text-amber-800 rounded font-medium">
            {String(row.customizationFollowUpStatus ?? "REQUIRED").replaceAll("_", " ")}
          </span>
        ) : (
          <span className="text-xs text-stone-400">—</span>
        ),
    },
    {
      key: "placedAt",
      header: "Date",
      sortable: true,
      cell: (row) => (
        <span className="text-sm text-(--color-text-secondary)">
          {row.placedAt ? new Date(row.placedAt).toLocaleString() : "—"}
        </span>
      ),
    },
    {
      key: "totalInPaise",
      header: "Amount",
      cell: (row) => (
        <span className="font-medium text-(--color-charcoal)">₹{(row.totalInPaise / 100).toFixed(2)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders CRM"
        description="Manage order lifecycle, payments, invoices, and personalization follow-up."
      />

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
        searchPlaceholder="Search order, email, Razorpay ID…"
        filters={[
          { key: "status", label: "Order status", type: "select", options: ORDER_STATUS_OPTIONS },
          {
            key: "paymentStatus",
            label: "Payment",
            type: "select",
            options: [
              { value: "PENDING", label: "Pending" },
              { value: "PAID", label: "Paid" },
              { value: "FAILED", label: "Failed" },
              { value: "CANCELLED", label: "Cancelled" },
              { value: "REFUNDED", label: "Refunded" },
            ],
          },
          {
            key: "followUp",
            label: "Customization",
            type: "select",
            options: [{ value: "REQUIRED_ANY", label: "Needs follow-up" }, ...FOLLOW_UP_OPTIONS],
          },
        ]}
        rowActions={[
          { id: "view", label: "View Details", onSelect: openOrder },
        ]}
        empty={{
          icon: FileText,
          title: "No orders found",
          description: "Wait for customers to place orders.",
        }}
      />

      <AdminDrawerForm
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={viewingOrder ? `Order ${viewingOrder.orderCode}` : "Loading..."}
        onSubmit={(e) => {
          e.preventDefault();
          setDrawerOpen(false);
        }}
        submitting={false}
        error={null}
        dirty={false}
        submitLabel="Close"
      >
        {loadingOrder ? (
          <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-stone-400" /></div>
        ) : viewingOrder ? (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-stone-500 mb-1">Customer</p>
                <p className="font-medium">{viewingOrder.user?.name}</p>
                <p className="text-stone-600">{viewingOrder.user?.email}</p>
                <p className="text-stone-600">{viewingOrder.contactPhone}</p>
              </div>
              <div>
                <p className="text-stone-500 mb-1">Shipping Address</p>
                <p className="whitespace-pre-wrap">{shippingLines(viewingOrder.shippingAddress)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm bg-stone-50 rounded-md p-4">
              <div>
                <p className="text-stone-500 mb-1">Order status</p>
                <SelectInput
                  id="order-status"
                  value={viewingOrder.status}
                  onChange={(e) => updateOrderStatus(e.target.value)}
                  options={ORDER_STATUS_OPTIONS}
                  disabled={savingOps}
                />
              </div>
              <div>
                <p className="text-stone-500 mb-1">Payment</p>
                <p className="font-medium">{viewingOrder.paymentStatus}</p>
                {viewingOrder.razorpayOrderId && (
                  <p className="text-xs font-mono text-stone-500 mt-1 break-all">Rzp order: {viewingOrder.razorpayOrderId}</p>
                )}
                {viewingOrder.razorpayPaymentId && (
                  <p className="text-xs font-mono text-stone-500 break-all">Rzp payment: {viewingOrder.razorpayPaymentId}</p>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium border-b pb-2 mb-4">Customization follow-up</h4>
              <SelectInput
                id="follow-up"
                value={viewingOrder.customizationFollowUpStatus ?? "NOT_REQUIRED"}
                onChange={(e) => setViewingOrder({ ...viewingOrder, customizationFollowUpStatus: e.target.value })}
                options={FOLLOW_UP_OPTIONS}
              />
              <div className="mt-3">
                <p className="text-sm text-stone-600 mb-1">Internal notes</p>
                <TextArea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
              </div>
              <button type="button" className="btn btn-primary mt-3 px-3 py-1.5 text-sm" onClick={() => void saveOps()} disabled={savingOps}>
                {savingOps ? "Saving…" : "Save follow-up"}
              </button>
            </div>

            <div>
              <h4 className="font-medium border-b pb-2 mb-4">Order Items</h4>
              <div className="space-y-4">
                {viewingOrder.items?.map((item: any) => (
                  <div key={item.id} className="border rounded-md p-4 bg-white shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-stone-500">SKU: {item.sku}</p>
                        <p className="text-sm mt-1">Qty: {item.quantity} × ₹{(item.unitPriceInPaise / 100).toFixed(2)}</p>
                        {item.personalizationSelected && item.personalizationCostSnapshot > 0 && (
                          <p className="text-xs text-amber-800 mt-1">Personalization +₹{(item.personalizationCostSnapshot / 100).toFixed(2)} each</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{(item.lineTotalInPaise / 100).toFixed(2)}</p>
                      </div>
                    </div>

                    {item.personalizationSelected && (
                      <div className="bg-stone-50 p-3 rounded text-sm mt-2">
                        <p className="font-medium mb-1 text-xs uppercase tracking-wider text-stone-500">Personalization Data</p>
                        {formatPersonalization(item.personalizationValues).map((row) => (
                          <div key={row.label} className="flex gap-2">
                            <span className="font-medium text-stone-600 capitalize">{row.label}:</span>
                            <span className="text-stone-900">{row.value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 border-t flex items-center justify-between">
                      <span className="text-sm font-medium text-stone-700">Fulfillment Status</span>
                      <div className="w-48 relative">
                        {updatingItemId === item.id && (
                          <div className="absolute inset-y-0 right-8 flex items-center pointer-events-none">
                            <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
                          </div>
                        )}
                        <SelectInput
                          id={`status-${item.id}`}
                          value={item.fulfillmentStatus || "UNFULFILLED"}
                          onChange={(e) => updateItemFulfillment(item.id, e.target.value)}
                          options={FULFILLMENT_OPTIONS}
                          disabled={updatingItemId === item.id}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4 text-sm space-y-2 text-right">
              <div className="flex justify-between"><span className="text-stone-500">Subtotal:</span><span>₹{(viewingOrder.subtotalInPaise / 100).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">GST:</span><span>₹{(viewingOrder.gstInPaise / 100).toFixed(2)}</span></div>
              <div className="flex justify-between font-medium text-base pt-2 border-t"><span>Total:</span><span>₹{(viewingOrder.totalInPaise / 100).toFixed(2)}</span></div>
              {viewingOrder.invoicePdfUrl && (
                <a href={viewingOrder.invoicePdfUrl} target="_blank" rel="noreferrer" className="inline-flex text-sm font-medium text-(--color-mocha) mt-2">
                  Download invoice
                </a>
              )}
            </div>
          </div>
        ) : null}
      </AdminDrawerForm>
    </div>
  );
}
