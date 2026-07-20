import { prisma } from "../db/prisma";
import { env } from "../config/env";

const cache = new Map<string, { value: string; at: number }>();
const TTL_MS = 60_000;

export async function getSetting(key: string, fallback: string): Promise<string> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;

  const row = await prisma.operationalSetting.findUnique({ where: { key } });
  const value = row?.value ?? fallback;
  cache.set(key, { value, at: Date.now() });
  return value;
}

export async function getSettingNumber(key: string, fallback: number): Promise<number> {
  const raw = await getSetting(key, String(fallback));
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export async function getGstPercent(): Promise<number> {
  return getSettingNumber("GST_PERCENT", env.DEFAULT_GST_PERCENT);
}

export async function getMaxBookingsPerDay(): Promise<number> {
  return getSettingNumber("MAX_BOOKINGS_PER_DAY", env.DEFAULT_MAX_BOOKINGS_PER_DAY);
}

export async function getMinConsultationAdvanceDays(): Promise<number> {
  return getSettingNumber("MIN_CONSULTATION_ADVANCE_DAYS", env.MIN_CONSULTATION_ADVANCE_DAYS);
}

export function invalidateSettingsCache() {
  cache.clear();
}

export function gstOn(amountInPaise: number, gstPercent: number): number {
  return Math.round((amountInPaise * gstPercent) / 100);
}
