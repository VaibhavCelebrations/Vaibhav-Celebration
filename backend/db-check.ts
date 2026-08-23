import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.count();
  const leads = await prisma.lead.count();
  const events = await prisma.event.count();
  
  console.log(`Orders: ${orders}`);
  console.log(`Leads: ${leads}`);
  console.log(`Events: ${events}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
