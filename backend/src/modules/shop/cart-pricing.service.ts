import { getGstPercent, gstOn } from "../../lib/settings";

/**
 * Authoritative pricing engine for the shop — mirrors the design already
 * proven for bookings (see modules/pricing/pricing.service.ts): the frontend
 * NEVER computes a final total. Every cart read, checkout quote, and order
 * creation recomputes this from live `Product.priceInPaise` server-side.
 */
export type QuoteLineInput = { productId: string; unitPriceInPaise: number; quantity: number };

export type CartQuote = {
  subtotalInPaise: number;
  gstPercent: number;
  gstInPaise: number;
  totalInPaise: number;
  lines: Array<{ productId: string; unitPriceInPaise: number; quantity: number; lineTotalInPaise: number }>;
};

export async function computeQuote(lines: QuoteLineInput[]): Promise<CartQuote> {
  const shapedLines = lines.map((l) => ({
    productId: l.productId,
    unitPriceInPaise: l.unitPriceInPaise,
    quantity: l.quantity,
    lineTotalInPaise: l.unitPriceInPaise * l.quantity,
  }));
  const subtotalInPaise = shapedLines.reduce((sum, l) => sum + l.lineTotalInPaise, 0);
  const gstPercent = await getGstPercent();
  const gstInPaise = gstOn(subtotalInPaise, gstPercent);
  return {
    subtotalInPaise,
    gstPercent,
    gstInPaise,
    totalInPaise: subtotalInPaise + gstInPaise,
    lines: shapedLines,
  };
}
