const fs = require('fs');

let po = fs.readFileSync('backend/src/modules/inventory/purchase-orders.service.ts', 'utf8');
po = po.replace(/notes: data\.notes/g, 'note: data.notes');
po = po.replace(/InventoryLedgerReason\.PURCHASE/g, 'InventoryLedgerReason.RESTOCK');
po = po.replace(/"PURCHASE"/g, '"RESTOCK"');
fs.writeFileSync('backend/src/modules/inventory/purchase-orders.service.ts', po);

let schema = fs.readFileSync('backend/prisma/schema.prisma', 'utf8');
if (!schema.includes('PURCHASE')) {
  schema = schema.replace('enum InventoryLedgerReason {', 'enum InventoryLedgerReason {\n  PURCHASE');
}
fs.writeFileSync('backend/prisma/schema.prisma', schema);

console.log('Fixed final 2 TS errors');
