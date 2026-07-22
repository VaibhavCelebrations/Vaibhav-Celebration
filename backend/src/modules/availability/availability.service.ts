import { BookingStatus, CapacityScope, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { getMaxBookingsPerDay } from "../../lib/settings";
import { cached, delPattern } from "../../lib/redis";
import { dateKey, toDateOnly } from "../../lib/validators";

export type DayAvailability = {
  date: string;
  available: boolean;
  remainingSlots: number;
  maxSlots: number;
  isBlocked: boolean;
  bookedCount: number;
};

async function resolveCapacity(eventDate: Date): Promise<{ max: number; isBlocked: boolean }> {
  const specific = await prisma.bookingCapacityRule.findFirst({
    where: { scope: CapacityScope.SPECIFIC_DATE, specificDate: eventDate },
    orderBy: { updatedAt: "desc" },
  });
  if (specific) {
    return { max: specific.maxBookingsPerDay, isBlocked: specific.isBlocked };
  }

  const global = await prisma.bookingCapacityRule.findFirst({
    where: { scope: CapacityScope.GLOBAL_DEFAULT },
    orderBy: { updatedAt: "desc" },
  });
  if (global) {
    return { max: global.maxBookingsPerDay, isBlocked: global.isBlocked };
  }

  return { max: await getMaxBookingsPerDay(), isBlocked: false };
}

async function countActiveBookings(eventDate: Date): Promise<number> {
  return prisma.booking.count({
    where: {
      eventDate,
      deletedAt: null,
      status: { not: BookingStatus.CANCELLED },
    },
  });
}

export async function getAvailabilityForDate(dateInput: string | Date): Promise<DayAvailability> {
  const eventDate = toDateOnly(dateInput);
  const dk = dateKey(eventDate);
  return cached(`avail:${dk}`, 2 * 60, async () => {
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
export async function invalidateAvailabilityCache(date: Date | string): Promise<void> {
  const dk = dateKey(toDateOnly(date));
  await delPattern(`avail:${dk}`);
}

export async function getAvailabilityRange(from: string, to: string): Promise<DayAvailability[]> {
  const start = toDateOnly(from);
  const end = toDateOnly(to);
  if (end < start) return [];

  const days: DayAvailability[] = [];
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
export async function withDateAdvisoryLock<T>(
  eventDate: Date,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const key = dateKey(eventDate);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
    return fn(tx);
  });
}

export { resolveCapacity, countActiveBookings };
