"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CHATBOT_FLOW = void 0;
exports.getChatbotFlow = getChatbotFlow;
exports.saveChatbotSession = saveChatbotSession;
exports.updateChatbotFlow = updateChatbotFlow;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
/** Default static decision tree — Document 04 §9 / Meeting 2 flow */
exports.DEFAULT_CHATBOT_FLOW = {
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
};
async function getChatbotFlow() {
    const setting = await prisma_1.prisma.operationalSetting.findUnique({
        where: { key: "CHATBOT_FLOW_JSON" },
    });
    if (setting?.value) {
        try {
            return JSON.parse(setting.value);
        }
        catch {
            return exports.DEFAULT_CHATBOT_FLOW;
        }
    }
    return exports.DEFAULT_CHATBOT_FLOW;
}
async function saveChatbotSession(input) {
    const session = await prisma_1.prisma.chatbotSession.create({
        data: {
            path: input.path,
            resultTag: input.resultTag,
        },
    });
    let lead = null;
    if (input.createLead && input.lead?.name) {
        lead = await prisma_1.prisma.lead.create({
            data: {
                name: input.lead.name,
                email: input.lead.email?.toLowerCase(),
                phone: input.lead.phone,
                interestArea: input.lead.interestArea ?? input.resultTag,
                source: client_1.LeadSource.CHATBOT,
                status: client_1.LeadStatus.NEW,
                chatbotSessionId: session.id,
            },
        });
    }
    return { session, lead };
}
async function updateChatbotFlow(flow) {
    await prisma_1.prisma.operationalSetting.upsert({
        where: { key: "CHATBOT_FLOW_JSON" },
        create: { key: "CHATBOT_FLOW_JSON", value: JSON.stringify(flow) },
        update: { value: JSON.stringify(flow) },
    });
    return flow;
}
//# sourceMappingURL=chatbot.service.js.map