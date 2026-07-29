/**
 * Atomically increment a named sequence counter and return the next value.
 * Used for bookingCode / invoiceNumber generation.
 */
export declare function nextSequence(key: string): Promise<number>;
export declare function nextBookingCode(year?: number): Promise<string>;
/** Indian FY style: INVOICE-2026-27-0001 */
export declare function nextInvoiceNumber(now?: Date): Promise<string>;
