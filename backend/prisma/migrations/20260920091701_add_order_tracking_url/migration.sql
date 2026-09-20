/*
  Warnings:

  - You are about to drop the column `warehouseId` on the `PurchaseOrder` table. All the data in the column will be lost.
  - You are about to drop the `Warehouse` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PurchaseOrder" DROP CONSTRAINT "PurchaseOrder_warehouseId_fkey";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "trackingUrl" TEXT;

-- AlterTable
ALTER TABLE "PurchaseOrder" DROP COLUMN "warehouseId";

-- DropTable
DROP TABLE "Warehouse";
