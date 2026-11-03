-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('DRAFT', 'VALIDATED');

-- AlterTable: InventorySession - add status column with default DRAFT
ALTER TABLE "inventory_sessions" ADD COLUMN "status" "InventoryStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable: SaleItem - add cost_price_at_sale with default 0.000 for existing rows
ALTER TABLE "sale_items" ADD COLUMN "cost_price_at_sale" DECIMAL(10,3) NOT NULL DEFAULT 0.000;
