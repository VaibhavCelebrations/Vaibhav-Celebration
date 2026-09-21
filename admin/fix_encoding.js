const fs = require('fs');
const path = 'g:/Affor Technologies/Vaibhav-Celebration/admin/src/app/dashboard/crm/orders/OrdersScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace U+FFFD replacement characters
content = content.replace(/\uFFFD\?""/g, '"-"');
content = content.replace(/\uFFFD\?"/g, '-');
content = content.replace(/\uFFFD\? /g, '- ');
content = content.replace(/\uFFFD,/g, 'Rs.');
content = content.replace(/Saving\uFFFD/g, 'Saving...');
content = content.replace(/\uFFFD/g, '-');

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed encoding');
