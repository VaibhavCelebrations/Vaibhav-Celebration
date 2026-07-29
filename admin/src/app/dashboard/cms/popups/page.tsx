import type { Metadata } from "next";
import { Suspense } from "react";
import { RoleGate } from "@/components/AdminSessionContext";
import { PopupsScreen } from "./PopupsScreen";

export const metadata: Metadata = { title: "Popups | Vaibhav Celebrations Admin" };

export default function PopupsPage() {
  return (
    <RoleGate allow={["SUPER_ADMIN", "CONTENT_EDITOR"]}>
      <Suspense fallback={<div className="skeleton h-64 w-full rounded-(--radius-md)" />}>
        <PopupsScreen />
      </Suspense>
    </RoleGate>
  );
}
