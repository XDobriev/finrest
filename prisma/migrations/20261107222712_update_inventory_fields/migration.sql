/*
  Warnings:

  - You are about to drop the column `costPerUnit` on the `InventoryItem` table. All the data in the column will be lost.
  - You are about to drop the column `lastChecked` on the `InventoryItem` table. All the data in the column will be lost.
  - Added the required column `pricePerUnit` to the `InventoryItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "InventoryItem_venueId_idx";

-- AlterTable
ALTER TABLE "InventoryItem" DROP COLUMN "costPerUnit",
DROP COLUMN "lastChecked",
ADD COLUMN     "period" TEXT NOT NULL DEFAULT '2026-11',
ADD COLUMN     "pricePerUnit" DOUBLE PRECISION NOT NULL;

-- CreateIndex
CREATE INDEX "InventoryItem_venueId_period_idx" ON "InventoryItem"("venueId", "period");
