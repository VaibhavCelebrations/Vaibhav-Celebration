import { LeadSource, LeadStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";

/** Default static decision tree — Document 04 §9 / Meeting 2 flow */
export const DEFAULT_CHATBOT_FLOW = {
  start: "Q1",
  nodes: {
    Q1: {
      question: "What are you looking for?",
      options: [
        { label: "Plan a Birthday Party", next: "Q2_PARTY" },
        { label: "Return Gifts / Products", next: "Q2_SHOP" },
        { label: "Just Browsing", next: "END_BROWSE" },
      ],
    },
    Q2_PARTY: {
      question: "When is the celebration?",
      collectField: "eventDate",
      next: "COLLECT_CONTACT_PARTY",
    },
    Q2_SHOP: {
      question: "Great! Leave your details below and we'll take you right to our shop.",
      next: "COLLECT_CONTACT_SHOP",
    },
    COLLECT_CONTACT_PARTY: {
      collectFields: ["name", "phone", "email"],
      next: "END_LEAD_PARTY",
    },
    COLLECT_CONTACT_SHOP: {
      collectFields: ["name", "phone", "email"],
      next: "END_LEAD_SHOP",
    },
    END_LEAD_PARTY: {
      message: "Thank you! Our team will reach out shortly. Redirecting to themes...",
      createLead: true,
      redirect: "/themes",
    },
    END_LEAD_SHOP: {
      message: "Thank you! Our team will reach out shortly. Redirecting to shop...",
      createLead: true,
      redirect: "/gifts",
    },
    END_BROWSE: {
      message: "Enjoy exploring Vaibhav Celebrations. We're here when you're ready!",
      createLead: false,
    },
  },
} as const;

export async function getChatbotFlow() {
  const setting = await prisma.operationalSetting.findUnique({
    where: { key: "CHATBOT_FLOW_JSON" },
  });
  if (setting?.value) {
    try {
      return JSON.parse(setting.value) as typeof DEFAULT_CHATBOT_FLOW;
    } catch {
      return DEFAULT_CHATBOT_FLOW;
    }
  }
  return DEFAULT_CHATBOT_FLOW;
}

export async function saveChatbotSession(input: {
  path: unknown;
  resultTag?: string;
  createLead?: boolean;
  lead?: { name: string; email?: string; phone?: string; interestArea?: string };
}) {
  const session = await prisma.chatbotSession.create({
    data: {
      path: input.path as object,
      resultTag: input.resultTag,
    },
  });

  let lead = null;
  if (input.createLead && input.lead?.name) {
    let message: string | undefined = undefined;
    const pathObj = input.path as { data?: Record<string, string> };
    if (pathObj?.data?.eventDate) {
      message = `Event Date: ${pathObj.data.eventDate}`;
    }

    lead = await prisma.lead.create({
      data: {
        name: input.lead.name,
        email: input.lead.email?.toLowerCase(),
        phone: input.lead.phone,
        interestArea: input.lead.interestArea ?? input.resultTag,
        message: message,
        source: LeadSource.CHATBOT,
        status: LeadStatus.NEW,
        chatbotSessionId: session.id,
      },
    });
  }

  return { session, lead };
}

export async function updateChatbotFlow(flow: unknown) {
  await prisma.operationalSetting.upsert({
    where: { key: "CHATBOT_FLOW_JSON" },
    create: { key: "CHATBOT_FLOW_JSON", value: JSON.stringify(flow) },
    update: { value: JSON.stringify(flow) },
  });
  return flow;
}
