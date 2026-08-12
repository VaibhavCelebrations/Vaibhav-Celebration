export declare function getCart(userId: string): Promise<{
    items: {
        id: string;
        productId: string;
        title: string;
        slug: string;
        unitPriceInPaise: number;
        quantity: number;
        personalizationValues: unknown;
        image: {
            url: string;
            altText: string | null;
        } | null;
        isActive: boolean;
        stockAvailable: number;
        stockStatus: string;
        maxOrderQuantity: number | null;
    }[];
    quote: import("./cart-pricing.service").CartQuote;
    itemCount: number;
}>;
export declare function addCartItem(userId: string, input: {
    productId: string;
    quantity: number;
    personalizationValues?: unknown;
}): Promise<{
    items: {
        id: string;
        productId: string;
        title: string;
        slug: string;
        unitPriceInPaise: number;
        quantity: number;
        personalizationValues: unknown;
        image: {
            url: string;
            altText: string | null;
        } | null;
        isActive: boolean;
        stockAvailable: number;
        stockStatus: string;
        maxOrderQuantity: number | null;
    }[];
    quote: import("./cart-pricing.service").CartQuote;
    itemCount: number;
}>;
export declare function updateCartItemQuantity(userId: string, productId: string, quantity: number): Promise<{
    items: {
        id: string;
        productId: string;
        title: string;
        slug: string;
        unitPriceInPaise: number;
        quantity: number;
        personalizationValues: unknown;
        image: {
            url: string;
            altText: string | null;
        } | null;
        isActive: boolean;
        stockAvailable: number;
        stockStatus: string;
        maxOrderQuantity: number | null;
    }[];
    quote: import("./cart-pricing.service").CartQuote;
    itemCount: number;
}>;
export declare function removeCartItem(userId: string, productId: string): Promise<{
    items: {
        id: string;
        productId: string;
        title: string;
        slug: string;
        unitPriceInPaise: number;
        quantity: number;
        personalizationValues: unknown;
        image: {
            url: string;
            altText: string | null;
        } | null;
        isActive: boolean;
        stockAvailable: number;
        stockStatus: string;
        maxOrderQuantity: number | null;
    }[];
    quote: import("./cart-pricing.service").CartQuote;
    itemCount: number;
}>;
export declare function clearCart(userId: string): Promise<{
    items: {
        id: string;
        productId: string;
        title: string;
        slug: string;
        unitPriceInPaise: number;
        quantity: number;
        personalizationValues: unknown;
        image: {
            url: string;
            altText: string | null;
        } | null;
        isActive: boolean;
        stockAvailable: number;
        stockStatus: string;
        maxOrderQuantity: number | null;
    }[];
    quote: import("./cart-pricing.service").CartQuote;
    itemCount: number;
}>;
