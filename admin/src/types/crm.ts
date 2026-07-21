import type { ISODate, Paise, SoftDeletable, Timestamped } from "./common";

// ─── Customers ──────────────────────────────────────────────────────────────

export type Customer = SoftDeletable &
  Timestamped & {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    // list-view summary
    bookingCount: number;
    consultationCount: number;
    lifetimeValueInPaise: Paise;
    lastActivityAt: ISODate | null;
  };

export type CustomerInput = Pick<Customer, "fullName" | "email" | "phone">;

export type CustomerNote = {
  id: string;
  customerId: string;
  authorName: string;
  note: string;
  createdAt: ISODate;
};

// ─── Leads ──────────────────────────────────────────────────────────────────

export const LEAD_SOURCES = ["CHATBOT", "CONTACT_FORM", "CONSULTATION", "EVENT_REGISTRATION", "NEWSLETTER", "OTHER"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "CLOSED_LOST"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type ChatbotPathStep = { step: string; answer: string | null };

export type Lead = SoftDeletable & {
  id: string;
  customerId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  source: LeadSource;
  status: LeadStatus;
  interestArea: string | null;
  message: string | null;
  chatbotPath: ChatbotPathStep[] | null;
  chatbotResultTag: string | null;
  createdAt: ISODate;
};

export type LeadInput = Pick<Lead, "name" | "email" | "phone" | "source" | "status" | "interestArea" | "message">;

// ─── Consultation Requests ──────────────────────────────────────────────────

export const CONSULTATION_STATUSES = ["PENDING", "REVIEWED", "SCHEDULED", "COMPLETED", "DECLINED"] as const;
export type ConsultationStatus = (typeof CONSULTATION_STATUSES)[number];

export type ConsultationRequest = SoftDeletable & {
  id: string;
  customerId: string | null;
  name: string;
  email: string;
  phone: string;
  eventDate: ISODate;
  childOrEventDetails: string | null;
  customRequirements: string | null;
  advanceNoticeDays: number;
  belowMinimumNotice: boolean;
  status: ConsultationStatus;
  createdAt: ISODate;
};

export type ConsultationInput = Pick<
  ConsultationRequest,
  "name" | "email" | "phone" | "eventDate" | "childOrEventDetails" | "customRequirements" | "status"
>;

// ─── Bookings ───────────────────────────────────────────────────────────────

export const BOOKING_STATUSES = ["SCHEDULED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PAYMENT_STATUSES_CRM = ["NOT_REQUIRED", "PENDING", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES_CRM)[number];

export type BookingCustomizationLine = {
  id: string;
  optionId: string;
  optionLabel: string;
  quantity: number;
  unitPriceInPaise: Paise;
};

export type Booking = SoftDeletable &
  Timestamped & {
    id: string;
    bookingCode: string;
    customerId: string;
    customerName: string;
    themeId: string;
    themeTitle: string;
    packageId: string;
    packageTitle: string;
    eventDate: ISODate;
    status: BookingStatus;
    paymentStatus: PaymentStatus;
    basePriceInPaise: Paise;
    customizationTotalInPaise: Paise;
    gstInPaise: Paise;
    totalPriceInPaise: Paise;
    guestEmail: string;
    guestPhone: string;
    customizations: BookingCustomizationLine[];
    invoiceId: string | null;
  };

export type BookingStatusChange = { status: BookingStatus; reason?: string };

// ─── Booking Capacity ───────────────────────────────────────────────────────

export const CAPACITY_SCOPES = ["GLOBAL_DEFAULT", "SPECIFIC_DATE"] as const;
export type CapacityScope = (typeof CAPACITY_SCOPES)[number];

export type BookingCapacityRule = {
  id: string;
  scope: CapacityScope;
  specificDate: ISODate | null; // "YYYY-MM-DD"
  maxBookingsPerDay: number;
  isBlocked: boolean;
};

// ─── Calendar ───────────────────────────────────────────────────────────────

export type CalendarEntry = {
  id: string;
  kind: "BOOKING" | "CONSULTATION";
  refId: string;
  title: string;
  dateKey: string; // "YYYY-MM-DD", local calendar day
  time: string | null; // "HH:mm"
  status: BookingStatus | ConsultationStatus;
  customerName: string;
};

export type DayCapacity = {
  dateKey: string;
  booked: number;
  max: number;
  isBlocked: boolean;
};

// ─── Invoices ───────────────────────────────────────────────────────────────

export const INVOICE_LINKED_TYPES = ["BOOKING", "ORDER", "EVENT_REGISTRATION"] as const;
export type InvoiceLinkedType = (typeof INVOICE_LINKED_TYPES)[number];

export type Invoice = {
  id: string;
  invoiceNumber: string;
  linkedType: InvoiceLinkedType;
  linkedRefId: string | null;
  customerId: string;
  customerName: string;
  subtotalInPaise: Paise;
  gstInPaise: Paise;
  totalInPaise: Paise;
  pdfUrl: string | null;
  emailSentAt: ISODate | null;
  whatsappSentAt: ISODate | null;
  whatsappSendStatus: string | null;
  issuedAt: ISODate;
};
