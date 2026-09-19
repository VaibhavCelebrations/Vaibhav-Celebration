fetch('http://localhost:4000/api/v1/admin/catalog/products/cmta16kah003z84roiv861z98/inventory/adjust', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer 123' },
  body: JSON.stringify({ delta: 1, reason: 'RESTOCK' })
}).then(r => r.json()).then(console.log).catch(console.error);
