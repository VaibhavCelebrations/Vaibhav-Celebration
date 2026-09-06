const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();
prisma.$queryRawUnsafe('SELECT * FROM "Product"')
  .then(res => {
    console.log(`Found ${res.length} products`);
    fs.writeFileSync('products_dump.json', JSON.stringify(res, null, 2));
    console.log('Saved to products_dump.json');
  })
  .catch(console.error)
  .finally(() => prisma.$disconnect());
