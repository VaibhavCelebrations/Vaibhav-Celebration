/**
 * Authoritative pricing engine for the shop — mirrors the design already
 * proven for bookings (see modules/pricing/pricing.service.ts): the frontend
 * NEVER computes a final total. Every cart read, checkout quote, and order
 * creation recomputes this from live `Product.priceInPaise` server-side.
 */
export type QuoteLineInput = {
    productId: string;
    unitPriceInPaise: number;
    quantity: number;
    personalizationCostInPaise?: number;
};
export type CartQuote = {
    subtotalInPaise: number;
    shippingInPaise: number;
    shippingWaived: boolean;
    freeShippingThresholdInPaise: number;
    amountUntilFreeShippingInPaise: number;
    gstPercent: number;
    gstInPaise: number;
    totalInPaise: number;
    lines: Array<{
        productId: string;
        unitPriceInPaise: number;
        personalizationCostInPaise: number;
        quantity: number;
        lineTotalInPaise: number;
    }>;
};
export declare function computeQuote(lines: QuoteLineInput[]): Promise<CartQuote>;
