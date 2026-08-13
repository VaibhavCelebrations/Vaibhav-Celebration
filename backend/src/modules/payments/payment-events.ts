import { prisma } from "../../db/prisma";

/**
 * Claim a webhook/verify event exactly once. Returns true if this caller
 * should perform side effects; false if another worker already processed it.
 */
export async function claimPaymentEvent(input: {
  eventKey: string;
  eventType: string;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  payload?: unknown;
}): Promise<boolean> {
  try {
    await prisma.paymentEvent.create({
      data: {
        eventKey: input.eventKey,
        eventType: input.eventType,
        razorpayOrderId: input.razorpayOrderId ?? null,
        razorpayPaymentId: input.razorpayPaymentId ?? null,
        payload: (input.payload ?? undefined) as never,
      },
    });
    return true;
  } catch {
    const existing = await prisma.paymentEvent.findUnique({ where: { eventKey: input.eventKey } });
    return !existing;
  }
}
