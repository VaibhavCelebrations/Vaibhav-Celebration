import type { ISODate } from "./common";

/**
 * Matches OperationalSetting (key/value string row). Seeded numeric keys
 * include GST_PERCENT, MIN_CONSULTATION_ADVANCE_DAYS,
 * FREE_SHIPPING_THRESHOLD_IN_PAISE, SHIPPING_FEE_IN_PAISE, plus
 * business-info string keys.
 */
export type OperationalSetting = {
  key: string;
  value: string;
  label: string;
  description: string;
  unit: string | null; // "%", "per day", "days" — null if not numeric
  updatedAt: ISODate;
};

export type IntegrationName = "RAZORPAY" | "WHATSAPP" | "SMTP" | "CLOUDFLARE_MEDIA";
export type IntegrationStatus = "LIVE" | "TEST_MODE" | "PENDING" | "NOT_CONFIGURED" | "FAILING";

export type IntegrationHealth = {
  name: IntegrationName;
  label: string;
  status: IntegrationStatus;
  detail: string | null;
  lastCheckedAt: ISODate;
};

export type DashboardStat = {
  id: string;
  label: string;
  value: string;
  delta: string;
  deltaPositive: boolean;
};

export type DashboardAttentionItem = {
  id: string;
  label: string;
  count: number;
  href: string;
  tone: "warning" | "error";
};

export type DashboardSummary = {
  stats: DashboardStat[];
  recentBookings: {
    id: string;
    bookingCode: string;
    customerName: string;
    eventLabel: string;
    eventDate: ISODate;
    packageTitle: string;
    totalPriceInPaise: number;
    status: string;
  }[];
  upcomingEvents: { id: string; name: string; date: ISODate; guests: number; status: string }[];
  attention: DashboardAttentionItem[];
};
