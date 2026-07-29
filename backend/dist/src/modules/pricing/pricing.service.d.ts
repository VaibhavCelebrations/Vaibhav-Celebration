export type QuoteOptionInput = {
    optionId: string;
    quantity: number;
};
export type QuoteResult = {
    packageId: string;
    themeId: string | null;
    packageTitle: string;
    themeTitle: string | null;
    basePriceInPaise: number;
    priceOverrideApplied: boolean;
    options: Array<{
        optionId: string;
        label: string;
        quantity: number;
        unitPriceInPaise: number;
        lineTotalInPaise: number;
    }>;
    customizationTotalInPaise: number;
    subtotalInPaise: number;
    gstPercent: number;
    gstInPaise: number;
    totalInPaise: number;
    includedServices: Array<{
        label: string;
        extraServiceId: string;
    }>;
    availableCustomizations: Array<{
        optionId: string;
        label: string;
        customizationPriceInPaise: number;
    }>;
};
/**
 * Authoritative pricing engine — Document 04 §3.2.
 * Frontend must never compute final totals; only this module does.
 */
export declare function computeQuote(input: {
    packageId: string;
    themeId?: string | null;
    selectedOptions?: QuoteOptionInput[];
}): Promise<QuoteResult>;
