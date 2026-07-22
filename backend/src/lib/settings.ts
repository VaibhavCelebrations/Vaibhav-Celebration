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
  return getSettingNumber("GST_PERCENT", env.DEFAULT_GST_PERCENT);
}

export async function getMaxBookingsPerDay(): Promise<number> {
  return getSettingNumber("MAX_BOOKINGS_PER_DAY", env.DEFAULT_MAX_BOOKINGS_PER_DAY);
}

export async function getMinConsultationAdvanceDays(): Promise<number> {
  return getSettingNumber("MIN_CONSULTATION_ADVANCE_DAYS", env.MIN_CONSULTATION_ADVANCE_DAYS);
}

export function invalidateSettingsCache() {
  _memCache.clear();
  // Also purge Redis settings keys (non-blocking)
  void delPattern("settings:*");
}

export function gstOn(amountInPaise: number, gstPercent: number): number {
  return Math.round((amountInPaise * gstPercent) / 100);
}
