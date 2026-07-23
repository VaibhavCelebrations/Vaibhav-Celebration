"use client";

import { ResourceScreen } from "@/components/ResourceScreen";
import { invoicesRepo } from "@/lib/data/resources";

export default function InvoicesPage() {
  return (
    <ResourceScreen
      title="Invoices"
      noun="Invoice"
      description="Review issued invoices and their delivery status."
      repo={invoicesRepo}
      fields={["name"]}
      allowCreate={false}
      extraColumns={[
        {
          key: "customerName",
          header: "Customer",
          cell: (row) => {
            const customer = row.customer as { fullName?: string; email?: string; phone?: string } | undefined;
            return (
              <div className="flex flex-col">
                <span className="font-medium text-(--color-charcoal)">{customer?.fullName ?? "—"}</span>
              </div>
            );
          },
        },
        {
          key: "contact",
          header: "Contact",
          hideBelow: "md",
          cell: (row) => {
            const customer = row.customer as { fullName?: string; email?: string; phone?: string } | undefined;
            return (
              <div className="flex flex-col text-xs text-(--color-text-secondary)">
                <span>{customer?.email ?? "—"}</span>
                <span>{customer?.phone ?? "—"}</span>
              </div>
            );
          },
        },
        {
          key: "issuedAt",
          header: "Date",
          hideBelow: "md",
          cell: (row) => (
            <span className="text-sm text-(--color-text-secondary)">
              {row.issuedAt ? new Date(row.issuedAt as string).toLocaleDateString() : "—"}
            </span>
          ),
        },
        {
          key: "total",
          header: "Amount",
          cell: (row) => (
            <span className="text-sm font-medium text-(--color-charcoal)">
              ₹{((row.totalInPaise as number) / 100).toFixed(2)}
            </span>
          ),
        },
      ]}
    />
  );
}

