const fs = require('fs');
let schema = fs.readFileSync('backend/prisma/schema.prisma', 'utf8');

// 1. Remove old inventory from Product
schema = schema.replace('inventory                   InventoryRecord?', '');

// 2. Remove old models
schema = schema.replace(/model InventoryRecord \{[\s\S]*?^\}/m, '');

// There is the old InventoryLedgerEntry at line 805, and the new one at line 1461.
// Let's remove the FIRST occurrence of InventoryLedgerEntry which is the old one.
const oldLedgerMatch = schema.match(/model InventoryLedgerEntry \{[\s\S]*?^\}/m);
if (oldLedgerMatch && oldLedgerMatch.index < schema.indexOf('enum TransactionType')) {
  schema = schema.replace(/model InventoryLedgerEntry \{[\s\S]*?^\}/m, '');
}

// 3. Update InventoryLedgerReason enum
const newReason = `enum InventoryLedgerReason {
  RESTOCK
  PURCHASE
  SALE
  MANUAL_ADJUSTMENT
  RETURN
  PURCHASE_RETURN
  DAMAGE
  LOSS
  TRANSFER_OUT
  TRANSFER_IN
  INITIAL_STOCK
}`;

schema = schema.replace(/enum InventoryLedgerReason \{[\s\S]*?^\}/m, newReason);

fs.writeFileSync('backend/prisma/schema.prisma', schema);
console.log('Cleanup successful');
