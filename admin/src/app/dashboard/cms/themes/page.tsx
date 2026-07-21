import type { Metadata } from "next";
import { Suspense } from "react";
import { RoleGate } from "@/components/AdminSessionContext";
import { ThemesScreen } from "./ThemesScreen";

export const metadata: Metadata = { title: "Themes | Vaibhav Celebrations Admin" };

export default function ThemesPage() {
  return (
    <RoleGate allow={["SUPER_ADMIN", "CONTENT_EDITOR"]}>
      <Suspense fallback={<div className="skeleton h-64 w-full rounded-(--radius-md)" />}>
        <ThemesScreen />
      </Suspense>
    </RoleGate>
  );
}
