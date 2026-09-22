const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.operationalSetting.deleteMany({
    where: { key: 'CHATBOT_FLOW_JSON' }
  });
  console.log(result);
}

main().finally(() => prisma.$disconnect());
