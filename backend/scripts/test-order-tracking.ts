import { prisma } from "../src/db/prisma";
import { adminUpdateOrderStatus, getOrderForUser } from "../src/modules/orders/orders.service";
import { OrderStatus } from "@prisma/client";

async function main() {
  const order = await prisma.order.findUnique({
    where: { orderCode: "VBC-OR-2026-000009" },
  });
  if (!order) throw new Error("Order not found");

  console.log("Current order status:", order.status);

  // If status is PAID, transition to PROCESSING, then to SHIPPED with tracking URL
  if (order.status === OrderStatus.PAID) {
    console.log("Transitioning to PROCESSING...");
    await adminUpdateOrderStatus(order.id, OrderStatus.PROCESSING);
  }

  console.log("Transitioning to SHIPPED with tracking URL...");
  const trackingLink = "https://www.shiprocket.co/tracking/VBC987654321IN";
  await adminUpdateOrderStatus(order.id, OrderStatus.SHIPPED, trackingLink);

  // Now retrieve as the customer via getOrderForUser
  const customerOrder = await getOrderForUser(order.userId, order.orderCode);
  console.log("Customer order result:");
  console.log("Status:", customerOrder.status);
  console.log("PaymentStatus:", customerOrder.paymentStatus);
  console.log("TrackingUrl:", customerOrder.trackingUrl);

  if (customerOrder.trackingUrl !== trackingLink) {
    throw new Error("Tracking URL mismatch!");
  }
  console.log("SUCCESS: Order updated to SHIPPED with trackingUrl properly shaped!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
