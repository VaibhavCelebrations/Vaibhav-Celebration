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
      next: "COLLECT_CONTACT",
    },
    Q2_SHOP: {
      question: "Great! Our shop launches soon. Leave your details for early access?",
      next: "COLLECT_CONTACT",
    },
    COLLECT_CONTACT: {
      collectFields: ["name", "phone", "email"],
      next: "END_LEAD",
    },
    END_LEAD: {
      message: "Thank you! Our team will reach out shortly.",
      createLead: true,
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
    lead = await prisma.lead.create({
      data: {
        name: input.lead.name,
        email: input.lead.email?.toLowerCase(),
        phone: input.lead.phone,
        interestArea: input.lead.interestArea ?? input.resultTag,
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
