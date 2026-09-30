import { getWhatsAppNumber } from "@/lib/cms/settings";
import { FloatingActions } from "./FloatingActions";

export async function FloatingActionsServer() {
  const phone = await getWhatsAppNumber();
  return <FloatingActions phone={phone} />;
}
