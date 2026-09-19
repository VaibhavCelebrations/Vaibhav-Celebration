import { prisma } from './src/db/prisma';
import { getInventoryHistory, getInventoryStats, adjustInventory } from './src/modules/catalog/inventory.service';
async function main() {
  const p = await prisma.product.findFirst();
  console.log('Product:', p?.id);
  if(!p) return;
  console.log('Testing getInventoryHistory...');
  try { await getInventoryHistory(p.id, {}); console.log('getInventoryHistory OK'); } catch(e: any) { console.error('getInventoryHistory error:', e.message); }
  console.log('Testing getInventoryStats...');
  try { await getInventoryStats(); console.log('getInventoryStats OK'); } catch(e: any) { console.error('getInventoryStats error:', e.message); }
  console.log('Testing adjustInventory...');
  try { await adjustInventory({ productId: p.id, delta: 1, reason: 'RESTOCK' }); console.log('adjustInventory OK'); } catch(e: any) { console.error('adjustInventory error:', e.message); }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

