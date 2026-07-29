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
export declare function getRazorpayPublicKey(): string | null;
export {};
