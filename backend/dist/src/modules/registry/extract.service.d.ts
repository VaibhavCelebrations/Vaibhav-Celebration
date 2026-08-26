import { ExtractionStatus } from "@prisma/client";
export type ExtractedProduct = {
    title: string | null;
    description: string | null;
    image: string | null;
    priceInPaise: number | null;
    currency: string | null;
    storeName: string | null;
    canonicalUrl: string | null;
    sourceUrl: string;
    extractionMethod: string | null;
    extractionStatus: ExtractionStatus;
    extractionError: string | null;
    cached: boolean;
};
export declare function extractExternalProduct(rawUrl: string, options?: {
    force?: boolean;
}): Promise<ExtractedProduct>;
