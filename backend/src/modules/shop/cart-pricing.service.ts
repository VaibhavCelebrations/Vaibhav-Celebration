import { getGstPercent, gstOn, computeShippingForSubtotal } from "../../lib/settings";

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

export async function computeQuote(lines: QuoteLineInput[], extraMerchandiseInPaise = 0): Promise<CartQuote> {
  const shapedLines = lines.map((l) => ({
    productId: l.productId,
    unitPriceInPaise: l.unitPriceInPaise,
    personalizationCostInPaise: l.personalizationCostInPaise ?? 0,
    quantity: l.quantity,
    lineTotalInPaise: (l.unitPriceInPaise + (l.personalizationCostInPaise ?? 0)) * l.quantity,
  }));
  const extra = Number.isFinite(extraMerchandiseInPaise) ? Math.max(0, Math.round(extraMerchandiseInPaise)) : 0;
  const subtotalInPaise = shapedLines.reduce((sum, l) => sum + l.lineTotalInPaise, 0) + extra;
  const shipping = await computeShippingForSubtotal(subtotalInPaise);
  const gstPercent = await getGstPercent();
  const taxable = subtotalInPaise + shipping.shippingInPaise;
  const gstInPaise = gstOn(taxable, gstPercent);
  return {
    subtotalInPaise,
    shippingInPaise: shipping.shippingInPaise,
    shippingWaived: shipping.shippingWaived,
    freeShippingThresholdInPaise: shipping.freeShippingThresholdInPaise,
    amountUntilFreeShippingInPaise: shipping.amountUntilFreeShippingInPaise,
    gstPercent,
    gstInPaise,
    totalInPaise: taxable + gstInPaise,
    lines: shapedLines,
  };
}
