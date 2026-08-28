const fs = require('fs');

// Fix reports.service.ts
let reports = fs.readFileSync('backend/src/modules/inventory/reports.service.ts', 'utf8');
reports = reports.replace(/InventoryRecord/g, 'inventory');
// Wait, if it imported `InventoryRecord` type, it would break. But Prisma types are usually camelCase.
// Let's replace only the object keys:
// Actually a global replace of InventoryRecord: to inventory: and InventoryRecord. to inventory. might be safer.
reports = reports.replace(/InventoryRecord:/g, 'inventory:');
reports = reports.replace(/p\.InventoryRecord/g, 'p.inventory');
fs.writeFileSync('backend/src/modules/inventory/reports.service.ts', reports);

// Fix suppliers.service.ts
let suppliers = fs.readFileSync('backend/src/modules/inventory/suppliers.service.ts', 'utf8');
suppliers = suppliers.replace(/Product:/g, 'product:');
fs.writeFileSync('backend/src/modules/inventory/suppliers.service.ts', suppliers);

console.log('Fixed TS files');
