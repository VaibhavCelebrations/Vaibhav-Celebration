-- DropForeignKey
ALTER TABLE "InventoryStock" DROP CONSTRAINT "InventoryStock_productId_fkey";

-- DropForeignKey
ALTER TABLE "InventoryStock" DROP CONSTRAINT "InventoryStock_warehouseId_fkey";

-- DropForeignKey
ALTER TABLE "InventoryTransaction" DROP CONSTRAINT "InventoryTransaction_productId_fkey";

-- DropForeignKey
ALTER TABLE "InventoryTransaction" DROP CONSTRAINT "InventoryTransaction_warehouseId_fkey";

-- DropTable
DROP TABLE "InventoryStock";

-- DropTable
DROP TABLE "InventoryTransaction";

