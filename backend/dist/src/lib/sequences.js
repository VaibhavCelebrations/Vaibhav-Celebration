"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextSequence = nextSequence;
exports.nextOrderCode = nextOrderCode;
exports.nextRegistryCode = nextRegistryCode;
exports.nextInvoiceNumber = nextInvoiceNumber;
const prisma_1 = require("../db/prisma");
/**
 * Atomically increment a named sequence counter and return the next value.
 * Used for orderCode / invoiceNumber generation.
 */
async function nextSequence(key) {
    const row = await prisma_1.prisma.sequenceCounter.upsert({
        where: { key },
        create: { key, lastValue: 1 },
        update: { lastValue: { increment: 1 } },
    });
    return row.lastValue;
}
async function nextOrderCode(year = new Date().getFullYear()) {
    const key = `ORDER-${year}`;
    const n = await nextSequence(key);
    return `VBC-OR-${year}-${String(n).padStart(6, "0")}`;
}
async function nextRegistryCode(year = new Date().getFullYear()) {
    const key = `REGISTRY-${year}`;
    const n = await nextSequence(key);
    return `VBC-GR-${year}-${String(n).padStart(5, "0")}`;
}
/** Indian FY style: INVOICE-2026-27-0001 */
async function nextInvoiceNumber(now = new Date()) {
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-based; FY starts April
    const fyStart = month >= 3 ? year : year - 1;
    const fyEnd = String(fyStart + 1).slice(-2);
    const key = `INVOICE-${fyStart}-${fyEnd}`;
    const n = await nextSequence(key);
    return `INVOICE-${fyStart}-${fyEnd}-${String(n).padStart(4, "0")}`;
}
//# sourceMappingURL=sequences.js.map