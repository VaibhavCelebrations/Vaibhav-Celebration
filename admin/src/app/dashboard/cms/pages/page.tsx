import type { Metadata } from "next";
import { Suspense } from "react";
import { RoleGate } from "@/components/AdminSessionContext";
import { StaticPagesScreen } from "./StaticPagesScreen";

export const metadata: Metadata = { title: "Site Pages | Vaibhav Celebrations Admin" };

export default function SitePagesPage() {
  return (
    <RoleGate allow={["SUPER_ADMIN", "CONTENT_EDITOR"]}>
      <Suspense fallback={<div className="skeleton h-64 w-full rounded-(--radius-md)" />}>
        <StaticPagesScreen />
      </Suspense>
    </RoleGate>
  );
}
