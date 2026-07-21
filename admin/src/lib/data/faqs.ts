import { adminFetch } from "@/lib/admin-api-client";
import { createMockCollection } from "@/lib/mock/store";
import type { Faq, FaqInput } from "@/types/cms";
import { USE_MOCK_DATA } from "./config";
import { qs, type ListResult, type Repository } from "./types";

const ENDPOINT = "/admin/faqs";

const seed: Faq[] = [
  { id: "faq_1", question: "How far in advance should I book?", answer: "We recommend booking at least 3–6 months ahead for peak wedding season (Oct–Feb).", category: "Booking", displayOrder: 1, isActive: true, deletedAt: null },
  { id: "faq_2", question: "Can I visit the venue before booking?", answer: "Yes! Schedule a free consultation or attend our monthly Open Day events.", category: "Booking", displayOrder: 2, isActive: true, deletedAt: null },
  { id: "faq_3", question: "What is included in the base package price?", answer: "Each package includes venue access, base décor, seating, and event coordination.", category: "Packages", displayOrder: 3, isActive: true, deletedAt: null },
  { id: "faq_4", question: "Can I upgrade my package after booking?", answer: "Yes, upgrades are possible subject to availability. Contact our operations team.", category: "Packages", displayOrder: 4, isActive: true, deletedAt: null },
  { id: "faq_5", question: "Can themes be customized?", answer: "Absolutely. Our design team can tailor colors, florals, and layout to match your vision.", category: "Themes", displayOrder: 5, isActive: true, deletedAt: null },
  { id: "faq_6", question: "What is the venue capacity?", answer: "Our farmhouse accommodates 50–350 guests depending on the package and setup.", category: "Venue", displayOrder: 6, isActive: true, deletedAt: null },
  { id: "faq_7", question: "Is parking available?", answer: "Yes, complimentary parking for up to 80 vehicles on premises.", category: "Venue", displayOrder: 7, isActive: true, deletedAt: null },
  { id: "faq_8", question: "What is the payment schedule?", answer: "40% advance on booking confirmation, 40% two weeks before event, 20% on event day.", category: "Payments", displayOrder: 8, isActive: true, deletedAt: null },
  { id: "faq_9", question: "Do you accept UPI and cards?", answer: "Yes, we accept UPI, credit/debit cards, and bank transfers via Razorpay.", category: "Payments", displayOrder: 9, isActive: true, deletedAt: null },
  { id: "faq_10", question: "Do you provide catering?", answer: "Catering is available as an add-on. We partner with trusted vendors for multi-cuisine menus.", category: "General", displayOrder: 10, isActive: false, deletedAt: null },
];

const mockFaqsRepo = createMockCollection<Faq, FaqInput>({
  idPrefix: "faq",
  seed,
  searchFields: ["question", "answer", "category"],
  defaultSort: "displayOrder",
  applyFilters: (row, filters) => (filters.category ? row.category === filters.category : true),
  onCreate: (input, id) => ({ id, deletedAt: null, ...input }),
  onUpdate: (row, input) => ({ ...row, ...input }),
  notFoundMessage: () => "This FAQ no longer exists.",
});

export const faqsRepo: Repository<Faq, FaqInput> = USE_MOCK_DATA
  ? mockFaqsRepo
  : {
      list: (query) => adminFetch<ListResult<Faq>>(`${ENDPOINT}${qs(query)}`),
      get: (id) => adminFetch<Faq>(`${ENDPOINT}/${id}`),
      create: (body) => adminFetch<Faq>(ENDPOINT, { method: "POST", body }),
      update: (id, body) => adminFetch<Faq>(`${ENDPOINT}/${id}`, { method: "PATCH", body }),
      archive: (id) => adminFetch<void>(`${ENDPOINT}/${id}`, { method: "DELETE" }),
    };

export const FAQ_CATEGORIES = ["Booking", "Packages", "Themes", "Venue", "Payments", "General"] as const;
