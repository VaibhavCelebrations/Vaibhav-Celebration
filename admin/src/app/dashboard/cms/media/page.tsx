import type { Metadata } from "next";
import { Suspense } from "react";
import { RoleGate } from "@/components/AdminSessionContext";
import { MediaLibraryScreen } from "./MediaLibraryScreen";

export const metadata: Metadata = { title: "Media Library | Vaibhav Celebrations Admin" };

export default function MediaPage() {
  return (
    <RoleGate allow={["SUPER_ADMIN", "CONTENT_EDITOR"]}>
      <Suspense fallback={<div className="skeleton h-64 w-full rounded-(--radius-md)" />}>
        <MediaLibraryScreen />
      </Suspense>
    </RoleGate>
  );
}
