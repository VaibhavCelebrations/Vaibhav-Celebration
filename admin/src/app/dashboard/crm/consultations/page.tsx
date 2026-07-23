"use client";

import { ResourceScreen } from "@/components/ResourceScreen";
import { consultationsRepo } from "@/lib/data/resources";

export default function ConsultationsPage() {
  return (
    <ResourceScreen
      title="Consultations"
      noun="Consultation"
      description="Review requests and schedule celebration consultations."
      repo={consultationsRepo}
      fields={["name", "description", "status"]}
      allowCreate={false}
      statusOptions={[
        { value: "PENDING", label: "Pending" },
        { value: "REVIEWED", label: "Reviewed" },
        { value: "SCHEDULED", label: "Scheduled" },
        { value: "COMPLETED", label: "Completed" },
        { value: "DECLINED", label: "Declined" },
      ]}
      extraColumns={[
        {
          key: "contact",
          header: "Contact",
          hideBelow: "md",
          cell: (row) => (
            <div className="flex flex-col text-xs text-(--color-text-secondary)">
              <span>{(row.email as string) ?? "—"}</span>
              <span>{(row.phone as string) ?? "—"}</span>
            </div>
          ),
        },
        {
          key: "eventDate",
          header: "Event Date",
          hideBelow: "md",
          cell: (row) => (
            <span className="text-sm font-medium text-(--color-charcoal)">
              {row.eventDate ? new Date(row.eventDate as string).toLocaleDateString() : "—"}
            </span>
          ),
        },
      ]}
    />
  );
}

