import { ResourceScreen } from "@/components/ResourceScreen";
import { consultationsRepo } from "@/lib/data/resources";

export default function ConsultationsPage() {
  return <ResourceScreen title="Consultations" noun="Consultation" description="Review requests and schedule celebration consultations." repo={consultationsRepo} fields={["name", "description", "status"]} statusOptions={[{ value: "PENDING", label: "Pending" }, { value: "REVIEWED", label: "Reviewed" }, { value: "SCHEDULED", label: "Scheduled" }, { value: "COMPLETED", label: "Completed" }, { value: "DECLINED", label: "Declined" }]} />;
}
