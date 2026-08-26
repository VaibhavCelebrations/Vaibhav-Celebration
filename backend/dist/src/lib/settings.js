"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSetting = getSetting;
exports.getSettingNumber = getSettingNumber;
exports.getGstPercent = getGstPercent;
exports.getMaxBookingsPerDay = getMaxBookingsPerDay;
exports.getMinConsultationAdvanceDays = getMinConsultationAdvanceDays;
exports.getFreeShippingThresholdInPaise = getFreeShippingThresholdInPaise;
exports.getShippingFeeInPaise = getShippingFeeInPaise;
exports.computeShippingForSubtotal = computeShippingForSubtotal;
exports.invalidateSettingsCache = invalidateSettingsCache;
exports.gstOn = gstOn;
const prisma_1 = require("../db/prisma");
const env_1 = require("../config/env");
const redis_1 = require("./redis");
// ─── In-memory fallback (used when Redis is unavailable) ─────────────────────
const _memCache = new Map();
const MEM_TTL_MS = 60_000;
async function _getSettingFromDb(key, fallback) {
    // Try Redis first via cached() helper (TTL = 5 min)
    const redisKey = `settings:${key}`;
    return (0, redis_1.cached)(redisKey, 300, async () => {
        const row = await prisma_1.prisma.operationalSetting.findUnique({ where: { key } });
        return row?.value ?? fallback;
    });
}
async function getSetting(key, fallback) {
    // Check in-memory cache as hot-layer above Redis
    const mem = _memCache.get(key);
    if (mem && Date.now() - mem.at < MEM_TTL_MS)
        return mem.value;
    const value = await _getSettingFromDb(key, fallback);
    _memCache.set(key, { value, at: Date.now() });
    return value;
}
async function getSettingNumber(key, fallback) {
    const raw = await getSetting(key, String(fallback));
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
}
async function getGstPercent() {
    const primary = await getSettingNumber("GST_PERCENT", NaN);
    if (Number.isFinite(primary))
        return primary;
    return getSettingNumber("gst_percent", env_1.env.DEFAULT_GST_PERCENT);
}
async function getMaxBookingsPerDay() {
    const primary = await getSettingNumber("MAX_BOOKINGS_PER_DAY", NaN);
    if (Number.isFinite(primary))
        return primary;
    return getSettingNumber("max_bookings_per_day", env_1.env.DEFAULT_MAX_BOOKINGS_PER_DAY);
}
async function getMinConsultationAdvanceDays() {
    const primary = await getSettingNumber("MIN_CONSULTATION_ADVANCE_DAYS", NaN);
    if (Number.isFinite(primary))
        return primary;
    return getSettingNumber("min_consultation_advance_days", env_1.env.MIN_CONSULTATION_ADVANCE_DAYS);
}
/** Cart/package subtotal (pre-GST) at or above this unlocks free delivery. Default ₹2,999. */
async function getFreeShippingThresholdInPaise() {
    return getSettingNumber("FREE_SHIPPING_THRESHOLD_IN_PAISE", 299_900);
}
/** Flat delivery fee when subtotal is below the free-shipping threshold. Default ₹199. */
async function getShippingFeeInPaise() {
    return getSettingNumber("SHIPPING_FEE_IN_PAISE", 19_900);
}
/** Derive shipping fee from product subtotal (excludes GST and shipping itself). */
async function computeShippingForSubtotal(subtotalInPaise) {
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
function invalidateSettingsCache() {
    _memCache.clear();
    // Also purge Redis settings keys (non-blocking)
    void (0, redis_1.delPattern)("settings:*");
}
function gstOn(amountInPaise, gstPercent) {
    return Math.round((amountInPaise * gstPercent) / 100);
}
//# sourceMappingURL=settings.js.map