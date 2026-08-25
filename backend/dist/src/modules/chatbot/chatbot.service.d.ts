/** Default static decision tree — Document 04 §9 / Meeting 2 flow */
export declare const DEFAULT_CHATBOT_FLOW: {
    readonly start: "Q1";
    readonly nodes: {
        readonly Q1: {
            readonly question: "What are you looking for?";
            readonly options: readonly [{
                readonly label: "Plan a Birthday Party";
                readonly next: "Q2_PARTY";
            }, {
                readonly label: "Return Gifts / Products";
                readonly next: "Q2_SHOP";
            }, {
                readonly label: "Just Browsing";
                readonly next: "END_BROWSE";
            }];
        };
        readonly Q2_PARTY: {
            readonly question: "When is the celebration?";
            readonly collectField: "eventDate";
            readonly next: "COLLECT_CONTACT";
        };
        readonly Q2_SHOP: {
            readonly question: "Great! Our shop launches soon. Leave your details for early access?";
            readonly next: "COLLECT_CONTACT";
        };
        readonly COLLECT_CONTACT: {
            readonly collectFields: readonly ["name", "phone", "email"];
            readonly next: "END_LEAD";
        };
        readonly END_LEAD: {
            readonly message: "Thank you! Our team will reach out shortly.";
            readonly createLead: true;
        };
        readonly END_BROWSE: {
            readonly message: "Enjoy exploring Vaibhav Celebrations. We're here when you're ready!";
            readonly createLead: false;
        };
    };
};
export declare function getChatbotFlow(): Promise<{
    readonly start: "Q1";
    readonly nodes: {
        readonly Q1: {
            readonly question: "What are you looking for?";
            readonly options: readonly [{
                readonly label: "Plan a Birthday Party";
                readonly next: "Q2_PARTY";
            }, {
                readonly label: "Return Gifts / Products";
                readonly next: "Q2_SHOP";
            }, {
                readonly label: "Just Browsing";
                readonly next: "END_BROWSE";
            }];
        };
        readonly Q2_PARTY: {
            readonly question: "When is the celebration?";
            readonly collectField: "eventDate";
            readonly next: "COLLECT_CONTACT";
        };
        readonly Q2_SHOP: {
            readonly question: "Great! Our shop launches soon. Leave your details for early access?";
            readonly next: "COLLECT_CONTACT";
        };
        readonly COLLECT_CONTACT: {
            readonly collectFields: readonly ["name", "phone", "email"];
            readonly next: "END_LEAD";
        };
        readonly END_LEAD: {
            readonly message: "Thank you! Our team will reach out shortly.";
            readonly createLead: true;
        };
        readonly END_BROWSE: {
            readonly message: "Enjoy exploring Vaibhav Celebrations. We're here when you're ready!";
            readonly createLead: false;
        };
    };
}>;
export declare function saveChatbotSession(input: {
    path: unknown;
    resultTag?: string;
    createLead?: boolean;
    lead?: {
        name: string;
        email?: string;
        phone?: string;
        interestArea?: string;
    };
}): Promise<{
    session: {
        path: import("@prisma/client/runtime/library").JsonValue;
        id: string;
        createdAt: Date;
        resultTag: string | null;
    };
    lead: {
        status: import(".prisma/client").$Enums.LeadStatus;
        message: string | null;
        name: string;
        id: string;
        email: string | null;
        createdAt: Date;
        deletedAt: Date | null;
        phone: string | null;
        customerId: string | null;
        source: import(".prisma/client").$Enums.LeadSource;
        interestArea: string | null;
        chatbotSessionId: string | null;
    } | null;
}>;
export declare function updateChatbotFlow(flow: unknown): Promise<unknown>;
