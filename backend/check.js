const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.product.findMany().then(products => console.log('Products:', products.length)).catch(console.error).finally(()=>prisma.$disconnect());
