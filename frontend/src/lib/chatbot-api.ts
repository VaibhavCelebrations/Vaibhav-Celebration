import { apiFetch } from "./api-client";

export type ChatbotNode = {
  question?: string;
  message?: string;
  options?: { label: string; next: string }[];
  collectField?: string;
  collectFields?: string[];
  createLead?: boolean;
  next?: string;
  redirect?: string;
};

export type ChatbotFlow = {
  start: string;
  nodes: Record<string, ChatbotNode>;
};

export async function getChatbotFlow(): Promise<ChatbotFlow> {
  return apiFetch<ChatbotFlow>("/chatbot/flow", { next: { revalidate: 60 } });
}

export async function saveChatbotSession(payload: {
  path: unknown;
  resultTag?: string;
  createLead?: boolean;
  lead?: { name: string; email?: string; phone?: string; interestArea?: string };
}) {
  return apiFetch("/chatbot/session", {
    method: "POST",
    body: payload,
  });
}
