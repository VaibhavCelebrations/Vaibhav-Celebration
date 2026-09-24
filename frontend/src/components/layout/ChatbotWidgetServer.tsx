import { getChatbotFlow } from "@/lib/chatbot-api";
import { ChatbotWidget } from "./ChatbotWidget";

export async function ChatbotWidgetServer() {
  try {
    const flow = await getChatbotFlow();
    return <ChatbotWidget flow={flow} />;
  } catch (error) {
    // Fail silently in case backend is down, to avoid breaking the frontend
    console.error("Failed to load chatbot flow:", error);
    return null;
  }
}
