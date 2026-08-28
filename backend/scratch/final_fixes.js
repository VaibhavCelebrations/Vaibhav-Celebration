const fs = require('fs');

// 1. Fix guest.service.ts owneruser -> ownerUser
let guest = fs.readFileSync('backend/src/modules/guest/guest.service.ts', 'utf8');
guest = guest.replace(/owneruser/g, 'ownerUser');
fs.writeFileSync('backend/src/modules/guest/guest.service.ts', guest);

// 2. Fix PurchaseOrder warehouseId and Product barcode in schema.prisma
let schema = fs.readFileSync('backend/prisma/schema.prisma', 'utf8');

if (!schema.includes('barcode                     String?')) {
  schema = schema.replace('sku                         String                        @unique', 'sku                         String                        @unique\n  barcode                     String?                       @unique');
}

if (!schema.includes('warehouseId String?')) { // make it optional just in case, or required? Let's check po.service
  // Let's add warehouseId to PurchaseOrder
  schema = schema.replace('totalAmount Int                 @default(0)', 'totalAmount Int                 @default(0)\n  warehouseId String?');
  schema = schema.replace('supplier Supplier            @relation(fields: [supplierId], references: [id])', 'supplier Supplier            @relation(fields: [supplierId], references: [id])\n  warehouse Warehouse? @relation(fields: [warehouseId], references: [id])');
}

// 3. Fix InventoryLedgerReason enum reliably using regex
if (!schema.includes('PURCHASE')) {
  schema = schema.replace(/(enum InventoryLedgerReason \{[\s\S]*?)\}/, '$1  PURCHASE\n}');
}

fs.writeFileSync('backend/prisma/schema.prisma', schema);
console.log('Fixed final TS errors');
