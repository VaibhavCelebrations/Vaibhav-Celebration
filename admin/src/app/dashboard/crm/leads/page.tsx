"use client";

import { ResourceScreen } from "@/components/ResourceScreen";
import { leadsRepo } from "@/lib/data/resources";


export default function LeadsPage() {
  return (
    <ResourceScreen
      title="Leads"
      noun="Lead"
      description="Qualify and progress every incoming customer enquiry."
      repo={leadsRepo}
      fields={["status"]}
      allowCreate={false}
      allowArchive={false}
      statusOptions={[
        { value: "NEW", label: "New" },
        { value: "CONTACTED", label: "Contacted" },
        { value: "QUALIFIED", label: "Qualified" },
        { value: "CONVERTED", label: "Converted" },
        { value: "CLOSED_LOST", label: "Closed lost" },
      ]}
      extraColumns={[
        {
          key: "source",
          header: "Source",
          hideBelow: "md",
          cell: (row) => (
            <span className="text-xs uppercase tracking-wide text-(--color-text-muted)">
              {String(row.source ?? "—").replaceAll("_", " ")}
            </span>
          ),
        },
        {
          key: "message",
          header: "Message",
          hideBelow: "lg",
          cell: (row) => (
            <span className="line-clamp-2 text-sm text-(--color-text-secondary)">
              {String(row.message ?? row.interestArea ?? "—")}
            </span>
          ),
        },
      ]}
    />
  );
}
