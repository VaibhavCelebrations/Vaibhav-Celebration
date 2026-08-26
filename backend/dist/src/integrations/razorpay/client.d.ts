type CreateOrderInput = {
    amountInPaise: number;
    receipt: string;
    notes?: Record<string, string>;
};
type CreateOrderResult = {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
    mock: boolean;
};
/**
 * Razorpay adapter. When keys are missing/placeholder (local/dev), returns a deterministic mock order
 * so booking/checkout flows remain testable without live credentials.
 */
export declare function createRazorpayOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
export declare function verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean;
/**
 * Checkout.js handler payload: HMAC-SHA256(order_id|payment_id, KEY_SECRET).
 * Mock orders (dev) skip cryptographic verification.
 */
export declare function verifyCheckoutPaymentSignature(input: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
}): boolean;
export declare function getRazorpayPublicKey(): string | null;
export {};
