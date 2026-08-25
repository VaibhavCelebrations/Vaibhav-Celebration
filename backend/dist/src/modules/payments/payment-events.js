"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.claimPaymentEvent = claimPaymentEvent;
const prisma_1 = require("../../db/prisma");
/**
 * Claim a webhook/verify event exactly once. Returns true if this caller
 * should perform side effects; false if another worker already processed it.
 */
async function claimPaymentEvent(input) {
    try {
        await prisma_1.prisma.paymentEvent.create({
            data: {
                eventKey: input.eventKey,
                eventType: input.eventType,
                razorpayOrderId: input.razorpayOrderId ?? null,
                razorpayPaymentId: input.razorpayPaymentId ?? null,
                payload: (input.payload ?? undefined),
            },
        });
        return true;
    }
    catch {
        const existing = await prisma_1.prisma.paymentEvent.findUnique({ where: { eventKey: input.eventKey } });
        return !existing;
    }
}
//# sourceMappingURL=payment-events.js.map