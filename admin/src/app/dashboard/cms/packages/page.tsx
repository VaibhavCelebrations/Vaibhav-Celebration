import type { Metadata } from "next";
import { Suspense } from "react";
import { RoleGate } from "@/components/AdminSessionContext";
import { PackagesScreen } from "./PackagesScreen";

export const metadata: Metadata = { title: "Packages | Vaibhav Celebrations Admin" };

export default function PackagesPage() {
  return (
    <RoleGate allow={["SUPER_ADMIN", "CONTENT_EDITOR"]}>
      <Suspense fallback={<div className="skeleton h-64 w-full rounded-(--radius-md)" />}>
        <PackagesScreen />
      </Suspense>
    </RoleGate>
  );
}
