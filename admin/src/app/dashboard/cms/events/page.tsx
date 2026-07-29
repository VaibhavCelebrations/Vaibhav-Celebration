import type { Metadata } from "next";
import { Suspense } from "react";
import { RoleGate } from "@/components/AdminSessionContext";
import { EventsScreen } from "./EventsScreen";

export const metadata: Metadata = { title: "Events | Vaibhav Celebrations Admin" };

export default function EventsPage() {
  return (
    <RoleGate allow={["SUPER_ADMIN", "CONTENT_EDITOR"]}>
      <Suspense fallback={<div className="skeleton h-64 w-full rounded-(--radius-md)" />}>
        <EventsScreen />
      </Suspense>
    </RoleGate>
  );
}
