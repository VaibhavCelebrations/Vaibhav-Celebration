import { prisma } from "../src/db/prisma";

async function main() {
  const o = await prisma.order.findUnique({
    where: { orderCode: "VBC-OR-2026-000009" },
    include: { user: true },
  });
  console.log("ORDER_INSPECT:", JSON.stringify({
    id: o?.id,
    orderCode: o?.orderCode,
    status: o?.status,
    paymentStatus: o?.paymentStatus,
    trackingUrl: o?.trackingUrl,
    user: {
      id: o?.user?.id,
      email: o?.user?.email,
      phone: o?.user?.phone,
      name: o?.user?.name,
    },
  }, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
