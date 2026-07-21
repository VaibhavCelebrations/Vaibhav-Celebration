"use client";

import { ResourceScreen } from "@/components/ResourceScreen";
import { customersRepo } from "@/lib/data/resources";


export default function CustomersPage() {
  return (
    <ResourceScreen
      title="Customers"
      noun="Customer"
      description="Review customer records and their celebration history."
      repo={customersRepo}
      fields={["name"]}
      allowCreate={false}
      allowEdit={false}
      allowArchive={false}
      extraColumns={[
        {
          key: "email",
          header: "Email",
          hideBelow: "md",
          cell: (row) => <span className="text-sm">{String(row.email ?? "—")}</span>,
        },
        {
          key: "phone",
          header: "Phone",
          cell: (row) => <span className="text-sm">{String(row.phone ?? "—")}</span>,
        },
      ]}
    />
  );
}
