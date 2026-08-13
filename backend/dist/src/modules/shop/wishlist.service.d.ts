export declare function listWishlist(userId: string): Promise<{
    id: string;
    productId: string;
    title: string;
    slug: string;
    priceInPaise: number;
    image: {
        url: string;
        altText: string | null;
    } | null;
    isActive: boolean;
    stockStatus: string;
    addedAt: string;
}[]>;
export declare function addToWishlist(userId: string, productId: string): Promise<{
    id: string;
    productId: string;
    title: string;
    slug: string;
    priceInPaise: number;
    image: {
        url: string;
        altText: string | null;
    } | null;
    isActive: boolean;
    stockStatus: string;
    addedAt: string;
}[]>;
export declare function removeFromWishlist(userId: string, productId: string): Promise<{
    id: string;
    productId: string;
    title: string;
    slug: string;
    priceInPaise: number;
    image: {
        url: string;
        altText: string | null;
    } | null;
    isActive: boolean;
    stockStatus: string;
    addedAt: string;
}[]>;
export declare function isProductWishlisted(userId: string, productId: string): Promise<boolean>;
