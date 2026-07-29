import { getWhatsAppNumber } from "@/lib/cms/settings";
import { WhatsAppFAB } from "./WhatsAppFAB";

export async function WhatsAppFABServer() {
  const phone = await getWhatsAppNumber();
  return <WhatsAppFAB phone={phone} />;
}
