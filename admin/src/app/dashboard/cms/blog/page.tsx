import type { Metadata } from "next";
import { Suspense } from "react";
import { RoleGate } from "@/components/AdminSessionContext";
import { BlogScreen } from "./BlogScreen";

export const metadata: Metadata = { title: "Blog | Vaibhav Celebrations Admin" };

export default function BlogPage() {
  return (
    <RoleGate allow={["SUPER_ADMIN", "CONTENT_EDITOR"]}>
      <Suspense fallback={<div className="skeleton h-64 w-full rounded-(--radius-md)" />}>
        <BlogScreen />
      </Suspense>
    </RoleGate>
  );
}
