import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { cached, delPattern } from "./redis";

// ─── In-memory fallback (used when Redis is unavailable) ─────────────────────
const _memCache = new Map<string, { value: string; at: number }>();
const MEM_TTL_MS = 60_000;

async function _getSettingFromDb(key: string, fallback: string): Promise<string> {
  // Try Redis first via cached() helper (TTL = 5 min)
  const redisKey = `settings:${key}`;
  return cached<string>(redisKey, 300, async () => {
    const row = await prisma.operationalSetting.findUnique({ where: { key } });
    return row?.value ?? fallback;
  });
}

export async function getSetting(key: string, fallback: string): Promise<string> {
  // Check in-memory cache as hot-layer above Redis
  const mem = _memCache.get(key);
  if (mem && Date.now() - mem.at < MEM_TTL_MS) return mem.value;

  const value = await _getSettingFromDb(key, fallback);
  _memCache.set(key, { value, at: Date.now() });
  return value;
}

export async function getSettingNumber(key: string, fallback: number): Promise<number> {
  const raw = await getSetting(key, String(fallback));
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export async function getGstPercent(): Promise<number> {
  const primary = await getSettingNumber("GST_PERCENT", NaN);
  if (Number.isFinite(primary)) return primary;
  return getSettingNumber("gst_percent", env.DEFAULT_GST_PERCENT);
}

export async function getMaxBookingsPerDay(): Promise<number> {
  const primary = await getSettingNumber("MAX_BOOKINGS_PER_DAY", NaN);
  if (Number.isFinite(primary)) return primary;
  return getSettingNumber("max_bookings_per_day", env.DEFAULT_MAX_BOOKINGS_PER_DAY);
}

export async function getMinConsultationAdvanceDays(): Promise<number> {
  const primary = await getSettingNumber("MIN_CONSULTATION_ADVANCE_DAYS", NaN);
  if (Number.isFinite(primary)) return primary;
  return getSettingNumber("min_consultation_advance_days", env.MIN_CONSULTATION_ADVANCE_DAYS);
}

/** Cart/package subtotal (pre-GST) at or above this unlocks free delivery. Default ₹2,999. */
export async function getFreeShippingThresholdInPaise(): Promise<number> {
  return getSettingNumber("FREE_SHIPPING_THRESHOLD_IN_PAISE", 299_900);
}

/** Flat delivery fee when subtotal is below the free-shipping threshold. Default ₹199. */
export async function getShippingFeeInPaise(): Promise<number> {
  return getSettingNumber("SHIPPING_FEE_IN_PAISE", 19_900);
}

export type ShippingQuoteSlice = {
  shippingInPaise: number;
  shippingWaived: boolean;
  freeShippingThresholdInPaise: number;
  amountUntilFreeShippingInPaise: number;
};

/** Derive shipping fee from product subtotal (excludes GST and shipping itself). */
export async function computeShippingForSubtotal(subtotalInPaise: number): Promise<ShippingQuoteSlice> {
  const freeShippingThresholdInPaise = await getFreeShippingThresholdInPaise();
  const fee = await getShippingFeeInPaise();
  const shippingWaived = subtotalInPaise >= freeShippingThresholdInPaise;
  const shippingInPaise = shippingWaived ? 0 : fee;
  return {
    shippingInPaise,
    shippingWaived,
    freeShippingThresholdInPaise,
    amountUntilFreeShippingInPaise: Math.max(0, freeShippingThresholdInPaise - subtotalInPaise),
  };
}

export function invalidateSettingsCache() {
  _memCache.clear();
  // Also purge Redis settings keys (non-blocking)
  void delPattern("settings:*");
}

export function gstOn(amountInPaise: number, gstPercent: number): number {
  return Math.round((amountInPaise * gstPercent) / 100);
}
