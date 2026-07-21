"use client";

import { ResourceScreen } from "@/components/ResourceScreen";
import { auditLogRepo } from "@/lib/data/resources";

export default function AuditPage() {
  return (
    <ResourceScreen
      title="Audit Log"
      noun="Audit entry"
      description="Review administrative actions across the platform."
      repo={auditLogRepo}
      fields={[]}
      allowCreate={false}
      allowEdit={false}
      allowArchive={false}
      extraColumns={[
        {
          key: "action",
          header: "Action",
          cell: (row) => <span className="font-medium">{String(row.action ?? "—")}</span>,
        },
        {
          key: "entityType",
          header: "Entity",
          cell: (row) => (
            <span className="font-mono text-xs">
              {String(row.entityType ?? "—")}
              {row.entityId ? ` · ${String(row.entityId).slice(0, 8)}` : ""}
            </span>
          ),
        },
        {
          key: "admin",
          header: "Admin",
          hideBelow: "md",
          cell: (row) => {
            const admin = row.adminUser as { name?: string; email?: string } | undefined;
            return <span className="text-sm">{admin?.name ?? admin?.email ?? "—"}</span>;
          },
        },
      ]}
    />
  );
}
