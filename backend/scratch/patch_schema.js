const fs = require('fs');
let schema = fs.readFileSync('backend/prisma/schema.prisma', 'utf8');

// Add relations to Product
if (!schema.includes('InventoryStock')) {
  schema = schema.replace('model Product {', 'model Product {\n  InventoryStock InventoryStock[]\n  PurchaseOrderItem PurchaseOrderItem[]\n  SupplierProduct SupplierProduct[]');
}

// Add relations to Order
if (!schema.includes('InventoryTransaction')) {
  schema = schema.replace('model Order {', 'model Order {\n  InventoryTransaction InventoryTransaction[]');
}

// Add the inventory models
const inventoryModels = `
// ─── Inventory: Supplier ─────────────────────────────────────────────────────

model Supplier {
  id             String          @id @default(cuid())
  name           String
  contactPerson  String?
  phone          String?
  email          String?
  address        String?
  city           String?
  gstin          String?
  notes          String?
  isActive       Boolean         @default(true)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  deletedAt      DateTime?
  products       Product[]
  purchaseOrders PurchaseOrder[]

  @@index([name(ops: raw("gin_trgm_ops"))], type: Gin)
}

// ─── Inventory: Warehouse ────────────────────────────────────────────────────

model Warehouse {
  id        String    @id @default(cuid())
  name      String
  location  String?
  address   String?
  isDefault Boolean   @default(false)
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@index([isDefault])
}

// ─── Inventory: Purchase Orders ──────────────────────────────────────────────

model PurchaseOrder {
  id           String              @id @default(cuid())
  poNumber     String              @unique
  supplierId   String
  status       PurchaseOrderStatus @default(DRAFT)
  warehouseId  String?
  notes        String?
  expectedAt   DateTime?
  receivedAt   DateTime?
  totalInPaise Int                 @default(0)
  adminUserId  String?
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt
  deletedAt    DateTime?
  Supplier     Supplier            @relation(fields: [supplierId], references: [id])
  items        PurchaseOrderItem[]

  @@index([supplierId])
  @@index([status])
  @@index([createdAt])
}

model PurchaseOrderItem {
  id               String                 @id @default(cuid())
  purchaseOrderId  String
  productId        String
  quantity         Int
  receivedQuantity Int                    @default(0)
  unitPriceInPaise Int
  createdAt        DateTime               @default(now())
  updatedAt        DateTime               @updatedAt
  PurchaseOrder    PurchaseOrder          @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  Product          Product                @relation(fields: [productId], references: [id])
  ledgerEntries    InventoryLedgerEntry[]

  @@index([purchaseOrderId])
  @@index([productId])
}

enum PurchaseOrderStatus {
  DRAFT
  ORDERED
  PARTIALLY_RECEIVED
  RECEIVED
  CANCELLED
}

// ─── Inventory: Core ─────────────────────────────────────────────────────────

model InventoryStock {
  id          String   @id @default(cuid())
  productId   String
  warehouseId String
  quantity    Int      @default(0)
  reorderLevel Int     @default(5)
  updatedAt   DateTime @updatedAt
  Product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  Warehouse   Warehouse @relation(fields: [warehouseId], references: [id])

  @@unique([productId, warehouseId])
}

model SupplierProduct {
  id               String   @id @default(cuid())
  supplierId       String
  productId        String
  supplierSku      String?
  unitPriceInPaise Int      @default(0)
  leadTimeDays     Int      @default(0)
  Supplier         Supplier @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  Product          Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([supplierId, productId])
}

model InventoryTransaction {
  id            String               @id @default(cuid())
  productId     String
  warehouseId   String
  type          TransactionType
  quantity      Int
  reason        TransactionReason
  referenceId   String?
  notes         String?
  adminUserId   String?
  createdAt     DateTime             @default(now())
  orderId       String?
  Order         Order?               @relation(fields: [orderId], references: [id])
  Product       Product              @relation(fields: [productId], references: [id])
  Warehouse     Warehouse            @relation(fields: [warehouseId], references: [id])
}

model InventoryLedgerEntry {
  id                String               @id @default(cuid())
  productId         String
  warehouseId       String
  quantityChange    Int
  reason            InventoryLedgerReason
  referenceType     String?
  referenceId       String?
  purchaseOrderItemId String?
  notes             String?
  adminUserId       String?
  createdAt         DateTime             @default(now())
  PurchaseOrderItem PurchaseOrderItem? @relation(fields: [purchaseOrderItemId], references: [id])
  Product           Product              @relation(fields: [productId], references: [id])
  Warehouse         Warehouse            @relation(fields: [warehouseId], references: [id])

  @@index([productId, warehouseId])
  @@index([createdAt])
}

enum TransactionType {
  IN
  OUT
  ADJUSTMENT
}

enum TransactionReason {
  PURCHASE
  SALE
  RETURN
  DAMAGE
  CORRECTION
  STOCK_TAKE
}
`;

if (!schema.includes('model Supplier {')) {
  schema += '\n' + inventoryModels;
}

// Additionally, there are 2 new roles in AdminRole enum: MANAGER, WAREHOUSE_STAFF, SALES_STAFF
if (!schema.includes('MANAGER')) {
  schema = schema.replace('enum AdminRole {\n  SUPER_ADMIN\n  OPERATIONS\n  CONTENT_EDITOR', 'enum AdminRole {\n  SUPER_ADMIN\n  OPERATIONS\n  CONTENT_EDITOR\n  MANAGER\n  WAREHOUSE_STAFF\n  SALES_STAFF');
}

fs.writeFileSync('backend/prisma/schema.prisma', schema);
console.log('Schema updated successfully');
