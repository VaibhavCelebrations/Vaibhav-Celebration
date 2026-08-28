import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inventory | Vaibhav Celebrations Admin",
  description: "Inventory management — stock levels, purchase orders, suppliers, and warehouses",
};

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
