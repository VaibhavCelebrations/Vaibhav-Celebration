import { prisma } from "../db/prisma";

/**
 * Atomically increment a named sequence counter and return the next value.
 * Used for bookingCode / invoiceNumber generation.
 */
export async function nextSequence(key: string): Promise<number> {
  const row = await prisma.sequenceCounter.upsert({
    where: { key },
    create: { key, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  });
  return row.lastValue;
}

export async function nextBookingCode(year = new Date().getFullYear()): Promise<string> {
  const key = `BOOKING-${year}`;
  const n = await nextSequence(key);
  return `BOOKING-${year}-${String(n).padStart(4, "0")}`;
}

/** Indian FY style: INVOICE-2026-27-0001 */
export async function nextInvoiceNumber(now = new Date()): Promise<string> {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based; FY starts April
  const fyStart = month >= 3 ? year : year - 1;
  const fyEnd = String(fyStart + 1).slice(-2);
  const key = `INVOICE-${fyStart}-${fyEnd}`;
  const n = await nextSequence(key);
  return `INVOICE-${fyStart}-${fyEnd}-${String(n).padStart(4, "0")}`;
}
