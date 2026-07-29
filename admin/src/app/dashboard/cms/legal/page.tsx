import type { Metadata } from "next";
import { Suspense } from "react";
import { RoleGate } from "@/components/AdminSessionContext";
import { LegalPagesScreen } from "./LegalPagesScreen";

export const metadata: Metadata = { title: "Legal Pages | Vaibhav Celebrations Admin" };

export default function LegalPage() {
  return (
    <RoleGate allow={["SUPER_ADMIN", "CONTENT_EDITOR"]}>
      <Suspense fallback={<div className="skeleton h-64 w-full rounded-(--radius-md)" />}>
        <LegalPagesScreen />
      </Suspense>
    </RoleGate>
  );
}
