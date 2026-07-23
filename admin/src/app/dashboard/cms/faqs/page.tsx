import type { Metadata } from "next";
import { Suspense } from "react";
import { RoleGate } from "@/components/AdminSessionContext";
import { FaqsScreen } from "./FaqsScreen";

export const metadata: Metadata = { title: "FAQs | Vaibhav Celebrations Admin" };

export default function FaqsPage() {
  return (
    <RoleGate allow={["SUPER_ADMIN", "CONTENT_EDITOR"]}>
      <Suspense fallback={<div className="skeleton h-64 w-full rounded-(--radius-md)" />}>
        <FaqsScreen />
      </Suspense>
    </RoleGate>
  );
}
