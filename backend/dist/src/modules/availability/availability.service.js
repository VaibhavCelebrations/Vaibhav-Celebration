"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailabilityForDate = getAvailabilityForDate;
exports.invalidateAvailabilityCache = invalidateAvailabilityCache;
exports.getAvailabilityRange = getAvailabilityRange;
exports.withDateAdvisoryLock = withDateAdvisoryLock;
exports.resolveCapacity = resolveCapacity;
exports.countActiveBookings = countActiveBookings;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
const settings_1 = require("../../lib/settings");
const redis_1 = require("../../lib/redis");
const validators_1 = require("../../lib/validators");
async function resolveCapacity(eventDate) {
    const specific = await prisma_1.prisma.bookingCapacityRule.findFirst({
        where: { scope: client_1.CapacityScope.SPECIFIC_DATE, specificDate: eventDate },
        orderBy: { updatedAt: "desc" },
    });
    if (specific) {
        return { max: specific.maxBookingsPerDay, isBlocked: specific.isBlocked };
    }
    const global = await prisma_1.prisma.bookingCapacityRule.findFirst({
        where: { scope: client_1.CapacityScope.GLOBAL_DEFAULT },
        orderBy: { updatedAt: "desc" },
    });
    if (global) {
        return { max: global.maxBookingsPerDay, isBlocked: global.isBlocked };
    }
    return { max: await (0, settings_1.getMaxBookingsPerDay)(), isBlocked: false };
}
async function countActiveBookings(eventDate) {
    return prisma_1.prisma.booking.count({
        where: {
            eventDate,
            deletedAt: null,
            status: { not: client_1.BookingStatus.CANCELLED },
        },
    });
}
async function getAvailabilityForDate(dateInput) {
    const eventDate = (0, validators_1.toDateOnly)(dateInput);
    const dk = (0, validators_1.dateKey)(eventDate);
    return (0, redis_1.cached)(`avail:${dk}`, 2 * 60, async () => {
        const { max, isBlocked } = await resolveCapacity(eventDate);
        const bookedCount = await countActiveBookings(eventDate);
        const remainingSlots = Math.max(0, max - bookedCount);
        return {
            date: dk,
            available: !isBlocked && remainingSlots > 0,
            remainingSlots: isBlocked ? 0 : remainingSlots,
            maxSlots: max,
            isBlocked,
            bookedCount,
        };
    });
}
/** Invalidate availability cache for a specific date (call on booking create/cancel). */
async function invalidateAvailabilityCache(date) {
    const dk = (0, validators_1.dateKey)((0, validators_1.toDateOnly)(date));
    await (0, redis_1.delPattern)(`avail:${dk}`);
}
async function getAvailabilityRange(from, to) {
    const start = (0, validators_1.toDateOnly)(from);
    const end = (0, validators_1.toDateOnly)(to);
    if (end < start)
        return [];
    const days = [];
    const cursor = new Date(start);
    while (cursor <= end) {
        days.push(await getAvailabilityForDate(cursor));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return days;
}
/**
 * Document 04 §4.1 — advisory lock keyed on event date prevents overbooking
 * under concurrent checkout attempts.
 */
async function withDateAdvisoryLock(eventDate, fn) {
    return prisma_1.prisma.$transaction(async (tx) => {
        const key = (0, validators_1.dateKey)(eventDate);
        await tx.$executeRaw `SELECT pg_advisory_xact_lock(hashtext(${key}))`;
        return fn(tx);
    });
}
//# sourceMappingURL=availability.service.js.map