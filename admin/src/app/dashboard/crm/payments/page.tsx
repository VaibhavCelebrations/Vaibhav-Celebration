"use client";

import { CreditCard } from "lucide-react";
import { adminFetchList } from "@/lib/admin-api-client";
import { qs } from "@/lib/data/types";
import { useListQuery } from "@/lib/use-list-query";
import { useRepoList } from "@/lib/use-repo-list";
import { AdminDataTable, type Column } from "@/components/ui/AdminDataTable";
import { PageHeader } from "@/components/ui/PageHeader";

type PaymentEventRow = {
  id: string;
  eventKey: string;
  eventType: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  processedAt: string;
};

const columns: Column<PaymentEventRow>[] = [
  {
    key: "eventType",
    header: "Event",
    cell: (row) => <span className="font-medium">{row.eventType}</span>,
  },
  {
    key: "razorpayOrderId",
    header: "Razorpay Order",
    cell: (row) => <span className="font-mono text-xs">{row.razorpayOrderId ?? "—"}</span>,
  },
  {
    key: "razorpayPaymentId",
    header: "Razorpay Payment",
    cell: (row) => <span className="font-mono text-xs">{row.razorpayPaymentId ?? "—"}</span>,
  },
  {
    key: "processedAt",
    header: "Processed",
    cell: (row) => (
      <span className="text-sm text-(--color-text-secondary)">
        {row.processedAt ? new Date(row.processedAt).toLocaleString() : "—"}
      </span>
    ),
  },
];

export default function PaymentsPage() {
  const { query, setQuery } = useListQuery({ sort: "processedAt", dir: "desc" });
  const { items, total, loading, error, reload } = useRepoList<PaymentEventRow>(
    (q) => adminFetchList(`/admin/payments${qs(q)}`, { page: q.page, pageSize: q.pageSize }),
    query,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment events"
        description="Idempotent Razorpay webhook and checkout-verify events. Search by Razorpay order ID or payment ID."
      />
      <AdminDataTable
        columns={columns}
        rows={items}
        rowKey={(r) => r.id}
        total={total}
        query={query}
        onQueryChange={setQuery}
        loading={loading}
        error={error}
        onRetry={reload}
        searchPlaceholder="Search Razorpay order / payment ID…"
        empty={{
          icon: CreditCard,
          title: "No payment events yet",
          description: "Events appear here after checkout verification or Razorpay webhooks.",
        }}
      />
    </div>
  );
}
