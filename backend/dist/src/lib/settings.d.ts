export declare function getSetting(key: string, fallback: string): Promise<string>;
export declare function getSettingNumber(key: string, fallback: number): Promise<number>;
export declare function getGstPercent(): Promise<number>;
export declare function getMaxBookingsPerDay(): Promise<number>;
export declare function getMinConsultationAdvanceDays(): Promise<number>;
/** Cart/package subtotal (pre-GST) at or above this unlocks free delivery. Default ₹2,999. */
export declare function getFreeShippingThresholdInPaise(): Promise<number>;
/** Flat delivery fee when subtotal is below the free-shipping threshold. Default ₹199. */
export declare function getShippingFeeInPaise(): Promise<number>;
export type ShippingQuoteSlice = {
    shippingInPaise: number;
    shippingWaived: boolean;
    freeShippingThresholdInPaise: number;
    amountUntilFreeShippingInPaise: number;
};
/** Derive shipping fee from product subtotal (excludes GST and shipping itself). */
export declare function computeShippingForSubtotal(subtotalInPaise: number): Promise<ShippingQuoteSlice>;
export declare function invalidateSettingsCache(): void;
export declare function gstOn(amountInPaise: number, gstPercent: number): number;
