import { ResourceScreen } from "@/components/ResourceScreen";
import { invoicesRepo } from "@/lib/data/resources";

export default function InvoicesPage() {
  return <ResourceScreen title="Invoices" noun="Invoice" description="Review issued invoices and their delivery status." repo={invoicesRepo} fields={["name"]} />;
}
