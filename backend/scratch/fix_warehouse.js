const fs = require('fs');
let schema = fs.readFileSync('backend/prisma/schema.prisma', 'utf8');

// 3. Fix Warehouse
const warehouseAdditions = `
  InventoryStock InventoryStock[]
  InventoryTransaction InventoryTransaction[]
  InventoryLedgerEntry InventoryLedgerEntry[]
`;
schema = schema.replace('model Warehouse {', 'model Warehouse {\n' + warehouseAdditions);

fs.writeFileSync('backend/prisma/schema.prisma', schema);
console.log('Fixed missing relations for Warehouse');
