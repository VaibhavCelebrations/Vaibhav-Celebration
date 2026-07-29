import type { Metadata } from "next";
import { Suspense } from "react";
import { RoleGate } from "@/components/AdminSessionContext";
import { TestimonialsScreen } from "./TestimonialsScreen";

export const metadata: Metadata = { title: "Testimonials | Vaibhav Celebrations Admin" };

export default function TestimonialsPage() {
  return (
    <RoleGate allow={["SUPER_ADMIN", "CONTENT_EDITOR"]}>
      <Suspense fallback={<div className="skeleton h-64 w-full rounded-(--radius-md)" />}>
        <TestimonialsScreen />
      </Suspense>
    </RoleGate>
  );
}
