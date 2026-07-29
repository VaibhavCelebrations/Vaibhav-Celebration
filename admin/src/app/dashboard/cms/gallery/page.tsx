import type { Metadata } from "next";
import { Suspense } from "react";
import { RoleGate } from "@/components/AdminSessionContext";
import { GalleryScreen } from "./GalleryScreen";

export const metadata: Metadata = { title: "Gallery | Vaibhav Celebrations Admin" };

export default function GalleryPage() {
  return (
    <RoleGate allow={["SUPER_ADMIN", "CONTENT_EDITOR"]}>
      <Suspense fallback={<div className="skeleton h-64 w-full rounded-(--radius-md)" />}>
        <GalleryScreen />
      </Suspense>
    </RoleGate>
  );
}
