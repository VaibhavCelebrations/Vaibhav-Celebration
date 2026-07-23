"use client";

import { ResourceScreen } from "@/components/ResourceScreen";
import { bookingsRepo } from "@/lib/data/resources";

export default function BookingsPage() {
  return (
    <ResourceScreen
      title="Bookings"
      noun="Booking"
      description="Track celebration bookings from scheduling through completion."
      repo={bookingsRepo}
      fields={["status"]}
      allowCreate={false}
      allowArchive={false}
      statusOptions={[
        { value: "SCHEDULED", label: "Scheduled" },
        { value: "CONFIRMED", label: "Confirmed" },
        { value: "IN_PROGRESS", label: "In progress" },
        { value: "COMPLETED", label: "Completed" },
        { value: "CANCELLED", label: "Cancelled" },
      ]}
      extraColumns={[
        {
          key: "customer",
          header: "Customer",
          cell: (row) => {
            const customer = row.customer as { fullName?: string; phone?: string } | undefined;
            return (
              <div className="flex flex-col text-sm">
                <span className="font-medium text-(--color-charcoal)">{customer?.fullName ?? "—"}</span>
                <span className="text-xs text-(--color-text-secondary)">{customer?.phone ?? "—"}</span>
              </div>
            );
          },
        },
        {
          key: "eventDate",
          header: "Event date",
          cell: (row) => (
            <span className="text-sm whitespace-nowrap">
              {row.eventDate ? String(row.eventDate).slice(0, 10) : "—"}
            </span>
          ),
        },
        {
          key: "package",
          header: "Package",
          hideBelow: "md",
          cell: (row) => {
            const pkg = row.package as { title?: string } | undefined;
            return <span className="text-sm">{pkg?.title ?? "—"}</span>;
          },
        },
      ]}
    />
  );
}
