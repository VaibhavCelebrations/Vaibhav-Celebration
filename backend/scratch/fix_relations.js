const fs = require('fs');
let schema = fs.readFileSync('backend/prisma/schema.prisma', 'utf8');

// 1. Fix Product
const productAdditions = `
  supplierId String?
  Supplier Supplier? @relation(fields: [supplierId], references: [id])
  InventoryTransaction InventoryTransaction[]
  InventoryLedgerEntry InventoryLedgerEntry[]
`;
if (!schema.includes('supplierId String?')) {
  schema = schema.replace('model Product {', 'model Product {\n' + productAdditions);
}

// 2. Fix Order
const orderAdditions = `
  InventoryTransaction InventoryTransaction[]
`;
if (!schema.includes('InventoryTransaction InventoryTransaction[]')) {
  schema = schema.replace('model Order {', 'model Order {\n' + orderAdditions);
}

// 3. Fix Warehouse
const warehouseAdditions = `
  InventoryStock InventoryStock[]
  InventoryTransaction InventoryTransaction[]
  InventoryLedgerEntry InventoryLedgerEntry[]
`;
if (!schema.includes('InventoryStock InventoryStock[]')) {
  schema = schema.replace('model Warehouse {', 'model Warehouse {\n' + warehouseAdditions);
}

// 4. Remove the buggy SupplierProduct model from my patch because inventory_schema doesn't have it (it uses Product.supplierId directly)
schema = schema.replace(/model SupplierProduct \{[\s\S]*?^\}/m, '');

// 5. I previously added `SupplierProduct SupplierProduct[]` to Product, let's remove it if it exists.
schema = schema.replace('SupplierProduct SupplierProduct[]', '');

fs.writeFileSync('backend/prisma/schema.prisma', schema);
console.log('Fixed missing relations');
