const fs = require('fs');

let po = fs.readFileSync('backend/src/modules/inventory/purchase-orders.service.ts', 'utf8');

// Just remove adminUserId: data.adminUserId (or similar) from create call
po = po.replace(/adminUserId:\s*[^,]+,/g, '');
po = po.replace(/purchaseOrderItemId:\s*[^,]+,/g, '');

fs.writeFileSync('backend/src/modules/inventory/purchase-orders.service.ts', po);
console.log('Removed adminUserId and purchaseOrderItemId from service');
