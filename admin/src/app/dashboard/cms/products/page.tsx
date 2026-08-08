import type { Metadata } from "next";
import { Suspense } from "react";
import { RoleGate } from "@/components/AdminSessionContext";
import { ProductsScreen } from "./ProductsScreen";

export const metadata: Metadata = { title: "Products | Vaibhav Celebrations Admin" };

export default function ProductsPage() {
  return (
    <RoleGate allow={["SUPER_ADMIN", "CONTENT_EDITOR"]}>
      <Suspense fallback={<div className="skeleton h-64 w-full rounded-(--radius-md)" />}>
        <ProductsScreen />
      </Suspense>
    </RoleGate>
  );
}
