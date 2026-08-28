const fs = require('fs');
let schema = fs.readFileSync('backend/prisma/schema.prisma', 'utf8');

// Also remove `url = env("DATABASE_URL")`
schema = schema.replace('url        = env("DATABASE_URL")', '');

const missingModels = fs.readFileSync('backend/scratch/missing_models.prisma', 'utf8');
schema += '\n\n' + missingModels;

// Add supplierId, purchasePriceInPaise and relations to Product
if (!schema.includes('supplierId                  String?')) {
  const productAdditions = `
  purchasePriceInPaise        Int?
  supplierId                  String?
  supplier                    Supplier?                     @relation(fields: [supplierId], references: [id])
  purchaseOrderItems          PurchaseOrderItem[]
  inventoryStock              InventoryStock[]
  inventoryTransactions       InventoryTransaction[]
`;
  schema = schema.replace('model Product {', 'model Product {\n' + productAdditions);
}

// Ensure AdminRole enum is updated (inventory_sys added WAREHOUSE_STAFF, SALES_STAFF, etc)
if (!schema.includes('WAREHOUSE_STAFF')) {
  schema = schema.replace('enum AdminRole {', 'enum AdminRole {\n  WAREHOUSE_STAFF\n  SALES_STAFF\n  MANAGER');
}

// Ensure Supplier has city, gstin, notes
schema = schema.replace('email         String?', 'email         String?\n  city          String?\n  gstin         String?\n  notes         String?');

fs.writeFileSync('backend/prisma/schema.prisma', schema);
console.log('Appended missing models and updated Product and Supplier');
