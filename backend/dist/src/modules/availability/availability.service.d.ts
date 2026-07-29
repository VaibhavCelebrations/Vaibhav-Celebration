import { Prisma } from "@prisma/client";
export type DayAvailability = {
    date: string;
    available: boolean;
    remainingSlots: number;
    maxSlots: number;
    isBlocked: boolean;
    bookedCount: number;
};
declare function resolveCapacity(eventDate: Date): Promise<{
    max: number;
    isBlocked: boolean;
}>;
declare function countActiveBookings(eventDate: Date): Promise<number>;
export declare function getAvailabilityForDate(dateInput: string | Date): Promise<DayAvailability>;
/** Invalidate availability cache for a specific date (call on booking create/cancel). */
export declare function invalidateAvailabilityCache(date: Date | string): Promise<void>;
export declare function getAvailabilityRange(from: string, to: string): Promise<DayAvailability[]>;
/**
 * Document 04 §4.1 — advisory lock keyed on event date prevents overbooking
 * under concurrent checkout attempts.
 */
export declare function withDateAdvisoryLock<T>(eventDate: Date, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
export { resolveCapacity, countActiveBookings };
