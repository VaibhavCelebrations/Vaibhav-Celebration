export type ParsedProductMeta = {
    title: string | null;
    description: string | null;
    image: string | null;
    price: string | null;
    currency: string | null;
    storeName: string | null;
    canonicalUrl: string | null;
    extractionMethod: string | null;
};
export declare function isLikelyLogoOrSprite(url: string): boolean;
/** Amazon/Flipkart overlay and thumbnail URLs → a stable product photo URL. */
export declare function normalizeRetailImageUrl(url: string): string;
export declare function looksLikeRetailBotWall(html: string): boolean;
/** Product title from an SEO slug when the store hides HTML from bots (Meesho, etc.). */
export declare function titleFromProductUrl(url: string): string | null;
export declare function scoreProductImage(url: string, source: string): number;
export declare function parseProductHtml(html: string, sourceUrl: string): ParsedProductMeta;
export declare function parsePriceToPaise(raw: string | null, currency: string | null): number | null;
