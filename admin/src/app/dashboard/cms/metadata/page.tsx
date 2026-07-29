import type { Metadata } from "next";
import { Suspense } from "react";
import { RoleGate } from "@/components/AdminSessionContext";
import { MetadataScreen } from "./MetadataScreen";

export const metadata: Metadata = { title: "Site Metadata | Vaibhav Celebrations Admin" };

export default function MetadataPage() {
  return (
    <RoleGate allow={["SUPER_ADMIN", "CONTENT_EDITOR"]}>
      <Suspense fallback={<div className="skeleton h-64 w-full rounded-(--radius-md)" />}>
        <MetadataScreen />
      </Suspense>
    </RoleGate>
  );
}
