import type { ISODate } from "./common";

/**
 * Matches OperationalSetting (key/value string row). The admin UI renders
 * each with a human label/description/unit looked up by key — see
 * src/lib/data/settings.ts for the seeded key list (only 3 numeric keys
 * exist in backend/prisma/seed.ts today: gst_percent, max_bookings_per_day,
 * min_consultation_advance_days — plus business-info string keys not shown
 * in Settings).
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
