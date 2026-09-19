"use client";

import { FileText, Loader2, Eye, Info, Package, CreditCard, PhoneCall, Mail, MessageSquare, CheckCheck, Clock, AlertCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { adminFetch, adminFetchList } from "@/lib/admin-api-client";
import { useListQuery } from "@/lib/use-list-query";
import { useRepoList } from "@/lib/use-repo-list";
import { AdminDataTable, type Column } from "@/components/ui/AdminDataTable";
import { AdminModalForm } from "@/components/ui/AdminModalForm";
import { AdminConfirmDialog } from "@/components/ui/AdminConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { SelectInput, TextArea } from "@/components/ui/fields";
import { qs } from "@/lib/data/types";

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
  { value: "READY_TO_SHIP", label: "Ready to ship" },
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

type OrderItem = {
  id: string;
  title: string;
  sku?: string | null;
  quantity: number;
  unitPriceInPaise: number;
  lineTotalInPaise: number;
  personalizationSelected?: boolean;
  personalizationCostSnapshot?: number;
  personalizationValues?: unknown;
  fulfillmentStatus?: string | null;
};

type OrderRow = {
  id: string;
  orderCode: string;
  user?: { name?: string | null; email?: string | null } | null;
  customerName?: string | null;
  customerEmail?: string | null;
  kind?: string | null;
  registryCode?: string | null;
  packageTitle?: string | null;
  themeTitle?: string | null;
  status: string;
  paymentStatus?: string | null;
  hasPersonalization?: boolean;
  customizationFollowUpStatus?: string | null;
  placedAt?: string | null;
  totalInPaise: number;
  emailSendStatus?: string | null;
  emailSendError?: string | null;
  whatsappSendStatus?: string | null;
  whatsappSentAt?: string | null;
  whatsappDeliveredAt?: string | null;
  whatsappReadAt?: string | null;
  whatsappError?: string | null;
};

type Order = OrderRow & {
  contactPhone?: string | null;
  shippingAddress?: Record<string, string>;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  adminNotes?: string | null;
  items?: OrderItem[];
  subtotalInPaise: number;
  shippingWaived?: boolean;
  shippingInPaise?: number | null;
  gstInPaise: number;
  invoicePdfUrl?: string | null;
  whatsappMessageId?: string | null;
};

function errMessage(err: unknown): string | undefined {
  return err instanceof Error ? err.message : undefined;
}

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
  const listQuery = useMemo(
    () => {
      const { type, ...restFilters } = query.filters || {};
      const filters = { ...restFilters } as Record<string, string>;
      if (type === "shop") filters.shopOnly = "true";
      if (type === "package") filters.packageOnly = "true";
      if (type === "registry") filters.registryOnly = "true";
      return { ...query, filters };
    },
    [query],
  );
  const { items: rows, total, loading, error, reload } = useRepoList(
    (q) =>
      adminFetchList<OrderRow>(`/admin/orders${qs(q)}`, {
        page: q.page,
        pageSize: q.pageSize,
      }),
    listQuery,
  );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [savingOps, setSavingOps] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendingWhatsapp, setResendingWhatsapp] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [statusToConfirm, setStatusToConfirm] = useState<string | null>(null);

  const toast = useToast();

  async function openOrder(row: OrderRow) {
    setDrawerOpen(true);
    setLoadingOrder(true);
    setViewingOrder(null);
    try {
      const order = await adminFetch<Order>(`/admin/orders/${row.id}`);
      setViewingOrder(order);
      setAdminNotes(order.adminNotes ?? "");
    } catch (err) {
      toast({ title: "Failed to load order details", description: errMessage(err), tone: "error" });
      setDrawerOpen(false);
    } finally {
      setLoadingOrder(false);
    }
  }

  async function updateItemFulfillment(itemId: string, status: string) {
    if (!viewingOrder) return;
    setUpdatingItemId(itemId);
    try {
      const updatedOrder = await adminFetch<Order>(`/admin/orders/${viewingOrder.id}/items/${itemId}/fulfillment`, {
        method: "PATCH",
        body: { status: status || null },
      });
      setViewingOrder(updatedOrder);
      toast({ title: "Status updated", tone: "success" });
    } catch (err) {
      toast({ title: "Update failed", description: errMessage(err), tone: "error" });
    } finally {
      setUpdatingItemId(null);
    }
  }

  async function updateOrderStatus(status: string) {
    if (!viewingOrder) return;
    setSavingOps(true);
    try {
      const updated = await adminFetch<Order>(`/admin/orders/${viewingOrder.id}/status`, {
        method: "PATCH",
        body: { status },
      });
      setViewingOrder(updated);
      reload();
      toast({ title: "Order status updated", tone: "success" });
    } catch (err) {
      toast({ title: "Could not change status", description: errMessage(err), tone: "error" });
    } finally {
      setSavingOps(false);
    }
  }

  async function saveOps() {
    if (!viewingOrder) return;
    setSavingOps(true);
    try {
      const updated = await adminFetch<Order>(`/admin/orders/${viewingOrder.id}/ops`, {
        method: "PATCH",
        body: {
          customizationFollowUpStatus: viewingOrder.customizationFollowUpStatus,
          adminNotes,
        },
      });
      setViewingOrder(updated);
      reload();
      toast({ title: "Follow-up saved", tone: "success" });
    } catch (err) {
      toast({ title: "Save failed", description: errMessage(err), tone: "error" });
    } finally {
      setSavingOps(false);
    }
  }

  async function resendConfirmationEmail() {
    if (!viewingOrder) return;
    setResendingEmail(true);
    try {
      const updated = await adminFetch<Order>(`/admin/orders/${viewingOrder.id}/resend-confirmation`, {
        method: "POST",
      });
      setViewingOrder({ ...viewingOrder, emailSendStatus: updated.emailSendStatus || "PENDING", emailSendError: updated.emailSendError ?? null });
      toast({ title: "Email triggered successfully", tone: "success" });
    } catch (err) {
      toast({ title: "Failed to resend email", description: errMessage(err), tone: "error" });
    } finally {
      setResendingEmail(false);
    }
  }

  async function resendConfirmationWhatsapp() {
    if (!viewingOrder) return;
    setResendingWhatsapp(true);
    try {
      const outcome = await adminFetch<{ success: boolean; status: string; error?: string }>(
        `/admin/orders/${viewingOrder.id}/resend-whatsapp`,
        { method: "POST" }
      );
      setViewingOrder({
        ...viewingOrder,
        whatsappSendStatus: outcome.status || "SENT",
        whatsappError: outcome.error ?? null,
        whatsappSentAt: outcome.status !== "FAILED" ? new Date().toISOString() : viewingOrder.whatsappSentAt,
      });
      reload();
      toast({ title: "WhatsApp confirmation sent successfully", tone: "success" });
    } catch (err) {
      toast({ title: "Failed to send WhatsApp message", description: errMessage(err), tone: "error" });
    } finally {
      setResendingWhatsapp(false);
    }
  }

  const columns: Column<OrderRow>[] = [
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
      key: "package",
      header: "Order Items",
      cell: (row) => (
        <div className="flex flex-col items-start gap-1.5">
          {row.kind === "PACKAGE" ? (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-800 rounded font-semibold uppercase tracking-wider">Package</span>
          ) : row.registryCode ? (
            <span className="text-[10px] px-1.5 py-0.5 bg-rose-50 text-rose-800 rounded font-semibold uppercase tracking-wider">Registry</span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 rounded font-semibold uppercase tracking-wider">Shop</span>
          )}
          {row.packageTitle ? (
            <span className="text-xs text-(--color-text-secondary)">
              {row.themeTitle ? `${row.themeTitle} — ` : ""}
              {row.packageTitle}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <div className="flex flex-wrap gap-1.5 max-w-[200px]">
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-stone-100 rounded font-semibold uppercase tracking-wider" title="Order Status">
            <Package size={10} /> {row.status}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-stone-100 rounded font-semibold uppercase tracking-wider" title="Payment Status">
            <CreditCard size={10} /> {row.paymentStatus ?? "—"}
          </span>
          {(row.hasPersonalization || (row.customizationFollowUpStatus && row.customizationFollowUpStatus !== "NOT_REQUIRED")) && (
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-800 rounded font-semibold uppercase tracking-wider" title="Follow-up Status">
              <PhoneCall size={10} /> {String(row.customizationFollowUpStatus ?? "REQUIRED").replaceAll("_", " ")}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "comms",
      header: "Comms",
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          {/* Email badge */}
          <span
            title={row.emailSendStatus ? `Email: ${row.emailSendStatus}${row.emailSendError ? ` (${row.emailSendError})` : ""}` : "Email: Not sent"}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
              row.emailSendStatus === "SENT"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : row.emailSendStatus === "PENDING"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : row.emailSendStatus === "FAILED"
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : "bg-stone-50 text-stone-400 border border-stone-200"
            }`}
          >
            <Mail size={11} />
            <span className="hidden lg:inline">{row.emailSendStatus === "SENT" ? "Sent" : row.emailSendStatus === "FAILED" ? "Fail" : row.emailSendStatus ?? "—"}</span>
          </span>

          {/* WhatsApp badge */}
          <span
            title={row.whatsappSendStatus ? `WhatsApp: ${row.whatsappSendStatus}${row.whatsappError ? ` (${row.whatsappError})` : ""}` : "WhatsApp: Not sent"}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
              row.whatsappSendStatus === "READ"
                ? "bg-purple-50 text-purple-700 border border-purple-200"
                : row.whatsappSendStatus === "DELIVERED"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : row.whatsappSendStatus === "SENT" || row.whatsappSendStatus === "SIMULATED_SENT"
                    ? "bg-sky-50 text-sky-700 border border-sky-200"
                    : row.whatsappSendStatus === "PENDING" || row.whatsappSendStatus === "SENDING"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : row.whatsappSendStatus === "FAILED"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-stone-50 text-stone-400 border border-stone-200"
            }`}
          >
            <MessageSquare size={11} />
            <span className="hidden lg:inline">
              {row.whatsappSendStatus === "READ"
                ? "Read"
                : row.whatsappSendStatus === "DELIVERED"
                  ? "Delivered"
                  : row.whatsappSendStatus === "SENT" || row.whatsappSendStatus === "SIMULATED_SENT"
                    ? "Sent"
                    : row.whatsappSendStatus === "FAILED"
                      ? "Fail"
                      : row.whatsappSendStatus ?? "—"}
            </span>
          </span>
        </div>
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
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (row) => (
        <button
          type="button"
          onClick={() => openOrder(row)}
          className="btn btn-secondary px-3 py-1.5 text-xs font-semibold shadow-sm"
        >
          View
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Shop products, celebration packages, and gift registry purchases."
      />

      <div className="flex flex-wrap items-center gap-4 p-3 bg-stone-50 border border-stone-200 rounded-md text-xs text-stone-600">
        <span className="font-semibold text-stone-800 uppercase tracking-wider">Status Legend:</span>
        <span className="flex items-center gap-1.5"><Package size={14} className="text-stone-500" /> Order</span>
        <span className="flex items-center gap-1.5"><CreditCard size={14} className="text-stone-500" /> Payment</span>
        <span className="flex items-center gap-1.5"><PhoneCall size={14} className="text-stone-500" /> Follow-up</span>
        <span className="flex items-center gap-1.5"><Mail size={14} className="text-stone-500" /> Email</span>
        <span className="flex items-center gap-1.5"><MessageSquare size={14} className="text-stone-500" /> WhatsApp</span>
      </div>
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
          {
            key: "type",
            label: "Order type",
            type: "select",
            options: [
              { value: "shop", label: "Shop" },
              { value: "package", label: "Package" },
              { value: "registry", label: "Registry" },
            ],
          },
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
        rowActions={[]}
        empty={{
          icon: FileText,
          title: "No orders found",
          description: "Try adjusting your filters or search query.",
        }}
      />

      <AdminModalForm
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
        size="xl"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm bg-stone-50 rounded-md p-4">
              <div>
                <p className="text-stone-500 mb-1">Order status</p>
                <SelectInput
                  id="order-status"
                  value={viewingOrder.status}
                  onChange={(e) => setStatusToConfirm(e.target.value)}
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
              <div>
                <p className="text-stone-500 mb-1 flex items-center gap-1.5">
                  <Mail size={13} className="text-stone-400" />
                  <span>Email Status</span>
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                      viewingOrder.emailSendStatus === "SENT"
                        ? "bg-emerald-100 text-emerald-800"
                        : viewingOrder.emailSendStatus === "PENDING"
                          ? "bg-amber-100 text-amber-800"
                          : viewingOrder.emailSendStatus === "FAILED"
                            ? "bg-red-100 text-red-800"
                            : "bg-stone-200 text-stone-600"
                    }`}
                  >
                    {viewingOrder.emailSendStatus ?? "NOT_SENT"}
                  </span>
                </div>
                {viewingOrder.emailSendError && (
                  <p className="text-xs text-red-600 mt-1.5 break-all flex items-start gap-1">
                    <AlertCircle size={11} className="shrink-0 mt-0.5" />
                    <span>{viewingOrder.emailSendError}</span>
                  </p>
                )}
                {(viewingOrder.paymentStatus === "PAID" || viewingOrder.status === "PAID") && (
                  <button
                    type="button"
                    className="btn btn-secondary mt-2 px-2 py-1 text-xs flex items-center justify-center gap-1 w-full"
                    onClick={() => void resendConfirmationEmail()}
                    disabled={resendingEmail}
                  >
                    {resendingEmail ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail size={12} />}
                    Resend Email
                  </button>
                )}
              </div>
              <div>
                <p className="text-stone-500 mb-1 flex items-center gap-1.5">
                  <MessageSquare size={13} className="text-stone-400" />
                  <span>WhatsApp Delivery</span>
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                      viewingOrder.whatsappSendStatus === "READ"
                        ? "bg-purple-100 text-purple-800"
                        : viewingOrder.whatsappSendStatus === "DELIVERED"
                          ? "bg-emerald-100 text-emerald-800"
                          : viewingOrder.whatsappSendStatus === "SENT" || viewingOrder.whatsappSendStatus === "SIMULATED_SENT"
                            ? "bg-sky-100 text-sky-800"
                            : viewingOrder.whatsappSendStatus === "PENDING" || viewingOrder.whatsappSendStatus === "SENDING"
                              ? "bg-amber-100 text-amber-800"
                              : viewingOrder.whatsappSendStatus === "FAILED"
                                ? "bg-red-100 text-red-800"
                                : "bg-stone-200 text-stone-600"
                    }`}
                  >
                    {viewingOrder.whatsappSendStatus === "READ" && <CheckCheck size={12} />}
                    {viewingOrder.whatsappSendStatus ?? "NOT_SENT"}
                  </span>
                </div>

                {/* Timestamps */}
                <div className="text-[11px] text-stone-500 mt-1.5 space-y-0.5">
                  {viewingOrder.whatsappSentAt && (
                    <p className="flex items-center gap-1">
                      <Clock size={10} className="text-stone-400" />
                      <span>Sent: {new Date(viewingOrder.whatsappSentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </p>
                  )}
                  {viewingOrder.whatsappDeliveredAt && (
                    <p className="flex items-center gap-1 text-emerald-700">
                      <CheckCheck size={10} />
                      <span>Delivered: {new Date(viewingOrder.whatsappDeliveredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </p>
                  )}
                  {viewingOrder.whatsappReadAt && (
                    <p className="flex items-center gap-1 text-purple-700 font-medium">
                      <CheckCheck size={10} />
                      <span>Read: {new Date(viewingOrder.whatsappReadAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </p>
                  )}
                </div>

                {/* Error Banner */}
                {viewingOrder.whatsappError && (
                  <p className="text-xs text-red-600 mt-1.5 break-all flex items-start gap-1 bg-red-50 p-1.5 rounded border border-red-200">
                    <AlertCircle size={12} className="shrink-0 mt-0.5 text-red-500" />
                    <span>{viewingOrder.whatsappError}</span>
                  </p>
                )}

                {/* Resend WhatsApp button */}
                {(viewingOrder.paymentStatus === "PAID" || viewingOrder.status === "PAID") && (
                  <button
                    type="button"
                    className="btn btn-secondary mt-2 px-2 py-1 text-xs flex items-center justify-center gap-1 w-full text-emerald-800 hover:text-emerald-900 border-emerald-300 hover:border-emerald-400"
                    onClick={() => void resendConfirmationWhatsapp()}
                    disabled={resendingWhatsapp}
                  >
                    {resendingWhatsapp ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare size={12} />}
                    Resend WhatsApp
                  </button>
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
                {viewingOrder.items?.map((item) => (
                  <div key={item.id} className="border rounded-md p-4 bg-white shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-stone-500">SKU: {item.sku}</p>
                        <p className="text-sm mt-1">Qty: {item.quantity} × ₹{(item.unitPriceInPaise / 100).toFixed(2)}</p>
                        {item.personalizationSelected && (item.personalizationCostSnapshot ?? 0) > 0 && (
                          <p className="text-xs text-amber-800 mt-1">Personalization +₹{((item.personalizationCostSnapshot ?? 0) / 100).toFixed(2)} each</p>
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
              <div className="flex justify-between">
                <span className="text-stone-500">Shipping:</span>
                <span>
                  {viewingOrder.shippingWaived || (viewingOrder.shippingInPaise ?? 0) === 0
                    ? "FREE"
                    : `₹${((viewingOrder.shippingInPaise ?? 0) / 100).toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between"><span className="text-stone-500">GST:</span><span>₹{(viewingOrder.gstInPaise / 100).toFixed(2)}</span></div>
              <div className="flex justify-between font-medium text-base pt-2 border-t"><span>Total:</span><span>₹{(viewingOrder.totalInPaise / 100).toFixed(2)}</span></div>
              {viewingOrder.invoicePdfUrl && (
                <a href={viewingOrder.invoicePdfUrl} target="_blank" rel="noreferrer" className="inline-flex text-sm font-medium text-(--color-mocha) mt-2">
                  Download invoice
                </a>
              )}
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Email Notifications</h4>
              <div className="bg-stone-50 rounded-md p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-stone-500 mb-1">Confirmation Email</p>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded font-medium text-xs ${viewingOrder.emailSendStatus === 'FAILED' ? 'bg-red-100 text-red-800' : viewingOrder.emailSendStatus === 'SENT' ? 'bg-green-100 text-green-800' : 'bg-stone-200 text-stone-800'}`}>
                        {viewingOrder.emailSendStatus || "NOT SENT"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={resendConfirmationEmail}
                    disabled={resendingEmail}
                    className="btn btn-secondary px-3 py-1.5 text-xs font-semibold"
                  >
                    {resendingEmail ? <Loader2 size={14} className="animate-spin inline" /> : "Resend Email"}
                  </button>
                </div>
                {viewingOrder.emailSendError && (
                  <div className="mt-3 bg-red-50 border border-red-100 rounded text-red-800 p-2 text-xs">
                    <p className="font-semibold mb-1">Error sending email:</p>
                    <p className="font-mono break-all">{viewingOrder.emailSendError}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </AdminModalForm>
      <AdminConfirmDialog
        open={statusToConfirm !== null}
        title="Change Order Status"
        message={`Are you sure you want to change the order status to ${ORDER_STATUS_OPTIONS.find((o) => o.value === statusToConfirm)?.label}?`}
        onConfirm={async () => {
          if (statusToConfirm) {
            await updateOrderStatus(statusToConfirm);
            setStatusToConfirm(null);
          }
        }}
        onCancel={() => setStatusToConfirm(null)}
        confirmLabel="Yes, change status"
      />
    </div>
  );
}
