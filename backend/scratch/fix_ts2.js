const fs = require('fs');

// 1. Fix purchase-orders.service.ts
let po = fs.readFileSync('backend/src/modules/inventory/purchase-orders.service.ts', 'utf8');
po = po.replace(/Product:/g, 'product:');
po = po.replace(/Supplier:/g, 'supplier:');
po = po.replace(/unitPriceInPaise/g, 'unitPrice');
po = po.replace(/receivedQuantity/g, 'receivedQty');
fs.writeFileSync('backend/src/modules/inventory/purchase-orders.service.ts', po);

// 2. Fix reports.service.ts
let reports = fs.readFileSync('backend/src/modules/inventory/reports.service.ts', 'utf8');
reports = reports.replace(/InventoryRecord/g, 'inventory');
fs.writeFileSync('backend/src/modules/inventory/reports.service.ts', reports);

// 3. Fix suppliers.service.ts
let suppliers = fs.readFileSync('backend/src/modules/inventory/suppliers.service.ts', 'utf8');
suppliers = suppliers.replace(/Product:/g, 'product:');
fs.writeFileSync('backend/src/modules/inventory/suppliers.service.ts', suppliers);

// 4. Fix guest.service.ts
let guest = fs.readFileSync('backend/src/modules/guest/guest.service.ts', 'utf8');
guest = guest.replace(/User/g, 'user');
fs.writeFileSync('backend/src/modules/guest/guest.service.ts', guest);

// 5. Add PURCHASE to InventoryLedgerReason enum in schema.prisma
let schema = fs.readFileSync('backend/prisma/schema.prisma', 'utf8');
if (!schema.includes('PURCHASE')) {
  schema = schema.replace('enum InventoryLedgerReason {\n  SALE\n  RETURN\n  ADJUSTMENT\n  DAMAGE\n  RESTOCK', 'enum InventoryLedgerReason {\n  SALE\n  RETURN\n  ADJUSTMENT\n  DAMAGE\n  RESTOCK\n  PURCHASE');
}
fs.writeFileSync('backend/prisma/schema.prisma', schema);

console.log('Fixed more TS files and enum');
