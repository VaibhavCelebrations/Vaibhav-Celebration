"use client";

import { Download, Mail } from "lucide-react";
import { ResourceScreen } from "@/components/ResourceScreen";
import { invoicesRepo } from "@/lib/data/resources";
import { adminFetch } from "@/lib/admin-api-client";
import { useToast } from "@/components/ui/Toast";

export default function InvoicesPage() {
  const toast = useToast();

  return (
    <ResourceScreen
      title="Invoices"
      noun="Invoice"
      description="Review issued invoices, download PDFs, and resend to customers."
      repo={invoicesRepo}
      fields={["name"]}
      allowCreate={false}
      allowEdit={false}
      allowArchive={false}
      extraRowActions={[
        {
          id: "download",
          label: "Download PDF",
          icon: Download,
          hidden: (row) => !row.pdfUrl,
          onSelect: (row) => {
            if (typeof row.pdfUrl === "string") window.open(row.pdfUrl, "_blank", "noopener,noreferrer");
          },
        },
        {
          id: "resend",
          label: "Resend",
          icon: Mail,
          onSelect: async (row) => {
            try {
              await adminFetch(`/admin/invoices/${row.id}/resend`, { method: "POST" });
              toast({ title: "Invoice resent", tone: "success" });
            } catch (err: unknown) {
              toast({ title: "Resend failed", description: err instanceof Error ? err.message : undefined, tone: "error" });
            }
          },
        },
      ]}
      extraColumns={[
        {
          key: "invoiceNumber",
          header: "Invoice",
          cell: (row) => <span className="font-mono text-xs">{String(row.invoiceNumber ?? row.name ?? "—")}</span>,
        },
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
