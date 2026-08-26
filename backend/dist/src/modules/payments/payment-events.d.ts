/**
 * Claim a webhook/verify event exactly once. Returns true if this caller
 * should perform side effects; false if another worker already processed it.
 */
export declare function claimPaymentEvent(input: {
    eventKey: string;
    eventType: string;
    razorpayOrderId?: string | null;
    razorpayPaymentId?: string | null;
    payload?: unknown;
}): Promise<boolean>;
